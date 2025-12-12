// Simple webhook endpoint for Shopee verification
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET (for verification test)
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'ok',
      message: 'Shopee webhook endpoint is active',
      timestamp: Date.now()
    });
  }

  // Handle POST (actual webhook)
  if (req.method === 'POST') {
    const { code, data, shop_id, timestamp } = req.body;
    
    console.log('Webhook received:', { code, shop_id, timestamp });
    
    // Always return 200 OK to acknowledge receipt
    return res.status(200).json({ 
      message: 'Webhook received',
      received_at: Date.now()
    });
  }

  // Other methods
  return res.status(405).json({ error: 'Method not allowed' });
}
