import crypto from 'crypto';

// Shopee API v2 signature generation for Shop Authorization
// Format: HMAC-SHA256(partner_key, partner_id + api_path + timestamp)
function generateSignatureV2(partnerId, partnerKey, apiPath, timestamp) {
  const baseString = `${partnerId}${apiPath}${timestamp}`;
  return crypto
    .createHmac('sha256', partnerKey)
    .update(baseString)
    .digest('hex');
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
    // Support both GET (query params) and POST (body)
    const isPost = req.method === 'POST';
    const data = isPost ? req.body : req.query;
    
    const partnerId = data.partner_id || process.env.SHOPEE_PARTNER_ID || '2014001';
    const partnerKey = data.partner_key || process.env.SHOPEE_PARTNER_KEY || '';
    const redirectUrl = data.redirect_url || data.redirect || 'https://pos-inventory-system-gamma.vercel.app/marketplace/callback';
    
    if (!partnerKey) {
      return res.status(400).json({
        success: false,
        error: 'Partner Key is required. Please configure it in store settings.'
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/shop/auth_partner';
    const sign = generateSignatureV2(partnerId, partnerKey, apiPath, timestamp);
    
    const authUrl = `https://partner.shopeemobile.com${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;
    
    res.status(200).json({
      success: true,
      url: authUrl,  // Changed from authUrl to url for consistency
      authUrl,       // Keep for backward compatibility
      timestamp,
      sign
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
