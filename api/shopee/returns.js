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

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Trim whitespace to prevent API errors
    const partnerId = String(req.query.partner_id || req.headers['x-partner-id'] || process.env.SHOPEE_PARTNER_ID || '').trim();
    const partnerKey = String(req.query.partner_key || req.headers['x-partner-key'] || process.env.SHOPEE_PARTNER_KEY || '').trim();
    const shopId = String(req.query.shop_id || req.headers['x-shop-id'] || process.env.SHOPEE_SHOP_ID || '').trim();
    const accessToken = String(req.query.access_token || req.headers['x-access-token'] || '').trim();
    
    if (!partnerId || !partnerKey || !shopId || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: partner_id, partner_key, shop_id, access_token'
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/returns/get_return_list';
    const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
    
    const pageSize = parseInt(req.query.page_size) || 40;
    const pageNo = parseInt(req.query.page_no) || 1;
    
    // Build query params - Shopee Returns API v2
    const queryParams = new URLSearchParams({
      partner_id: partnerId,
      timestamp: timestamp.toString(),
      sign,
      shop_id: shopId,
      access_token: accessToken,
      page_size: pageSize.toString(),
      page_no: pageNo.toString()
    });

    const options = {
      hostname: 'partner.shopeemobile.com',
      path: `${apiPath}?${queryParams.toString()}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    console.log('Returns API request path:', options.path);
    
    const result = await makeRequest(options);
    
    console.log('Returns API result:', JSON.stringify(result));
    
    // Handle different response formats
    let allReturns = [];
    
    if (result.response && result.response.return_list) {
      allReturns = result.response.return_list;
    } else if (result.return_list) {
      allReturns = result.return_list;
    }
    
    // Return full response for debugging
    res.status(200).json({
      success: !result.error && result.error !== 'error_auth',
      data: result,
      returns: allReturns,
      count: allReturns.length,
      debug: {
        apiPath,
        timestamp,
        shopId,
        partnerId
      }
    });

  } catch (error) {
    console.error('Returns API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
