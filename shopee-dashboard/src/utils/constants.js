// Order Status
const ORDER_STATUS = {
  UNPAID: 'UNPAID',
  READY_TO_SHIP: 'READY_TO_SHIP',
  PROCESSED: 'PROCESSED',
  SHIPPED: 'SHIPPED',
  COMPLETED: 'COMPLETED',
  IN_CANCEL: 'IN_CANCEL',
  CANCELLED: 'CANCELLED',
  INVOICE_PENDING: 'INVOICE_PENDING',
};

// Sync Status
const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

// Stock Alert Levels
const STOCK_ALERT = {
  LOW: 10,
  CRITICAL: 5,
  OUT_OF_STOCK: 0,
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Shopee API Limits
const SHOPEE_API = {
  MAX_PRODUCTS_PER_REQUEST: 50,
  MAX_ORDERS_PER_REQUEST: 50,
  RATE_LIMIT_DELAY: 1000,
};

// Export Formats
const EXPORT_FORMAT = {
  EXCEL: 'xlsx',
  CSV: 'csv',
  PDF: 'pdf',
};

// Notification Types
const NOTIFICATION_TYPE = {
  LOW_STOCK: 'low_stock',
  ORDER_NEW: 'order_new',
  ORDER_CANCELLED: 'order_cancelled',
  SYNC_COMPLETED: 'sync_completed',
  SYNC_FAILED: 'sync_failed',
};

// Webhook Events
const WEBHOOK_EVENT = {
  ORDER_STATUS: 0,
  TRACKING_NO: 1,
  SHOPEE_UPDATE: 2,
  BUYER_CANCEL: 3,
  PROMOTION_UPDATE: 5,
  RESERVED_STOCK: 7,
  ITEM_PROMOTION: 8,
  SHOP_UPDATE: 9,
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

module.exports = {
  ORDER_STATUS,
  SYNC_STATUS,
  STOCK_ALERT,
  PAGINATION,
  SHOPEE_API,
  EXPORT_FORMAT,
  NOTIFICATION_TYPE,
  WEBHOOK_EVENT,
  HTTP_STATUS,
};
