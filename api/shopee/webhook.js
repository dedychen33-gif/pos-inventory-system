import crypto from 'crypto';

// Vercel serverless config
export const config = {
  maxDuration: 30
};

// Initialize Supabase lazily inside handler
function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || ''
  );
}

function verifyWebhookSignature(payload, signature, partnerKey) {
  const computed = crypto
    .createHmac('sha256', partnerKey)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return computed === signature;
}

async function logWebhook(code, shopId, payload, signature, isVerified, status, error = null) {
  const webhookNames = {
    0: 'ORDER_STATUS',
    1: 'TRACKING_NO',
    2: 'SHOPEE_UPDATE',
    3: 'BUYER_CANCEL',
    5: 'PROMOTION_UPDATE',
    7: 'RESERVED_STOCK',
    8: 'ITEM_PROMOTION',
    9: 'SHOP_UPDATE',
    11: 'VIDEO_UPLOAD',
    13: 'BRAND_REGISTER',
    16: 'VIOLATION_ITEM'
  };

  const supabase = getSupabase();
  await supabase.from('shopee_webhook_logs').insert({
    webhook_code: code,
    webhook_name: webhookNames[code] || 'UNKNOWN',
    shop_id: shopId,
    payload,
    signature,
    is_verified: isVerified,
    status,
    error_message: error,
    processed_at: status !== 'pending' ? new Date().toISOString() : null
  });
}

async function handleOrderStatusChange(data) {
  const { ordersn, status } = data;
  
  console.log(`[Webhook] Order status changed: ${ordersn} -> ${status}`);
  
  const { data: order } = await supabase
    .from('shopee_orders')
    .select('*')
    .eq('order_sn', ordersn)
    .single();
  
  if (order) {
    await supabase
      .from('shopee_orders')
      .update({ 
        order_status: status,
        update_time: new Date().toISOString()
      })
      .eq('order_sn', ordersn);
    
    if (status === 'COMPLETED' && !order.is_synced_to_stock) {
      const { data: orderItems } = await supabase
        .from('shopee_order_items')
        .select('*')
        .eq('order_sn', ordersn);
      
      for (const item of orderItems || []) {
        if (item.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();
          
          if (product) {
            const newStock = Math.max(0, product.stock - item.quantity);
            
            await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', item.product_id);
            
            await supabase.from('stock_movements').insert({
              product_id: item.product_id,
              movement_type: 'out',
              quantity: item.quantity,
              stock_before: product.stock,
              stock_after: newStock,
              reference_type: 'shopee_order',
              reference_id: ordersn,
              notes: `Order ${ordersn} completed`
            });
          }
        }
      }
      
      await supabase
        .from('shopee_orders')
        .update({ 
          is_synced_to_stock: true,
          synced_at: new Date().toISOString()
        })
        .eq('order_sn', ordersn);
    }
  }
}

async function handleReservedStockChange(data) {
  const { item_id, model_id, reserved_stock } = data;
  
  console.log(`[Webhook] Reserved stock changed: item ${item_id}, model ${model_id}, reserved: ${reserved_stock}`);
  
  const query = supabase
    .from('products')
    .select('*')
    .eq('shopee_item_id', item_id);
  
  if (model_id) {
    query.eq('shopee_model_id', model_id);
  }
  
  const { data: product } = await query.single();
  
  if (product) {
    await supabase.from('pending_stock').insert({
      product_id: product.id,
      product_sku: product.sku,
      quantity: reserved_stock,
      source: 'shopee',
      order_status: 'UNPAID'
    });
  }
}

async function handleBuyerCancel(data) {
  const { ordersn } = data;
  
  console.log(`[Webhook] Order cancelled: ${ordersn}`);
  
  await supabase
    .from('shopee_orders')
    .update({ 
      order_status: 'CANCELLED',
      update_time: new Date().toISOString()
    })
    .eq('order_sn', ordersn);
  
  await supabase
    .from('pending_stock')
    .update({ 
      is_active: false,
      released_at: new Date().toISOString()
    })
    .eq('order_id', ordersn);
}

async function handleProductUpdate(data) {
  const { item_id, model_id } = data;
  
  console.log(`[Webhook] Product update: item ${item_id}, model ${model_id}`);
  
  await supabase.from('shopee_sync_queue').insert({
    sync_type: 'product_update',
    direction: 'shopee_to_pos',
    shopee_item_id: item_id,
    shopee_model_id: model_id,
    data: { trigger: 'webhook', event_data: data },
    priority: 7
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'Webhook endpoint active', timestamp: Date.now() });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, data, shop_id, timestamp } = req.body;
    const signature = req.headers['authorization'];
    
    console.log(`[Webhook] Received event code ${code} for shop ${shop_id}`);
    
    const { data: tokenData } = await supabase
      .from('shopee_tokens')
      .select('partner_key')
      .eq('shop_id', shop_id)
      .single();
    
    const isVerified = tokenData 
      ? verifyWebhookSignature(req.body, signature, tokenData.partner_key)
      : false;
    
    if (!isVerified && process.env.NODE_ENV === 'production') {
      await logWebhook(code, shop_id, req.body, signature, false, 'failed', 'Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    await logWebhook(code, shop_id, req.body, signature, isVerified, 'processing');
    
    try {
      switch (code) {
        case 0:
          await handleOrderStatusChange(data);
          break;
        
        case 3:
          await handleBuyerCancel(data);
          break;
        
        case 7:
          await handleReservedStockChange(data);
          break;
        
        case 8:
        case 11:
        case 13:
        case 16:
          await handleProductUpdate(data);
          break;
        
        default:
          console.log(`[Webhook] Unhandled event code: ${code}`);
      }
      
      await supabase
        .from('shopee_webhook_logs')
        .update({ 
          status: 'success',
          processed_at: new Date().toISOString()
        })
        .eq('webhook_code', code)
        .eq('shop_id', shop_id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      return res.status(200).json({ message: 'Webhook processed successfully' });
      
    } catch (error) {
      console.error('[Webhook] Processing error:', error);
      
      await supabase
        .from('shopee_webhook_logs')
        .update({ 
          status: 'failed',
          error_message: error.message,
          processed_at: new Date().toISOString()
        })
        .eq('webhook_code', code)
        .eq('shop_id', shop_id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      return res.status(200).json({ message: 'Webhook received but processing failed' });
    }
    
  } catch (error) {
    console.error('[Webhook] Handler error:', error);
    return res.status(200).json({ message: 'Webhook received' });
  }
}
