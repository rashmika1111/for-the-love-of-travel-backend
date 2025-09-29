// API Response Constants
const API_RESPONSES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Error Codes
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SPAM_DETECTED: 'SPAM_DETECTED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  CACHE_ERROR: 'CACHE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EMAIL_ERROR: 'EMAIL_ERROR'
};

// Rate Limiting Configuration
const RATE_LIMITS = {
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  STRICT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20 // limit each IP to 20 requests per windowMs
  },
  CONTACT_FORM: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5 // limit each IP to 5 contact form submissions per hour
  },
  NEWSLETTER: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3 // limit each IP to 3 newsletter subscriptions per hour
  },
  COMMENTS: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10 // limit each IP to 10 comments per hour
  },
  SEARCH: {
    windowMs: 60 * 1000, // 1 minute
    max: 30 // limit each IP to 30 searches per minute
  }
};

// Cache Configuration
const CACHE_CONFIG = {
  TTL: {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400 // 24 hours
  },
  KEYS: {
    CONTENT_PAGE: 'content:page:published',
    POPULAR_POSTS: 'posts:popular',
    CATEGORIES: 'categories:all',
    TAGS: 'tags:all',
    SEARCH_RESULTS: 'search:results:',
    POST_DETAILS: 'post:details:',
    RELATED_POSTS: 'post:related:',
    COMMENT_COUNT: 'post:comments:count:',
    ANALYTICS_POPULAR: 'analytics:popular',
    NEWSLETTER_STATS: 'newsletter:stats'
  }
};

// Pagination Configuration
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1
};

// Content Status
const CONTENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  SCHEDULED: 'scheduled'
};

// Comment Status
const COMMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SPAM: 'spam'
};

// Newsletter Status
const NEWSLETTER_STATUS = {
  ACTIVE: 'active',
  UNSUBSCRIBED: 'unsubscribed',
  BOUNCED: 'bounced',
  COMPLAINED: 'complained'
};

// Contact Status
const CONTACT_STATUS = {
  NEW: 'new',
  READ: 'read',
  REPLIED: 'replied',
  ARCHIVED: 'archived'
};

// Interaction Types
const INTERACTION_TYPES = {
  LIKE: 'like',
  SHARE: 'share',
  VIEW: 'view',
  BOOKMARK: 'bookmark',
  COMMENT: 'comment'
};

// Analytics Types
const ANALYTICS_TYPES = {
  VIEW: 'view',
  CLICK: 'click',
  SEARCH: 'search',
  SCROLL: 'scroll',
  EXIT: 'exit',
  FORM_SUBMIT: 'form_submit',
  DOWNLOAD: 'download',
  VIDEO_PLAY: 'video_play',
  VIDEO_COMPLETE: 'video_complete'
};

// Email Templates
const EMAIL_TEMPLATES = {
  CONTACT_CONFIRMATION: 'contact_confirmation',
  NEWSLETTER_WELCOME: 'newsletter_welcome',
  NEWSLETTER_UNSUBSCRIBE: 'newsletter_unsubscribe',
  COMMENT_NOTIFICATION: 'comment_notification',
  ADMIN_NOTIFICATION: 'admin_notification'
};

// Validation Rules
const VALIDATION_RULES = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100
  },
  EMAIL: {
    MAX_LENGTH: 255,
    PATTERN: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
  },
  MESSAGE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 2000
  },
  COMMENT: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 2000
  },
  SUBJECT: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 200
  },
  WEBSITE: {
    MAX_LENGTH: 200,
    PATTERN: /^https?:\/\/.+\..+/
  },
  SLUG: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
    PATTERN: /^[a-z0-9-]+$/
  }
};

// Spam Detection
const SPAM_DETECTION = {
  MAX_LINKS: 3,
  MAX_CAPS_RATIO: 0.7,
  SUSPICIOUS_WORDS: [
    'viagra', 'casino', 'lottery', 'winner', 'congratulations',
    'click here', 'free money', 'make money', 'work from home'
  ],
  MIN_CONTENT_LENGTH: 10,
  MAX_REPEAT_CHARS: 5
};

// File Upload Configuration
const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
};

// Search Configuration
const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 100,
  DEFAULT_RESULTS_PER_PAGE: 10,
  MAX_RESULTS_PER_PAGE: 50,
  HIGHLIGHT_TAGS: ['<mark>', '</mark>']
};

// Time Formats
const TIME_FORMATS = {
  DATE: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  HUMAN: 'MMMM Do YYYY, h:mm a'
};

// Environment Variables
const ENV_VARS = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/love-of-travel',
  REDIS_URL: process.env.REDIS_URL || null,
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001',
  ADMIN_URL: process.env.ADMIN_URL || 'http://localhost:3001'
};

// CORS Configuration
const CORS_CONFIG = {
  origin: [
    ENV_VARS.FRONTEND_URL,
    ENV_VARS.ADMIN_URL,
    'http://localhost:5000',
    'http://localhost:3001',
    'http://localhost:3002'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Logging Configuration
const LOGGING = {
  LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    HTTP: 'http',
    VERBOSE: 'verbose',
    DEBUG: 'debug',
    SILLY: 'silly'
  },
  FORMATS: {
    COMBINED: 'combined',
    COMMON: 'common',
    DEV: 'dev',
    SHORT: 'short',
    TINY: 'tiny'
  }
};

module.exports = {
  API_RESPONSES,
  HTTP_STATUS,
  ERROR_CODES,
  RATE_LIMITS,
  CACHE_CONFIG,
  PAGINATION,
  CONTENT_STATUS,
  COMMENT_STATUS,
  NEWSLETTER_STATUS,
  CONTACT_STATUS,
  INTERACTION_TYPES,
  ANALYTICS_TYPES,
  EMAIL_TEMPLATES,
  VALIDATION_RULES,
  SPAM_DETECTION,
  FILE_UPLOAD,
  SEARCH_CONFIG,
  TIME_FORMATS,
  ENV_VARS,
  CORS_CONFIG,
  LOGGING
};
