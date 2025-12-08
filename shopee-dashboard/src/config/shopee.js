const crypto = require('crypto');

class ShopeeConfig {
  constructor() {
    this.partnerId = process.env.SHOPEE_PARTNER_ID;
    this.partnerKey = process.env.SHOPEE_PARTNER_KEY;
    this.shopId = parseInt(process.env.SHOPEE_SHOP_ID);
    this.accessToken = process.env.SHOPEE_ACCESS_TOKEN;
    this.baseURL = process.env.SHOPEE_API_BASE;
  }

  generateSignature(path, timestamp, accessToken = null) {
    const baseString = `${this.partnerId}${path}${timestamp}${accessToken || ''}${this.shopId}`;
    return crypto
      .createHmac('sha256', this.partnerKey)
      .update(baseString)
      .digest('hex')
      .toLowerCase();
  }

  getAuthParams(path, accessToken = this.accessToken) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(path, timestamp, accessToken);
    
    return {
      partner_id: this.partnerId,
      timestamp,
      access_token: accessToken,
      shop_id: this.shopId,
      sign: signature
    };
  }

  validateResponse(response) {
    if (!response || response.error) {
      throw new Error(response?.error || 'Invalid Shopee response');
    }
    return response;
  }
}

module.exports = new ShopeeConfig();
