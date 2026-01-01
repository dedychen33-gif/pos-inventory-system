import crypto from 'crypto';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Generate signature
function generateSignature(partnerId, partnerKey, apiPath, timestamp) {
  const baseString = `${partnerId}${apiPath}${timestamp}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

// Make HTTPS request
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

// Get tokens from Supabase
async function getTokensFromSupabase(shopId) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('shopee_tokens').select('*').eq('shop_id', shopId).single();
    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
}

// Save tokens to Supabase
async function saveTokensToSupabase(shopId, partnerId, partnerKey, accessToken, refreshToken) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('shopee_tokens').upsert({
      shop_id: shopId,
      partner_id: partnerId,
      partner_key: partnerKey,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expiry: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      last_refresh: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'shop_id' });
    return !error;
  } catch (e) {
    return false;
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

  try {
    const params = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    let shopId = String(params.shop_id || body.shop_id || '').trim();
    let partnerId = String(params.partner_id || body.partner_id || '').trim();
    let partnerKey = String(params.partner_key || body.partner_key || '').trim();
    let refreshToken = String(params.refresh_token || body.refresh_token || '').trim();

    // If missing params, try Supabase
    if (shopId && (!partnerId || !partnerKey || !refreshToken)) {
      const savedTokens = await getTokensFromSupabase(shopId);
      if (savedTokens) {
        partnerId = partnerId || savedTokens.partner_id;
        partnerKey = partnerKey || savedTokens.partner_key;
        refreshToken = refreshToken || savedTokens.refresh_token;
      }
    }

    if (!partnerId || !partnerKey || !shopId || !refreshToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing required parameters' })
      };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/auth/access_token/get';
    const sign = generateSignature(partnerId, partnerKey, apiPath, timestamp);

    const postData = { partner_id: parseInt(partnerId), refresh_token: refreshToken, shop_id: parseInt(shopId) };
    const options = {
      hostname: 'partner.shopeemobile.com',
      path: `${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    const result = await makeRequest(options, postData);

    if (result.access_token) {
      const saved = await saveTokensToSupabase(shopId, partnerId, partnerKey, result.access_token, result.refresh_token);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: { access_token: result.access_token, refresh_token: result.refresh_token },
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          expire_in: result.expire_in,
          saved_to_supabase: saved,
          message: 'Token refreshed successfully'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: false, error: result.message || 'Failed to refresh token', data: result })
    };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
