const axios = require('axios');
const crypto = require('crypto');
const shopeeConfig = require('../../config/shopee');
const logger = require('../../utils/logger');

class ShopeeAuthService {
  constructor() {
    this.baseUrl = shopeeConfig.baseUrl;
    this.partnerId = shopeeConfig.partnerId;
    this.partnerKey = shopeeConfig.partnerKey;
    this.redirectUrl = shopeeConfig.redirectUrl;
  }
  
  // Generate auth URL for shop authorization
  getAuthUrl() {
    const path = '/api/v2/shop/auth_partner';
    const timestamp = Math.floor(Date.now() / 1000);
    
    const baseString = `${this.partnerId}${path}${timestamp}`;
    const sign = crypto
      .createHmac('sha256', this.partnerKey)
      .update(baseString)
      .digest('hex');
    
    const authUrl = `${this.baseUrl}${path}?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(this.redirectUrl)}`;
    
    return authUrl;
  }
  
  // Exchange code for access token
  async getAccessToken(code, shopId) {
    try {
      const path = '/api/v2/auth/token/get';
      const timestamp = Math.floor(Date.now() / 1000);
      
      const baseString = `${this.partnerId}${path}${timestamp}`;
      const sign = crypto
        .createHmac('sha256', this.partnerKey)
        .update(baseString)
        .digest('hex');
      
      const response = await axios.post(`${this.baseUrl}${path}`, {
        code,
        shop_id: parseInt(shopId),
        partner_id: this.partnerId,
      }, {
        params: {
          partner_id: this.partnerId,
          timestamp,
          sign,
        },
      });
      
      if (response.data.error) {
        throw new Error(response.data.message || 'Failed to get access token');
      }
      
      logger.info('Access token obtained successfully');
      
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expireIn: response.data.expire_in,
      };
    } catch (error) {
      logger.error('Get access token error:', error);
      throw error;
    }
  }
  
  // Refresh access token
  async refreshAccessToken(refreshToken, shopId) {
    try {
      const path = '/api/v2/auth/access_token/get';
      const timestamp = Math.floor(Date.now() / 1000);
      
      const baseString = `${this.partnerId}${path}${timestamp}`;
      const sign = crypto
        .createHmac('sha256', this.partnerKey)
        .update(baseString)
        .digest('hex');
      
      const response = await axios.post(`${this.baseUrl}${path}`, {
        refresh_token: refreshToken,
        shop_id: parseInt(shopId),
        partner_id: this.partnerId,
      }, {
        params: {
          partner_id: this.partnerId,
          timestamp,
          sign,
        },
      });
      
      if (response.data.error) {
        throw new Error(response.data.message || 'Failed to refresh token');
      }
      
      logger.info('Access token refreshed successfully');
      
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expireIn: response.data.expire_in,
      };
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw error;
    }
  }
  
  // Generate signature for API calls
  generateSignature(path, timestamp, accessToken = '', shopId = '') {
    let baseString = `${this.partnerId}${path}${timestamp}`;
    
    if (accessToken && shopId) {
      baseString += `${accessToken}${shopId}`;
    }
    
    return crypto
      .createHmac('sha256', this.partnerKey)
      .update(baseString)
      .digest('hex');
  }
}

module.exports = new ShopeeAuthService();
