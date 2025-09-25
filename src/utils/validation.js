const { body, param, query, validationResult } = require('express-validator');
const { VALIDATION_RULES, ERROR_CODES } = require('./constants');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: ERROR_CODES.VALIDATION_ERROR,
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Common validation rules
const commonValidations = {
  name: body('name')
    .trim()
    .isLength({ min: VALIDATION_RULES.NAME.MIN_LENGTH, max: VALIDATION_RULES.NAME.MAX_LENGTH })
    .withMessage(`Name must be between ${VALIDATION_RULES.NAME.MIN_LENGTH} and ${VALIDATION_RULES.NAME.MAX_LENGTH} characters`),

  email: body('email')
    .trim()
    .isEmail()
    .isLength({ max: VALIDATION_RULES.EMAIL.MAX_LENGTH })
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  message: body('message')
    .trim()
    .isLength({ min: VALIDATION_RULES.MESSAGE.MIN_LENGTH, max: VALIDATION_RULES.MESSAGE.MAX_LENGTH })
    .withMessage(`Message must be between ${VALIDATION_RULES.MESSAGE.MIN_LENGTH} and ${VALIDATION_RULES.MESSAGE.MAX_LENGTH} characters`),

  subject: body('subject')
    .trim()
    .isLength({ min: VALIDATION_RULES.SUBJECT.MIN_LENGTH, max: VALIDATION_RULES.SUBJECT.MAX_LENGTH })
    .withMessage(`Subject must be between ${VALIDATION_RULES.SUBJECT.MIN_LENGTH} and ${VALIDATION_RULES.SUBJECT.MAX_LENGTH} characters`),

  website: body('website')
    .optional()
    .trim()
    .isURL({ protocols: ['http', 'https'] })
    .isLength({ max: VALIDATION_RULES.WEBSITE.MAX_LENGTH })
    .withMessage('Please provide a valid website URL'),

  slug: param('slug')
    .trim()
    .isLength({ min: VALIDATION_RULES.SLUG.MIN_LENGTH, max: VALIDATION_RULES.SLUG.MAX_LENGTH })
    .matches(VALIDATION_RULES.SLUG.PATTERN)
    .withMessage('Invalid slug format'),

  mongoId: param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),

  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  searchQuery: query('q')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters')
};

// Contact form validation
const contactValidation = [
  commonValidations.name,
  commonValidations.email,
  commonValidations.subject,
  commonValidations.message,
  handleValidationErrors
];

// Newsletter validation
const newsletterValidation = [
  commonValidations.email,
  body('preferences.frequency')
    .optional()
    .isIn(['weekly', 'monthly', 'quarterly'])
    .withMessage('Invalid frequency preference'),
  body('preferences.categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array'),
  body('preferences.categories.*')
    .optional()
    .isIn(['destinations', 'travel-tips', 'deals', 'news', 'all'])
    .withMessage('Invalid category preference'),
  handleValidationErrors
];

// Comment validation
const commentValidation = [
  commonValidations.name,
  commonValidations.email,
  commonValidations.website,
  body('content')
    .trim()
    .isLength({ min: VALIDATION_RULES.COMMENT.MIN_LENGTH, max: VALIDATION_RULES.COMMENT.MAX_LENGTH })
    .withMessage(`Comment must be between ${VALIDATION_RULES.COMMENT.MIN_LENGTH} and ${VALIDATION_RULES.COMMENT.MAX_LENGTH} characters`),
  body('parentId')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent comment ID'),
  handleValidationErrors
];

// Post interaction validation
const postInteractionValidation = [
  commonValidations.mongoId,
  body('type')
    .isIn(['like', 'share', 'view', 'bookmark'])
    .withMessage('Invalid interaction type'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  handleValidationErrors
];

// Search validation
const searchValidation = [
  commonValidations.searchQuery,
  query('type')
    .optional()
    .isIn(['posts', 'categories', 'tags', 'all'])
    .withMessage('Invalid search type'),
  query('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid category filter'),
  query('tag')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid tag filter'),
  query('sortBy')
    .optional()
    .isIn(['relevance', 'date', 'popularity', 'title'])
    .withMessage('Invalid sort option'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid sort order'),
  handleValidationErrors
];

// Analytics validation
const analyticsValidation = [
  body('type')
    .isIn(['view', 'click', 'search', 'scroll', 'exit', 'form_submit', 'download', 'video_play', 'video_complete'])
    .withMessage('Invalid analytics type'),
  body('path')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Path is required and must be less than 500 characters'),
  body('data')
    .optional()
    .isObject()
    .withMessage('Data must be an object'),
  handleValidationErrors
];

// Content page validation
const contentPageValidation = [
  query('version')
    .optional()
    .isIn(['published', 'draft'])
    .withMessage('Invalid version parameter'),
  handleValidationErrors
];

// Posts validation
const postsValidation = [
  commonValidations.page,
  commonValidations.limit,
  query('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid category filter'),
  query('tag')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid tag filter'),
  query('sortBy')
    .optional()
    .isIn(['date', 'popularity', 'title', 'views'])
    .withMessage('Invalid sort option'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid sort order'),
  handleValidationErrors
];

// Single post validation
const singlePostValidation = [
  commonValidations.slug,
  handleValidationErrors
];

// Category posts validation
const categoryPostsValidation = [
  commonValidations.slug,
  commonValidations.page,
  commonValidations.limit,
  handleValidationErrors
];

// Tag posts validation
const tagPostsValidation = [
  commonValidations.slug,
  commonValidations.page,
  commonValidations.limit,
  handleValidationErrors
];

// Related posts validation
const relatedPostsValidation = [
  commonValidations.mongoId,
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20'),
  handleValidationErrors
];

// Post comments validation
const postCommentsValidation = [
  commonValidations.slug,
  commonValidations.page,
  commonValidations.limit,
  query('includeReplies')
    .optional()
    .isBoolean()
    .withMessage('includeReplies must be a boolean'),
  handleValidationErrors
];

// Add comment validation
const addCommentValidation = [
  commonValidations.slug,
  ...commentValidation
];

// Like/unlike validation
const likeValidation = [
  commonValidations.slug,
  handleValidationErrors
];

// Share validation
const shareValidation = [
  commonValidations.slug,
  body('platform')
    .optional()
    .isIn(['facebook', 'twitter', 'linkedin', 'pinterest', 'whatsapp', 'email'])
    .withMessage('Invalid sharing platform'),
  handleValidationErrors
];

// Custom validation functions
const customValidations = {
  // Check if email is not a disposable email
  isNotDisposableEmail: (email) => {
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'mailinator.com', 'yopmail.com', 'temp-mail.org'
    ];
    
    const domain = email.split('@')[1];
    if (disposableDomains.includes(domain)) {
      throw new Error('Disposable email addresses are not allowed');
    }
    return true;
  },

  // Check if content is not spam
  isNotSpam: (content) => {
    const { SPAM_DETECTION } = require('./constants');
    
    // Check for excessive links
    const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
    if (linkCount > SPAM_DETECTION.MAX_LINKS) {
      throw new Error('Content contains too many links');
    }
    
    // Check for excessive caps
    const capsCount = (content.match(/[A-Z]/g) || []).length;
    const totalChars = content.length;
    if (totalChars > 0 && capsCount / totalChars > SPAM_DETECTION.MAX_CAPS_RATIO) {
      throw new Error('Content contains too many capital letters');
    }
    
    // Check for suspicious words
    const lowerContent = content.toLowerCase();
    const suspiciousWords = SPAM_DETECTION.SUSPICIOUS_WORDS.filter(word => 
      lowerContent.includes(word)
    );
    if (suspiciousWords.length > 0) {
      throw new Error('Content contains suspicious words');
    }
    
    // Check for repeated characters
    const repeatedChars = /(.)\1{4,}/.test(content);
    if (repeatedChars) {
      throw new Error('Content contains too many repeated characters');
    }
    
    return true;
  },

  // Validate file upload
  isValidFile: (file) => {
    const { FILE_UPLOAD } = require('./constants');
    
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (file.size > FILE_UPLOAD.MAX_SIZE) {
      throw new Error('File size exceeds maximum allowed size');
    }
    
    if (!FILE_UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
      throw new Error('File type not allowed');
    }
    
    return true;
  }
};

// Sanitization functions
const sanitization = {
  // Sanitize HTML content
  sanitizeHtml: (html) => {
    const xss = require('xss');
    return xss(html, {
      whiteList: {
        p: [],
        br: [],
        strong: [],
        em: [],
        u: [],
        a: ['href', 'title'],
        ul: [],
        ol: [],
        li: [],
        blockquote: []
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
  },

  // Sanitize text content
  sanitizeText: (text) => {
    return text
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  },

  // Sanitize URL
  sanitizeUrl: (url) => {
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid protocol');
      }
      return urlObj.toString();
    } catch (error) {
      throw new Error('Invalid URL format');
    }
  }
};

module.exports = {
  handleValidationErrors,
  commonValidations,
  contactValidation,
  newsletterValidation,
  commentValidation,
  postInteractionValidation,
  searchValidation,
  analyticsValidation,
  contentPageValidation,
  postsValidation,
  singlePostValidation,
  categoryPostsValidation,
  tagPostsValidation,
  relatedPostsValidation,
  postCommentsValidation,
  addCommentValidation,
  likeValidation,
  shareValidation,
  customValidations,
  sanitization
};
