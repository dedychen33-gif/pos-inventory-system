import crypto from 'crypto';

// Generate signature for Shopee API v2
function generateSignatureV2(partnerId, partnerKey, apiPath, timestamp) {
  const baseString = `${partnerId}${apiPath}${timestamp}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
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
    const data = event.httpMethod === 'POST' ? body : params;

    const partnerId = String(data.partner_id || process.env.SHOPEE_PARTNER_ID || '2014001').trim();
    const partnerKey = String(data.partner_key || process.env.SHOPEE_PARTNER_KEY || '').trim();
    const redirectUrl = data.redirect_url || data.redirect || 'https://pos-inventory-system-gamma.vercel.app/marketplace/callback';

    if (!/^\d+$/.test(partnerId)) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Partner ID must be a valid number' }) };
    }

    if (!partnerKey) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Partner Key is required' }) };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/shop/auth_partner';
    const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp);

    const authUrl = `https://partner.shopeemobile.com${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, url: authUrl, authUrl, timestamp, sign })
    };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
