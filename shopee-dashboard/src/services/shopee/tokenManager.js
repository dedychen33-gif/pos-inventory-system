const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

// Token storage file path
const TOKEN_FILE = path.join(__dirname, '../../../.tokens.json');

class TokenManager {
  constructor() {
    this.partnerId = parseInt(process.env.SHOPEE_PARTNER_ID) || 2014001;
    this.partnerKey = process.env.SHOPEE_PARTNER_KEY || 'shpk79465956556673476c6f4547484e4a6747776c5371467255697a78777a5a';
    this.shopId = parseInt(process.env.SHOPEE_SHOP_ID) || 669903315;
    this.baseUrl = 'https://partner.shopeemobile.com/api/v1';
    
    // Token data (for API v2 OAuth - optional)
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    
    // Auto refresh interval (3 hours = 10800000 ms)
    this.refreshInterval = 3 * 60 * 60 * 1000;
    this.refreshTimer = null;
    
    // Load saved tokens
    this.loadTokens();
    
    // Start auto refresh
    this.startAutoRefresh();
    
    logger.info(`Shopee API initialized - Partner ID: ${this.partnerId}, Shop ID: ${this.shopId}`);
  }

  // Generate HMAC-SHA256 signature for Shopee API v1
  // Format: SHA256(partner_key + api_path + timestamp)
  generateSignature(apiPath, timestamp) {
    const baseString = `${this.partnerKey}${apiPath}${timestamp}`;
    return crypto
      .createHmac('sha256', this.partnerKey)
      .update(baseString)
      .digest('hex');
  }

  // Generate signature for Shopee API v2 (for OAuth)
  // Format: SHA256(partner_id + api_path + timestamp + partner_key)
  generateSignatureV2(apiPath, timestamp) {
    const baseString = `${this.partnerId}${apiPath}${timestamp}${this.partnerKey}`;
    return crypto
      .createHash('sha256')
      .update(baseString)
      .digest('hex');
  }

  // Generate OAuth authorization URL with proper signature
  getAuthUrl(redirectUrl) {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/shop/auth_partner';
    const sign = this.generateSignatureV2(apiPath, timestamp);
    
    const authUrl = `https://partner.shopeemobile.com${apiPath}?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;
    
    logger.info(`Generated auth URL with sign: ${sign}`);
    return authUrl;
  }

  // Load tokens from file
  loadTokens() {
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        this.tokenExpiry = data.tokenExpiry ? new Date(data.tokenExpiry) : null;
        logger.info('Tokens loaded from file');
        
        // Check if token is expired
        if (this.isTokenExpired()) {
          logger.warn('Token is expired, will refresh');
          this.doRefreshToken();
        }
      }
    } catch (error) {
      logger.error('Error loading tokens:', error.message);
    }
  }

  // Save tokens to file
  saveTokens() {
    try {
      const data = {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        tokenExpiry: this.tokenExpiry?.toISOString(),
        shopId: this.shopId,
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
      logger.info('Tokens saved to file');
    } catch (error) {
      logger.error('Error saving tokens:', error.message);
    }
  }

  // Check if token is expired
  isTokenExpired() {
    if (!this.tokenExpiry) return true;
    // Add 5 minute buffer
    return new Date() >= new Date(this.tokenExpiry.getTime() - 5 * 60 * 1000);
  }

  // Get current access token
  getAccessToken() {
    return this.accessToken;
  }

  // Get auth headers for API requests
  getAuthHeaders(apiPath) {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSignature(apiPath, timestamp);
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `${this.partnerId}|${this.accessToken}`
    };
  }

  // Get auth params for API requests
  getAuthParams(apiPath) {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSignature(apiPath, timestamp);
    
    return {
      partner_id: this.partnerId,
      shopid: this.shopId,
      timestamp: timestamp,
      sign: sign
    };
  }

  // Set tokens manually (from OAuth callback)
  setTokens(accessToken, refreshToken, expiresIn = 14400) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    this.saveTokens();
    logger.info(`Tokens set, expires at ${this.tokenExpiry.toISOString()}`);
  }

  // Request new access token using refresh token
  async doRefreshToken() {
    if (!this.refreshToken) {
      logger.warn('No refresh token available');
      return false;
    }

    try {
      const apiPath = '/auth/token/refresh';
      const timestamp = Math.floor(Date.now() / 1000);
      const sign = this.generateSignature(apiPath, timestamp);

      logger.info('Refreshing access token...');

      const response = await axios.post(`${this.baseUrl}${apiPath}`, {
        refresh_token: this.refreshToken,
        partner_id: this.partnerId,
        shopid: this.shopId
      }, {
        params: {
          partner_id: this.partnerId,
          timestamp: timestamp,
          sign: sign
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && !response.data.error) {
        this.accessToken = response.data.access_token;
        this.refreshToken = response.data.refresh_token;
        this.tokenExpiry = new Date(Date.now() + (response.data.expire_in || 14400) * 1000);
        this.saveTokens();
        
        logger.info(`Token refreshed successfully, new expiry: ${this.tokenExpiry.toISOString()}`);
        return true;
      } else {
        logger.error('Token refresh failed:', response.data?.message || 'Unknown error');
        return false;
      }
    } catch (error) {
      logger.error('Token refresh error:', error.message);
      return false;
    }
  }

  // Start auto refresh timer (every 3 hours)
  startAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Refresh every 3 hours
    this.refreshTimer = setInterval(async () => {
      logger.info('Auto refresh triggered (3-hour interval)');
      await this.doRefreshToken();
    }, this.refreshInterval);

    logger.info(`Auto token refresh started (every ${this.refreshInterval / 1000 / 60} minutes)`);
  }

  // Stop auto refresh
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      logger.info('Auto token refresh stopped');
    }
  }

  // Get token status
  getStatus() {
    return {
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      tokenExpiry: this.tokenExpiry?.toISOString(),
      isExpired: this.isTokenExpired(),
      shopId: this.shopId,
      partnerId: this.partnerId,
      baseUrl: this.baseUrl
    };
  }

  // Make authenticated API request to Shopee API v1
  async apiRequest(method, apiPath, bodyData = {}) {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSignature(apiPath, timestamp);

    // Build URL with auth params
    const url = `${this.baseUrl}${apiPath}`;
    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timestamp.toString(),
      sign: sign
    });

    // Add shopid to body for shop-level APIs
    const requestBody = {
      shopid: this.shopId,
      partner_id: this.partnerId,
      ...bodyData
    };

    const config = {
      method: method.toUpperCase(),
      url: `${url}?${params.toString()}`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: requestBody,
      timeout: 30000
    };

    try {
      logger.info(`Shopee API Request: ${method.toUpperCase()} ${apiPath}`);
      const response = await axios(config);
      
      if (response.data && response.data.error) {
        logger.error(`Shopee API Error: ${response.data.error} - ${response.data.msg || response.data.message}`);
        throw new Error(response.data.msg || response.data.message || response.data.error);
      }
      
      logger.info(`Shopee API Success: ${apiPath}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        logger.error(`Shopee API Error [${method} ${apiPath}]:`, error.response.data);
        throw new Error(error.response.data?.msg || error.response.data?.message || error.message);
      }
      logger.error(`Shopee API Request Failed [${method} ${apiPath}]:`, error.message);
      throw error;
    }
  }

  // Get shop info
  async getShopInfo() {
    return await this.apiRequest('POST', '/shop/get', {});
  }

  // Get all items (products)
  async getItems(offset = 0, limit = 100) {
    return await this.apiRequest('POST', '/items/get', {
      pagination_offset: offset,
      pagination_entries_per_page: limit
    });
  }

  // Get item detail
  async getItemDetail(itemId) {
    return await this.apiRequest('POST', '/item/get', {
      item_id: parseInt(itemId)
    });
  }

  // Get orders list
  async getOrders(createTimeFrom, createTimeTo, offset = 0, limit = 100) {
    return await this.apiRequest('POST', '/orders/basics', {
      create_time_from: createTimeFrom,
      create_time_to: createTimeTo,
      pagination_offset: offset,
      pagination_entries_per_page: limit
    });
  }

  // Get order detail
  async getOrderDetail(orderSnList) {
    return await this.apiRequest('POST', '/orders/detail', {
      ordersn_list: Array.isArray(orderSnList) ? orderSnList : [orderSnList]
    });
  }

  // Update stock
  async updateStock(itemId, stock) {
    return await this.apiRequest('POST', '/items/update_stock', {
      item_id: parseInt(itemId),
      stock: parseInt(stock)
    });
  }
}

// Singleton instance
const tokenManager = new TokenManager();

module.exports = tokenManager;
