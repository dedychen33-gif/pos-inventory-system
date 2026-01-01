import crypto from 'crypto';
import https from 'https';

// Generate signature for Shopee API v2
function generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId) {
  const baseString = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

// Make HTTPS request with body
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Update item price
async function updateItemPrice(partnerId, partnerKey, shopId, accessToken, itemId, price) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/product/update_price';
  const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const queryParams = new URLSearchParams({
    partner_id: partnerId, timestamp: timestamp.toString(), sign, shop_id: shopId, access_token: accessToken
  });

  const body = { item_id: parseInt(itemId), price_list: [{ original_price: parseFloat(price) }] };
  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  return await makeRequest(options, body);
}

// Update model price
async function updateModelPrice(partnerId, partnerKey, shopId, accessToken, itemId, modelId, price) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/product/update_price';
  const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const queryParams = new URLSearchParams({
    partner_id: partnerId, timestamp: timestamp.toString(), sign, shop_id: shopId, access_token: accessToken
  });

  const body = { item_id: parseInt(itemId), price_list: [{ model_id: parseInt(modelId), original_price: parseFloat(price) }] };
  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  return await makeRequest(options, body);
}

// Update item stock
async function updateItemStock(partnerId, partnerKey, shopId, accessToken, itemId, stock) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/product/update_stock';
  const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const queryParams = new URLSearchParams({
    partner_id: partnerId, timestamp: timestamp.toString(), sign, shop_id: shopId, access_token: accessToken
  });

  const body = { item_id: parseInt(itemId), stock_list: [{ seller_stock: [{ stock: parseInt(stock) }] }] };
  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  return await makeRequest(options, body);
}

// Update model stock
async function updateModelStock(partnerId, partnerKey, shopId, accessToken, itemId, modelId, stock) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/product/update_stock';
  const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
  
  const queryParams = new URLSearchParams({
    partner_id: partnerId, timestamp: timestamp.toString(), sign, shop_id: shopId, access_token: accessToken
  });

  const body = { item_id: parseInt(itemId), stock_list: [{ model_id: parseInt(modelId), seller_stock: [{ stock: parseInt(stock) }] }] };
  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  return await makeRequest(options, body);
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

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { partner_id, partner_key, shop_id, access_token, item_id, model_id, price, stock } = body;

    if (!partner_id || !partner_key || !shop_id || !access_token || !item_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing required parameters' })
      };
    }

    const results = { price: null, stock: null };

    // Update Price
    if (price !== undefined && price !== null) {
      try {
        if (model_id) {
          results.price = await updateModelPrice(partner_id, partner_key, shop_id, access_token, item_id, model_id, price);
        } else {
          results.price = await updateItemPrice(partner_id, partner_key, shop_id, access_token, item_id, price);
        }
      } catch (error) {
        results.price = { error: error.message };
      }
    }

    // Update Stock
    if (stock !== undefined && stock !== null) {
      try {
        if (model_id) {
          results.stock = await updateModelStock(partner_id, partner_key, shop_id, access_token, item_id, model_id, stock);
        } else {
          results.stock = await updateItemStock(partner_id, partner_key, shop_id, access_token, item_id, stock);
        }
      } catch (error) {
        results.stock = { error: error.message };
      }
    }

    // Check for errors
    const errors = [];
    if (results.price?.error) errors.push(`Price: ${results.price.error}`);
    if (results.stock?.error) errors.push(`Stock: ${results.stock.error}`);

    if (errors.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, error: errors.join(', '), results })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Product updated successfully', results })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
