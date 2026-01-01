import crypto from 'crypto';
import https from 'https';

// Generate signature for Shopee API v2
function generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId) {
  const baseString = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
  return crypto
    .createHmac('sha256', partnerKey)
    .update(baseString)
    .digest('hex');
}

// Make HTTPS request
function makeRequest(options) {
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
    req.end();
  });
}

// Get item details by IDs
async function getItemDetails(partnerId, partnerKey, shopId, accessToken, itemIds) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/product/get_item_base_info';
  const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const queryParams = new URLSearchParams({
    partner_id: partnerId,
    timestamp: timestamp.toString(),
    sign,
    shop_id: shopId,
    access_token: accessToken,
    item_id_list: itemIds.join(','),
    need_tax_info: 'false',
    need_complaint_policy: 'false'
  });

  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };

  return await makeRequest(options);
}

// Get model list (for price and stock info)
async function getModelList(partnerId, partnerKey, shopId, accessToken, itemId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/product/get_model_list';
  const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const queryParams = new URLSearchParams({
    partner_id: partnerId,
    timestamp: timestamp.toString(),
    sign,
    shop_id: shopId,
    access_token: accessToken,
    item_id: itemId.toString()
  });

  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };

  return await makeRequest(options);
}

// Fetch item list with pagination
async function getItemList(partnerId, partnerKey, shopId, accessToken, offset = 0, pageSize = 100, itemStatus = 'NORMAL') {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/product/get_item_list';
  const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const queryParams = new URLSearchParams({
    partner_id: partnerId,
    timestamp: timestamp.toString(),
    sign,
    shop_id: shopId,
    access_token: accessToken,
    offset: offset.toString(),
    page_size: pageSize.toString(),
    item_status: itemStatus
  });

  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };

  return await makeRequest(options);
}

// Fetch ALL products with pagination
async function fetchAllProducts(partnerId, partnerKey, shopId, accessToken) {
  const allProducts = [];
  let offset = 0;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const listResult = await getItemList(partnerId, partnerKey, shopId, accessToken, offset, pageSize);
    
    if (listResult.error) {
      return { error: listResult.error, message: listResult.message };
    }

    const items = listResult.response?.item || [];
    if (items.length === 0) {
      hasMore = false;
      break;
    }

    const itemIds = items.map(item => item.item_id);
    const detailsResult = await getItemDetails(partnerId, partnerKey, shopId, accessToken, itemIds);
    
    if (detailsResult.response?.item_list) {
      for (const item of detailsResult.response.item_list) {
        const modelResult = await getModelList(partnerId, partnerKey, shopId, accessToken, item.item_id);
        item.models = modelResult.response?.model || [];
      }
      allProducts.push(...detailsResult.response.item_list);
    }

    hasMore = listResult.response?.has_next_page || false;
    offset += pageSize;
  }

  return { success: true, products: allProducts };
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
    const { partner_id, partner_key, shop_id, access_token, action } = params;

    if (!partner_id || !partner_key || !shop_id || !access_token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing required parameters' })
      };
    }

    if (action === 'list') {
      const offset = parseInt(params.offset) || 0;
      const result = await getItemList(partner_id, partner_key, shop_id, access_token, offset);
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    // Default: fetch all products
    const result = await fetchAllProducts(partner_id, partner_key, shop_id, access_token);
    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
