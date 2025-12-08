const { validationResult } = require('express-validator');

// Validation middleware
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  
  next();
};

// Sanitize request body
const sanitizeBody = (allowedFields) => {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      const sanitized = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          sanitized[field] = req.body[field];
        }
      });
      req.body = sanitized;
    }
    next();
  };
};

// Validate required fields
const requireFields = (...fields) => {
  return (req, res, next) => {
    const missing = fields.filter(field => !req.body[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: missing.map(field => ({
          field,
          message: `${field} is required`,
        })),
      });
    }
    
    next();
  };
};

// Validate ID parameter
const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} parameter`,
      });
    }
    
    req.params[paramName] = parseInt(id);
    next();
  };
};

// Validate pagination
const validatePagination = (req, res, next) => {
  let { page = 1, limit = 20 } = req.query;
  
  page = parseInt(page);
  limit = parseInt(limit);
  
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;
  
  req.pagination = {
    page,
    limit,
    offset: (page - 1) * limit,
  };
  
  next();
};

module.exports = {
  handleValidation,
  sanitizeBody,
  requireFields,
  validateId,
  validatePagination,
};
