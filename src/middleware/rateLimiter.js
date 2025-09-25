const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { RATE_LIMITS, ERROR_CODES } = require('../utils/constants');

// Custom rate limit store (can be extended to use Redis)
const createMemoryStore = () => {
  const store = new Map();
  
  return {
    increment: (key, windowMs) => {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean up old entries
      for (const [k, v] of store.entries()) {
        if (v.resetTime < now) {
          store.delete(k);
        }
      }
      
      const current = store.get(key);
      
      if (!current || current.resetTime < now) {
        store.set(key, {
          totalHits: 1,
          resetTime: now + windowMs
        });
        return {
          totalHits: 1,
          resetTime: now + windowMs
        };
      }
      
      current.totalHits++;
      return current;
    },
    
    decrement: (key) => {
      const current = store.get(key);
      if (current && current.totalHits > 0) {
        current.totalHits--;
      }
    },
    
    resetKey: (key) => {
      store.delete(key);
    }
  };
};

// Custom rate limit handler
const createRateLimitHandler = (message, code) => (req, res) => {
  res.status(429).json({
    success: false,
    message: message || 'Too many requests, please try again later',
    code: code || ERROR_CODES.RATE_LIMIT_EXCEEDED,
    retryAfter: Math.round(req.rateLimit.resetTime / 1000)
  });
};

// Custom rate limit key generator
const createKeyGenerator = (prefix = '') => (req) => {
  // Use IP address as primary key
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Add user ID if authenticated
  const userId = req.user?.id || '';
  
  // Add additional context if needed
  const context = req.route?.path || '';
  
  return `${prefix}:${ip}:${userId}:${context}`;
};

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: RATE_LIMITS.GENERAL.windowMs,
  max: RATE_LIMITS.GENERAL.max,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator('general'),
  handler: createRateLimitHandler(
    'Too many requests, please try again later',
    ERROR_CODES.RATE_LIMIT_EXCEEDED
  ),
  skip: (req) => {
    // Skip rate limiting for trusted IPs or in development
    return process.env.NODE_ENV === 'development' || 
           req.ip === '127.0.0.1' || 
           req.ip === '::1';
  }
});

// Strict rate limiter
const strictLimiter = rateLimit({
  windowMs: RATE_LIMITS.STRICT.windowMs,
  max: RATE_LIMITS.STRICT.max,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator('strict'),
  handler: createRateLimitHandler(
    'Rate limit exceeded, please slow down',
    ERROR_CODES.RATE_LIMIT_EXCEEDED
  )
});

// Contact form rate limiter
const contactFormLimiter = rateLimit({
  windowMs: RATE_LIMITS.CONTACT_FORM.windowMs,
  max: process.env.NODE_ENV === 'development' ? 100 : RATE_LIMITS.CONTACT_FORM.max,
  message: 'Too many contact form submissions, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator('contact'),
  handler: createRateLimitHandler(
    'Too many contact form submissions, please try again in an hour',
    ERROR_CODES.RATE_LIMIT_EXCEEDED
  ),
  skipSuccessfulRequests: true, // Don't count successful requests
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  }
});

// Newsletter rate limiter
const newsletterLimiter = rateLimit({
  windowMs: RATE_LIMITS.NEWSLETTER.windowMs,
  max: process.env.NODE_ENV === 'development' ? 100 : RATE_LIMITS.NEWSLETTER.max,
  message: 'Too many newsletter subscription attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator('newsletter'),
  handler: createRateLimitHandler(
    'Too many newsletter subscription attempts, please try again in an hour',
    ERROR_CODES.RATE_LIMIT_EXCEEDED
  ),
  skipSuccessfulRequests: true,
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  }
});

// Comments rate limiter
const commentsLimiter = rateLimit({
  windowMs: RATE_LIMITS.COMMENTS.windowMs,
  max: RATE_LIMITS.COMMENTS.max,
  message: 'Too many comments, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator('comments'),
  handler: createRateLimitHandler(
    'Too many comments, please try again in an hour',
    ERROR_CODES.RATE_LIMIT_EXCEEDED
  )
});

// Search rate limiter
const searchLimiter = rateLimit({
  windowMs: RATE_LIMITS.SEARCH.windowMs,
  max: RATE_LIMITS.SEARCH.max,
  message: 'Too many search requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator('search'),
  handler: createRateLimitHandler(
    'Too many search requests, please slow down',
    ERROR_CODES.RATE_LIMIT_EXCEEDED
  )
});

// Analytics rate limiter
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 analytics events per minute
  message: 'Too many analytics requests',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator('analytics'),
  handler: createRateLimitHandler(
    'Too many analytics requests, please slow down',
    ERROR_CODES.RATE_LIMIT_EXCEEDED
  )
});

// Slow down middleware for repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per 15 minutes, then...
  delayMs: () => 500, // Add 500ms delay per request above 50
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  keyGenerator: createKeyGenerator('slowdown'),
  skip: (req) => {
    // Skip slowdown for trusted IPs
    return req.ip === '127.0.0.1' || req.ip === '::1';
  }
});

// Dynamic rate limiter based on user behavior
const createDynamicLimiter = (baseConfig) => {
  return rateLimit({
    ...baseConfig,
    keyGenerator: (req) => {
      const baseKey = createKeyGenerator('dynamic')(req);
      
      // Add user trust level to key
      const trustLevel = req.user?.trustLevel || 0;
      
      return `${baseKey}:${trustLevel}`;
    },
    max: (req) => {
      // Adjust max requests based on user trust level
      const trustLevel = req.user?.trustLevel || 0;
      const baseMax = baseConfig.max;
      
      // Trusted users get higher limits
      if (trustLevel >= 3) return baseMax * 3;
      if (trustLevel >= 2) return baseMax * 2;
      if (trustLevel >= 1) return Math.floor(baseMax * 1.5);
      
      return baseMax;
    }
  });
};

// Rate limit bypass for admin users
const createAdminBypass = (limiter) => {
  return (req, res, next) => {
    // Bypass rate limiting for admin users
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    
    return limiter(req, res, next);
  };
};

// Rate limit status middleware
const rateLimitStatus = (req, res, next) => {
  // Add rate limit info to response headers
  if (req.rateLimit) {
    res.set({
      'X-RateLimit-Limit': req.rateLimit.limit,
      'X-RateLimit-Remaining': req.rateLimit.remaining,
      'X-RateLimit-Reset': new Date(req.rateLimit.resetTime).toISOString()
    });
  }
  
  next();
};

// Rate limit analytics middleware
const rateLimitAnalytics = (req, res, next) => {
  // Log rate limit events for analytics
  if (req.rateLimit) {
    const analytics = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      limit: req.rateLimit.limit,
      remaining: req.rateLimit.remaining,
      resetTime: req.rateLimit.resetTime,
      timestamp: new Date()
    };
    
    // Store analytics data (implement based on your analytics system)
    console.log('Rate limit analytics:', analytics);
  }
  
  next();
};

// Custom rate limit for specific endpoints
const createEndpointLimiter = (endpoint, config) => {
  return rateLimit({
    ...config,
    keyGenerator: createKeyGenerator(`endpoint:${endpoint}`),
    handler: createRateLimitHandler(
      `Too many requests to ${endpoint}, please try again later`,
      ERROR_CODES.RATE_LIMIT_EXCEEDED
    )
  });
};

// Rate limit for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator('upload'),
  handler: createRateLimitHandler(
    'Too many file uploads, please try again in an hour',
    ERROR_CODES.RATE_LIMIT_EXCEEDED
  )
});

// Rate limit for API key usage
const apiKeyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute for API keys
  message: 'API rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    return `api:${apiKey || 'anonymous'}`;
  },
  handler: createRateLimitHandler(
    'API rate limit exceeded, please try again later',
    ERROR_CODES.RATE_LIMIT_EXCEEDED
  )
});

module.exports = {
  generalLimiter,
  strictLimiter,
  contactFormLimiter,
  newsletterLimiter,
  commentsLimiter,
  searchLimiter,
  analyticsLimiter,
  speedLimiter,
  createDynamicLimiter,
  createAdminBypass,
  rateLimitStatus,
  rateLimitAnalytics,
  createEndpointLimiter,
  uploadLimiter,
  apiKeyLimiter,
  createRateLimitHandler,
  createKeyGenerator
};
