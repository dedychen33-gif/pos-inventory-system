const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array(),
    });
  }
  next();
};

// Product validations
const productValidation = {
  list: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
    query('category').optional().isString().trim(),
    query('status').optional().isIn(['active', 'inactive', 'deleted']),
    validate,
  ],
  getById: [
    param('id').isInt({ min: 1 }).toInt(),
    validate,
  ],
  updateStock: [
    param('id').isInt({ min: 1 }).toInt(),
    body('stock').isInt({ min: 0 }).toInt(),
    validate,
  ],
};

// Order validations
const orderValidation = {
  list: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isString().trim(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    validate,
  ],
  getById: [
    param('id').isInt({ min: 1 }).toInt(),
    validate,
  ],
  updateStatus: [
    param('id').isInt({ min: 1 }).toInt(),
    body('status').isString().notEmpty(),
    validate,
  ],
};

// Dashboard validations
const dashboardValidation = {
  chart: [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('period').optional().isIn(['daily', 'weekly', 'monthly']),
    validate,
  ],
};

// Auth validations
const authValidation = {
  login: [
    body('username').isString().notEmpty().trim(),
    body('password').isString().notEmpty().isLength({ min: 6 }),
    validate,
  ],
  register: [
    body('username').isString().notEmpty().trim().isLength({ min: 3, max: 50 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().notEmpty().isLength({ min: 6 }),
    validate,
  ],
};

module.exports = {
  validate,
  productValidation,
  orderValidation,
  dashboardValidation,
  authValidation,
};
