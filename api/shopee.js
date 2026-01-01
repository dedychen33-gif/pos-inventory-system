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

// ============ HELPER FUNCTIONS ============

function generateSignature(partnerId, partnerKey, apiPath, timestamp) {
  const baseString = `${partnerId}${apiPath}${timestamp}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

function generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId) {
  const baseString = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

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

async function getTokensFromSupabase(shopId) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('shopee_tokens').select('*').eq('shop_id', shopId).single();
    return error ? null : data;
  } catch (e) { return null; }
}

async function saveTokensToSupabase(shopId, partnerId, partnerKey, accessToken, refreshToken) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('shopee_tokens').upsert({
      shop_id: shopId, partner_id: partnerId, partner_key: partnerKey,
      access_token: accessToken, refresh_token: refreshToken,
      token_expiry: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      last_refresh: new Date().toISOString(), updated_at: new Date().toISOString()
    }, { onConflict: 'shop_id' });
    return !error;
  } catch (e) { return false; }
}

// ============ ACTION HANDLERS ============

// AUTH-URL: Generate Shopee authorization URL
async function handleAuthUrl(req, res) {
  const data = req.method === 'POST' ? req.body : req.query;
  const partnerId = String(data.partner_id || '').trim();
  const partnerKey = String(data.partner_key || '').trim();
  const redirectUrl = data.redirect_url || 'https://pos-inventory-system-gamma.vercel.app/marketplace/callback';

  if (!partnerKey) return res.status(400).json({ success: false, error: 'Partner Key required' });

  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/shop/auth_partner';
  const sign = generateSignature(partnerId, partnerKey, apiPath, timestamp);
  const authUrl = `https://partner.shopeemobile.com${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;

  return res.status(200).json({ success: true, url: authUrl, authUrl, timestamp, sign });
}

// TOKEN: Get or refresh token
async function handleToken(req, res) {
  const tokenAction = req.query.tokenAction || req.query.action;
  const body = req.body || {};
  const partnerId = String(body.partner_id || '').trim();
  const partnerKey = String(body.partner_key || '').trim();
  const shopId = String(body.shop_id || '').trim();

  if (tokenAction === 'get_token') {
    const { code } = body;
    if (!code || !partnerKey) return res.status(400).json({ success: false, error: 'Code and Partner Key required' });

    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/auth/token/get';
    const sign = generateSignature(partnerId, partnerKey, apiPath, timestamp);
    const postData = { code, partner_id: parseInt(partnerId), shop_id: parseInt(shopId) };
    const options = { hostname: 'partner.shopeemobile.com', path: `${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`, method: 'POST', headers: { 'Content-Type': 'application/json' } };
    const result = await makeRequest(options, postData);
    return res.status(200).json({ success: !result.error, data: result });
  }

  if (tokenAction === 'refresh_token') {
    const { refresh_token } = body;
    if (!refresh_token || !partnerKey) return res.status(400).json({ success: false, error: 'Refresh Token required' });

    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/auth/access_token/get';
    const sign = generateSignature(partnerId, partnerKey, apiPath, timestamp);
    const postData = { refresh_token, partner_id: parseInt(partnerId), shop_id: parseInt(shopId) };
    const options = { hostname: 'partner.shopeemobile.com', path: `${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`, method: 'POST', headers: { 'Content-Type': 'application/json' } };
    const result = await makeRequest(options, postData);
    return res.status(200).json({ success: !result.error, data: result });
  }

  return res.status(400).json({ success: false, error: 'Invalid token action' });
}

// AUTO-REFRESH: Auto refresh token with Supabase
async function handleAutoRefresh(req, res) {
  let shopId = String(req.query.shop_id || req.body?.shop_id || '').trim();
  let partnerId = String(req.query.partner_id || req.body?.partner_id || '').trim();
  let partnerKey = String(req.query.partner_key || req.body?.partner_key || '').trim();
  let refreshToken = String(req.query.refresh_token || req.body?.refresh_token || '').trim();

  if (shopId && (!partnerId || !partnerKey || !refreshToken)) {
    const saved = await getTokensFromSupabase(shopId);
    if (saved) { partnerId = partnerId || saved.partner_id; partnerKey = partnerKey || saved.partner_key; refreshToken = refreshToken || saved.refresh_token; }
  }

  if (!partnerId || !partnerKey || !shopId || !refreshToken) {
    return res.status(400).json({ success: false, error: 'Missing params' });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/auth/access_token/get';
  const sign = generateSignature(partnerId, partnerKey, apiPath, timestamp);
  const postData = { partner_id: parseInt(partnerId), refresh_token: refreshToken, shop_id: parseInt(shopId) };
  const options = { hostname: 'partner.shopeemobile.com', path: `${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`, method: 'POST', headers: { 'Content-Type': 'application/json' } };
  const result = await makeRequest(options, postData);

  if (result.access_token) {
    const saved = await saveTokensToSupabase(shopId, partnerId, partnerKey, result.access_token, result.refresh_token);
    return res.status(200).json({ success: true, data: { access_token: result.access_token, refresh_token: result.refresh_token }, saved_to_supabase: saved });
  }
  return res.status(200).json({ success: false, error: result.message || 'Failed', data: result });
}

// PRODUCTS: Get products from Shopee
async function handleProducts(req, res) {
  const { partner_id, partner_key, shop_id, access_token } = req.query;
  if (!partner_id || !partner_key || !shop_id || !access_token) {
    return res.status(400).json({ success: false, error: 'Missing params' });
  }

  const allProducts = [];
  let offset = 0, hasMore = true;

  while (hasMore) {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/product/get_item_list';
    const sign = generateSignatureV2(partner_id, partner_key, apiPath, timestamp, access_token, shop_id);
    const queryParams = new URLSearchParams({ partner_id, timestamp, sign, shop_id, access_token, offset, page_size: '100', item_status: 'NORMAL' });
    const options = { hostname: 'partner.shopeemobile.com', path: `${apiPath}?${queryParams}`, method: 'GET', headers: { 'Content-Type': 'application/json' } };
    const listResult = await makeRequest(options);

    if (listResult.error || !listResult.response?.item?.length) { hasMore = false; break; }

    const itemIds = listResult.response.item.map(i => i.item_id);
    // Get details
    const detailTs = Math.floor(Date.now() / 1000);
    const detailPath = '/api/v2/product/get_item_base_info';
    const detailSign = generateSignatureV2(partner_id, partner_key, detailPath, detailTs, access_token, shop_id);
    const detailParams = new URLSearchParams({ partner_id, timestamp: detailTs, sign: detailSign, shop_id, access_token, item_id_list: itemIds.join(',') });
    const detailOpts = { hostname: 'partner.shopeemobile.com', path: `${detailPath}?${detailParams}`, method: 'GET', headers: { 'Content-Type': 'application/json' } };
    const detailResult = await makeRequest(detailOpts);

    if (detailResult.response?.item_list) {
      for (const item of detailResult.response.item_list) {
        const modelTs = Math.floor(Date.now() / 1000);
        const modelPath = '/api/v2/product/get_model_list';
        const modelSign = generateSignatureV2(partner_id, partner_key, modelPath, modelTs, access_token, shop_id);
        const modelParams = new URLSearchParams({ partner_id, timestamp: modelTs, sign: modelSign, shop_id, access_token, item_id: item.item_id });
        const modelOpts = { hostname: 'partner.shopeemobile.com', path: `${modelPath}?${modelParams}`, method: 'GET', headers: { 'Content-Type': 'application/json' } };
        const modelResult = await makeRequest(modelOpts);
        item.models = modelResult.response?.model || [];
      }
      allProducts.push(...detailResult.response.item_list);
    }
    hasMore = listResult.response?.has_next_page || false;
    offset += 100;
  }

  return res.status(200).json({ success: true, products: allProducts });
}

// UPDATE-PRODUCT: Update price/stock to Shopee
async function handleUpdateProduct(req, res) {
  const { partner_id, partner_key, shop_id, access_token, item_id, model_id, price, stock } = req.body;
  if (!partner_id || !partner_key || !shop_id || !access_token || !item_id) {
    return res.status(400).json({ success: false, error: 'Missing params' });
  }

  const results = { price: null, stock: null };

  if (price !== undefined) {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/product/update_price';
    const sign = generateSignatureV2(partner_id, partner_key, apiPath, timestamp, access_token, shop_id);
    const queryParams = new URLSearchParams({ partner_id, timestamp, sign, shop_id, access_token });
    const body = model_id 
      ? { item_id: parseInt(item_id), price_list: [{ model_id: parseInt(model_id), original_price: parseFloat(price) }] }
      : { item_id: parseInt(item_id), price_list: [{ original_price: parseFloat(price) }] };
    const options = { hostname: 'partner.shopeemobile.com', path: `${apiPath}?${queryParams}`, method: 'POST', headers: { 'Content-Type': 'application/json' } };
    results.price = await makeRequest(options, body);
  }

  if (stock !== undefined) {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/product/update_stock';
    const sign = generateSignatureV2(partner_id, partner_key, apiPath, timestamp, access_token, shop_id);
    const queryParams = new URLSearchParams({ partner_id, timestamp, sign, shop_id, access_token });
    const body = model_id
      ? { item_id: parseInt(item_id), stock_list: [{ model_id: parseInt(model_id), seller_stock: [{ stock: parseInt(stock) }] }] }
      : { item_id: parseInt(item_id), stock_list: [{ seller_stock: [{ stock: parseInt(stock) }] }] };
    const options = { hostname: 'partner.shopeemobile.com', path: `${apiPath}?${queryParams}`, method: 'POST', headers: { 'Content-Type': 'application/json' } };
    results.stock = await makeRequest(options, body);
  }

  const hasError = results.price?.error || results.stock?.error;
  return res.status(200).json({ success: !hasError, results });
}

// ORDERS: Get orders from Shopee
async function handleOrders(req, res) {
  const { partner_id, partner_key, shop_id, access_token, fetch_all } = req.query;
  if (!partner_id || !partner_key || !shop_id || !access_token) {
    return res.status(400).json({ success: false, error: 'Missing params' });
  }

  const now = Math.floor(Date.now() / 1000);
  const timeFrom = parseInt(req.query.time_from) || now - (7 * 24 * 60 * 60);
  const timeTo = parseInt(req.query.time_to) || now;
  const statuses = ['READY_TO_SHIP', 'SHIPPED', 'COMPLETED'];
  const allOrders = [];

  for (const status of statuses) {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/order/get_order_list';
    const sign = generateSignatureV2(partner_id, partner_key, apiPath, timestamp, access_token, shop_id);
    const queryParams = new URLSearchParams({ partner_id, timestamp, sign, shop_id, access_token, time_range_field: 'create_time', time_from: timeFrom, time_to: timeTo, page_size: '50', order_status: status });
    const options = { hostname: 'partner.shopeemobile.com', path: `${apiPath}?${queryParams}`, method: 'GET', headers: { 'Content-Type': 'application/json' } };
    const listResult = await makeRequest(options);

    if (listResult.response?.order_list?.length) {
      const orderSns = listResult.response.order_list.map(o => o.order_sn);
      const detailTs = Math.floor(Date.now() / 1000);
      const detailPath = '/api/v2/order/get_order_detail';
      const detailSign = generateSignatureV2(partner_id, partner_key, detailPath, detailTs, access_token, shop_id);
      const detailParams = new URLSearchParams({ partner_id, timestamp: detailTs, sign: detailSign, shop_id, access_token, order_sn_list: orderSns.join(','), response_optional_fields: 'buyer_user_id,buyer_username,item_list,total_amount' });
      const detailOpts = { hostname: 'partner.shopeemobile.com', path: `${detailPath}?${detailParams}`, method: 'GET', headers: { 'Content-Type': 'application/json' } };
      const detailResult = await makeRequest(detailOpts);
      if (detailResult.response?.order_list) {
        allOrders.push(...detailResult.response.order_list.map(o => ({ ...o, order_status: o.order_status || status })));
      }
    }
  }

  return res.status(200).json({ success: true, data: { response: { order_list: allOrders, total_count: allOrders.length } } });
}

// RETURNS: Get returns from Shopee
async function handleReturns(req, res) {
  const { partner_id, partner_key, shop_id, access_token } = req.query;
  if (!partner_id || !partner_key || !shop_id || !access_token) {
    return res.status(400).json({ success: false, error: 'Missing params' });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/returns/get_return_list';
  const sign = generateSignatureV2(partner_id, partner_key, apiPath, timestamp, access_token, shop_id);
  const queryParams = new URLSearchParams({ partner_id, timestamp, sign, shop_id, access_token, page_no: '0', page_size: '50' });
  const options = { hostname: 'partner.shopeemobile.com', path: `${apiPath}?${queryParams}`, method: 'GET', headers: { 'Content-Type': 'application/json' } };
  const result = await makeRequest(options);

  return res.status(200).json({ success: true, data: result });
}

// ============ MAIN HANDLER ============

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action } = req.query;

    switch (action) {
      case 'auth-url': return await handleAuthUrl(req, res);
      case 'token': return await handleToken(req, res);
      case 'auto-refresh': return await handleAutoRefresh(req, res);
      case 'products': return await handleProducts(req, res);
      case 'update-product': return await handleUpdateProduct(req, res);
      case 'orders': return await handleOrders(req, res);
      case 'returns': return await handleReturns(req, res);
      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid action',
          available: ['auth-url', 'token', 'auto-refresh', 'products', 'update-product', 'orders']
        });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
