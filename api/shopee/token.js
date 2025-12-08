import crypto from 'crypto';
import https from 'https';

// Generate signature for Shopee API v2 (HMAC-SHA256)
function generateSignatureV2(partnerId, partnerKey, apiPath, timestamp) {
  const baseString = `${partnerId}${apiPath}${timestamp}`;
  return crypto
    .createHmac('sha256', partnerKey)
    .update(baseString)
    .digest('hex');
}

// Make HTTPS request
function makeRequest(options, postData) {
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
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.query;
    const body = req.body || {};
    
    const partnerId = body.partner_id || process.env.SHOPEE_PARTNER_ID || '2014001';
    const partnerKey = body.partner_key || process.env.SHOPEE_PARTNER_KEY || '';
    const shopId = body.shop_id || process.env.SHOPEE_SHOP_ID || '';

    if (action === 'get_token') {
      // Exchange code for access token
      const { code } = body;
      
      if (!code || !partnerKey) {
        return res.status(400).json({
          success: false,
          error: 'Code and Partner Key are required'
        });
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const apiPath = '/api/v2/auth/token/get';
      const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp);
      
      const url = `https://partner.shopeemobile.com${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;
      
      const postData = {
        code,
        partner_id: parseInt(partnerId),
        shop_id: parseInt(shopId)
      };

      const options = {
        hostname: 'partner.shopeemobile.com',
        path: `${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const result = await makeRequest(options, postData);
      
      return res.status(200).json({
        success: !result.error,
        data: result,
        requestUrl: url
      });
    }
    
    if (action === 'refresh_token') {
      // Refresh access token
      const { refresh_token } = body;
      
      if (!refresh_token || !partnerKey) {
        return res.status(400).json({
          success: false,
          error: 'Refresh Token and Partner Key are required'
        });
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const apiPath = '/api/v2/auth/access_token/get';
      const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp);
      
      const postData = {
        refresh_token,
        partner_id: parseInt(partnerId),
        shop_id: parseInt(shopId)
      };

      const options = {
        hostname: 'partner.shopeemobile.com',
        path: `${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const result = await makeRequest(options, postData);
      
      return res.status(200).json({
        success: !result.error,
        data: result
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid action. Use: get_token, refresh_token'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
