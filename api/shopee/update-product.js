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
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Update item price (for items without models)
async function updateItemPrice(partnerId, partnerKey, shopId, accessToken, itemId, price) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/product/update_price';
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
    price_list: [{
      original_price: parseFloat(price)
    }]
  };

  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return await makeRequest(options, body);
}

// Update model price (for items with variants)
async function updateModelPrice(partnerId, partnerKey, shopId, accessToken, itemId, modelId, price) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/product/update_price';
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
    price_list: [{
      model_id: parseInt(modelId),
      original_price: parseFloat(price)
    }]
  };

  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return await makeRequest(options, body);
}

// Update item stock (for items without models)
async function updateItemStock(partnerId, partnerKey, shopId, accessToken, itemId, stock) {
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
    stock_list: [{
      seller_stock: [{
        stock: parseInt(stock)
      }]
    }]
  };

  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return await makeRequest(options, body);
}

// Update model stock (for items with variants)
async function updateModelStock(partnerId, partnerKey, shopId, accessToken, itemId, modelId, stock) {
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
    stock_list: [{
      model_id: parseInt(modelId),
      seller_stock: [{
        stock: parseInt(stock)
      }]
    }]
  };

  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return await makeRequest(options, body);
}

// Update item SKU
async function updateItemSku(partnerId, partnerKey, shopId, accessToken, itemId, modelId, sku) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/product/update_sku';
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
    sku_list: modelId ? [{
      model_id: parseInt(modelId),
      model_sku: sku
    }] : [{
      item_sku: sku
    }]
  };

  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return await makeRequest(options, body);
}

// Update item name
async function updateItemName(partnerId, partnerKey, shopId, accessToken, itemId, name) {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/product/update_item';
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
    item_name: name
  };

  const options = {
    hostname: 'partner.shopeemobile.com',
    path: `${apiPath}?${queryParams.toString()}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return await makeRequest(options, body);
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { 
      partner_id, partner_key, shop_id, access_token,
      item_id, model_id, 
      name, price, stock, sku,
      action // 'update_price', 'update_stock', 'update_sku', 'update_name', 'update_all'
    } = req.body;
    
    console.log('📦 Shopee Update Request:', {
      partner_id,
      shop_id,
      item_id,
      model_id,
      action,
      updates: { name, price, stock, sku }
    });
    
    if (!partner_id || !partner_key || !shop_id || !access_token || !item_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: partner_id, partner_key, shop_id, access_token, item_id'
      });
    }

    const results = {
      name: null,
      price: null,
      stock: null,
      sku: null
    };

    // Update Name
    if (action === 'update_name' || action === 'update_all') {
      if (name !== undefined && name !== null && name !== '') {
        results.name = await updateItemName(partner_id, partner_key, shop_id, access_token, item_id, name);
      }
    }

    // Update Price
    if (action === 'update_price' || action === 'update_all') {
      if (price !== undefined && price !== null) {
        if (model_id) {
          results.price = await updateModelPrice(partner_id, partner_key, shop_id, access_token, item_id, model_id, price);
        } else {
          results.price = await updateItemPrice(partner_id, partner_key, shop_id, access_token, item_id, price);
        }
      }
    }

    // Update Stock
    if (action === 'update_stock' || action === 'update_all') {
      if (stock !== undefined && stock !== null) {
        if (model_id) {
          results.stock = await updateModelStock(partner_id, partner_key, shop_id, access_token, item_id, model_id, stock);
        } else {
          results.stock = await updateItemStock(partner_id, partner_key, shop_id, access_token, item_id, stock);
        }
      }
    }

    // Update SKU
    if (action === 'update_sku' || action === 'update_all') {
      if (sku !== undefined && sku !== null && sku !== '') {
        results.sku = await updateItemSku(partner_id, partner_key, shop_id, access_token, item_id, model_id, sku);
      }
    }

    // Check for errors and log detailed responses
    const errors = [];
    if (results.name?.error) {
      console.error('Name update error:', results.name);
      errors.push(`Name: ${results.name.message || results.name.error}`);
    }
    if (results.price?.error) {
      console.error('Price update error:', results.price);
      errors.push(`Price: ${results.price.message || results.price.error}`);
    }
    if (results.stock?.error) {
      console.error('Stock update error:', results.stock);
      errors.push(`Stock: ${results.stock.message || results.stock.error}`);
    }
    if (results.sku?.error) {
      console.error('SKU update error:', results.sku);
      errors.push(`SKU: ${results.sku.message || results.sku.error}`);
    }

    if (errors.length > 0) {
      console.error('Update failed with errors:', { errors, results });
      return res.status(400).json({
        success: false,
        error: errors.join(', '),
        results,
        details: {
          name: results.name,
          price: results.price,
          stock: results.stock,
          sku: results.sku
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      results,
      timestamp: Math.floor(Date.now() / 1000)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
