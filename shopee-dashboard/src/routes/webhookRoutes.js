const express = require('express');
const router = express.Router();
const webhookService = require('../services/shopee/webhookService');
const logger = require('../utils/logger');

// POST /webhook/shopee - Handle Shopee webhooks
router.post('/shopee', async (req, res) => {
  try {
    const { code, data, shop_id, timestamp } = req.body;
    
    logger.info('Received Shopee webhook:', { code, shop_id, timestamp });
    
    // Verify webhook signature if needed
    // const signature = req.headers['authorization'];
    // if (!webhookService.verifySignature(req.body, signature)) {
    //   return res.status(401).json({ message: 'Invalid signature' });
    // }
    
    // Process webhook based on event type
    await webhookService.handleWebhook(code, data, shop_id);
    
    // Always return 200 to acknowledge receipt
    res.status(200).json({ message: 'Webhook received' });
  } catch (error) {
    logger.error('Webhook error:', error);
    // Still return 200 to prevent retries
    res.status(200).json({ message: 'Webhook processed with errors' });
  }
});

// GET /webhook/shopee - Webhook verification (optional)
router.get('/shopee', (req, res) => {
  const { challenge } = req.query;
  
  if (challenge) {
    return res.send(challenge);
  }
  
  res.json({ status: 'Webhook endpoint active' });
});

module.exports = router;
