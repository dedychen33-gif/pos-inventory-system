import crypto from 'crypto';
import https from 'https';

// Generate signature for Shopee API v2
function generateSignatureV2(partnerId, partnerKey, apiPath, timestamp) {
  const baseString = `${partnerId}${apiPath}${timestamp}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

// Make HTTPS request
function makeRequest(options, postData) {
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

// Netlify Function Handler
export const handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};
    const action = params.action;

    const partnerId = String(body.partner_id || process.env.SHOPEE_PARTNER_ID || '2014001').trim();
    const partnerKey = String(body.partner_key || process.env.SHOPEE_PARTNER_KEY || '').trim();
    const shopId = String(body.shop_id || process.env.SHOPEE_SHOP_ID || '').trim();

    if (action === 'get_token') {
      const { code } = body;

      if (!code || !partnerKey) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Code and Partner Key are required' }) };
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const apiPath = '/api/v2/auth/token/get';
      const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp);

      const postData = { code, partner_id: parseInt(partnerId), shop_id: parseInt(shopId) };
      const options = {
        hostname: 'partner.shopeemobile.com',
        path: `${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };

      const result = await makeRequest(options, postData);
      return { statusCode: 200, headers, body: JSON.stringify({ success: !result.error, data: result }) };
    }

    if (action === 'refresh_token') {
      const { refresh_token } = body;

      if (!refresh_token || !partnerKey) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Refresh Token and Partner Key are required' }) };
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const apiPath = '/api/v2/auth/access_token/get';
      const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp);

      const postData = { refresh_token, partner_id: parseInt(partnerId), shop_id: parseInt(shopId) };
      const options = {
        hostname: 'partner.shopeemobile.com',
        path: `${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };

      const result = await makeRequest(options, postData);
      return { statusCode: 200, headers, body: JSON.stringify({ success: !result.error, data: result }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid action. Use: get_token, refresh_token' }) };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
