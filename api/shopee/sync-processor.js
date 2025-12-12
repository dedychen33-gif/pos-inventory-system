import crypto from 'crypto';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

function generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId) {
  const baseString = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
  return crypto
    .createHmac('sha256', partnerKey)
    .update(baseString)
    .digest('hex');
}

function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function updateShopeeStock(partnerId, partnerKey, shopId, accessToken, itemId, modelId, stock) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/product/update_stock';
  const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const queryParams = new URLSearchParams({
    partner_id: partnerId,
    timestamp: timestamp.toString(),
    sign,
    shop_id: shopId,
    access_token: accessToken
  });

  const body = {
    item_id: parseInt(itemId),
    stock_list: modelId ? [{
      model_id: parseInt(modelId),
      seller_stock: [{ stock: parseInt(stock) }]
    }] : [{
      seller_stock: [{ stock: parseInt(stock) }]
    }]
  };

  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  return await makeRequest(options, body);
}

async function processStockSync(queueItem, credentials) {
  const { product_id, shopee_item_id, shopee_model_id, data } = queueItem;
  const { stock } = data;
  
  const { data: product } = await supabase
    .from('products')
    .select('stock, sku, name')
    .eq('id', product_id)
    .single();
  
  if (!product) {
    throw new Error(`Product ${product_id} not found`);
  }
  
  const stockBefore = product.stock;
  
  const result = await updateShopeeStock(
    credentials.partner_id,
    credentials.partner_key,
    credentials.shop_id,
    credentials.access_token,
    shopee_item_id,
    shopee_model_id,
    stock
  );
  
  if (result.error) {
    throw new Error(result.message || 'Shopee API error');
  }
  
  await supabase.from('shopee_stock_sync_history').insert({
    product_id,
    shopee_item_id,
    shopee_model_id,
    stock_before: stockBefore,
    stock_after: stock,
    sync_direction: 'pos_to_shopee',
    sync_trigger: data.trigger || 'auto',
    success: true
  });
  
  return result;
}

async function processSyncQueue() {
  const { data: credentials } = await supabase
    .from('shopee_tokens')
    .select('*')
    .single();
  
  if (!credentials || !credentials.access_token) {
    console.log('[Sync] No valid Shopee credentials found');
    return { processed: 0, failed: 0 };
  }
  
  const { data: queueItems } = await supabase
    .from('shopee_sync_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10);
  
  if (!queueItems || queueItems.length === 0) {
    return { processed: 0, failed: 0 };
  }
  
  let processed = 0;
  let failed = 0;
  
  for (const item of queueItems) {
    try {
      await supabase
        .from('shopee_sync_queue')
        .update({ status: 'processing' })
        .eq('id', item.id);
      
      if (item.sync_type === 'stock_update') {
        await processStockSync(item, credentials);
      }
      
      await supabase
        .from('shopee_sync_queue')
        .update({ 
          status: 'success',
          processed_at: new Date().toISOString()
        })
        .eq('id', item.id);
      
      processed++;
      
    } catch (error) {
      console.error(`[Sync] Failed to process queue item ${item.id}:`, error);
      
      const newRetryCount = item.retry_count + 1;
      const shouldRetry = newRetryCount < item.max_retries;
      
      await supabase
        .from('shopee_sync_queue')
        .update({ 
          status: shouldRetry ? 'retry' : 'failed',
          retry_count: newRetryCount,
          error_message: error.message,
          processed_at: new Date().toISOString(),
          scheduled_at: shouldRetry 
            ? new Date(Date.now() + (newRetryCount * 60000)).toISOString()
            : null
        })
        .eq('id', item.id);
      
      failed++;
    }
  }
  
  return { processed, failed, total: queueItems.length };
}

export const config = {
  maxDuration: 60
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const result = await processSyncQueue();
    
    return res.status(200).json({
      success: true,
      message: 'Sync queue processed',
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Sync] Handler error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
