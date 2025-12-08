const moment = require('moment-timezone');

// Format currency to IDR
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Format date to WIB timezone
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return moment(date).tz('Asia/Jakarta').format(format);
};

// Convert timestamp to Date
const timestampToDate = (timestamp) => {
  return new Date(timestamp * 1000);
};

// Calculate percentage
const calculatePercentage = (value, total) => {
  if (!total) return 0;
  return ((value / total) * 100).toFixed(2);
};

// Pagination helper
const paginate = (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return { limit: parseInt(limit), offset };
};

// Build pagination response
const paginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
};

// Generate random string
const generateRandomString = (length = 16) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Sanitize filename
const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-z0-9_\-\.]/gi, '_');
};

// Chunk array
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

module.exports = {
  formatCurrency,
  formatDate,
  timestampToDate,
  calculatePercentage,
  paginate,
  paginationResponse,
  sleep,
  retryWithBackoff,
  generateRandomString,
  sanitizeFilename,
  chunkArray,
};
