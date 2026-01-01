import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

function verifyWebhookSignature(payload, signature, partnerKey) {
  const computed = crypto.createHmac('sha256', partnerKey).update(JSON.stringify(payload)).digest('hex');
  return computed === signature;
}

const webhookNames = {
  0: 'ORDER_STATUS', 1: 'TRACKING_NO', 2: 'SHOPEE_UPDATE', 3: 'BUYER_CANCEL',
  5: 'PROMOTION_UPDATE', 7: 'RESERVED_STOCK', 8: 'ITEM_PROMOTION', 9: 'SHOP_UPDATE'
};

async function logWebhook(supabase, code, shopId, payload, signature, isVerified, status, error = null) {
  if (!supabase) return;
  try {
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
  } catch (e) {
    console.error('Log webhook error:', e);
  }
}

// Netlify Function Handler
export const handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    return { statusCode: 200, headers, body: JSON.stringify({ status: 'Webhook endpoint active', timestamp: Date.now() }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabase = getSupabase();

  try {
    const body = JSON.parse(event.body || '{}');
    const { code, data, shop_id, timestamp } = body;
    const signature = event.headers['authorization'];

    console.log(`[Webhook] Received event code ${code} for shop ${shop_id}`);

    let isVerified = false;
    if (supabase) {
      const { data: tokenData } = await supabase.from('shopee_tokens').select('partner_key').eq('shop_id', shop_id).single();
      isVerified = tokenData ? verifyWebhookSignature(body, signature, tokenData.partner_key) : false;
    }

    await logWebhook(supabase, code, shop_id, body, signature, isVerified, 'processing');

    // Handle different webhook codes
    if (supabase) {
      try {
        switch (code) {
          case 0: // ORDER_STATUS
            if (data?.ordersn) {
              await supabase.from('shopee_orders').update({ 
                order_status: data.status,
                update_time: new Date().toISOString()
              }).eq('order_sn', data.ordersn);
            }
            break;

          case 3: // BUYER_CANCEL
            if (data?.ordersn) {
              await supabase.from('shopee_orders').update({ 
                order_status: 'CANCELLED',
                update_time: new Date().toISOString()
              }).eq('order_sn', data.ordersn);
            }
            break;

          case 7: // RESERVED_STOCK
            console.log(`[Webhook] Reserved stock: item ${data?.item_id}`);
            break;

          default:
            console.log(`[Webhook] Unhandled code: ${code}`);
        }

        await supabase.from('shopee_webhook_logs').update({ 
          status: 'success',
          processed_at: new Date().toISOString()
        }).eq('webhook_code', code).eq('shop_id', shop_id).order('created_at', { ascending: false }).limit(1);

      } catch (error) {
        console.error('[Webhook] Processing error:', error);
        await logWebhook(supabase, code, shop_id, body, signature, isVerified, 'failed', error.message);
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Webhook processed successfully' }) };

  } catch (error) {
    console.error('[Webhook] Handler error:', error);
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Webhook received' }) };
  }
};
