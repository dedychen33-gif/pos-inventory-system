// Shopee Webhook Endpoint - Simple version for verification
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - for verification test
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'ok',
      service: 'shopee-webhook',
      timestamp: Date.now()
    });
  }

  // POST - webhook event
  if (req.method === 'POST') {
    try {
      const { code, data, shop_id, timestamp } = req.body || {};
      
      console.log('[Webhook] Received:', { code, shop_id, timestamp });
      
      // Always return 200 to acknowledge
      return res.status(200).json({ 
        message: 'received',
        code,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[Webhook] Error:', error);
      return res.status(200).json({ message: 'error', error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
