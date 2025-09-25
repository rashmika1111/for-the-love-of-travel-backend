const Analytics = require('../models/Analytics');
const { ANALYTICS_TYPES } = require('../utils/constants');

// Generate session ID
const generateSessionId = (req) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const timestamp = Math.floor(Date.now() / (1000 * 60 * 60)); // Hour-based timestamp
  
  // Create a simple hash of the components
  const crypto = require('crypto');
  const hash = crypto.createHash('md5')
    .update(`${ip}:${userAgent}:${timestamp}`)
    .digest('hex');
  
  return hash.substring(0, 16);
};

// Extract metadata from request
const extractMetadata = (req) => {
  const userAgent = req.get('User-Agent') || '';
  
  // Basic device detection
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?=.*Tablet)|Kindle|Silk/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;
  
  // Browser detection
  let browser = 'Unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Opera')) browser = 'Opera';
  
  // OS detection
  let os = 'Unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';
  
  return {
    device: isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop',
    browser,
    os,
    isMobile,
    isTablet,
    isDesktop,
    language: req.get('Accept-Language')?.split(',')[0] || 'en',
    referrer: req.get('Referer') || null,
    country: req.geoip?.country || null,
    city: req.geoip?.city || null,
    region: req.geoip?.region || null,
    timezone: req.geoip?.timezone || null
  };
};

// Track page view
const trackPageView = async (req, res, next) => {
  try {
    const sessionId = generateSessionId(req);
    const metadata = extractMetadata(req);
    
    const analyticsData = {
      type: ANALYTICS_TYPES.VIEW,
      path: req.originalUrl,
      sessionId,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      userId: req.user?.id || null,
      metadata,
      data: {
        referrer: req.get('Referer'),
        utm_source: req.query.utm_source,
        utm_medium: req.query.utm_medium,
        utm_campaign: req.query.utm_campaign,
        utm_term: req.query.utm_term,
        utm_content: req.query.utm_content,
        method: req.method,
        statusCode: res.statusCode
      }
    };
    
    // Save to database (async, don't wait)
    Analytics.create(analyticsData).catch(error => {
      console.error('Failed to save page view analytics:', error);
    });
    
    // Add session ID to request for other middleware
    req.sessionId = sessionId;
    
    next();
  } catch (error) {
    console.error('Page view tracking error:', error);
    next(); // Continue on error
  }
};

// Track user interactions
const trackInteraction = (interactionType, options = {}) => {
  return async (req, res, next) => {
    try {
      const sessionId = req.sessionId || generateSessionId(req);
      const metadata = extractMetadata(req);
      
      const analyticsData = {
        type: interactionType,
        path: req.originalUrl,
        sessionId,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        userId: req.user?.id || null,
        metadata,
        data: {
          element: options.element || null,
          value: options.value || null,
          duration: options.duration || null,
          ...options.data
        }
      };
      
      // Save to database (async, don't wait)
      Analytics.create(analyticsData).catch(error => {
        console.error('Failed to save interaction analytics:', error);
      });
      
      next();
    } catch (error) {
      console.error('Interaction tracking error:', error);
      next(); // Continue on error
    }
  };
};

// Track form submissions
const trackFormSubmission = (formName) => {
  return async (req, res, next) => {
    try {
      const sessionId = req.sessionId || generateSessionId(req);
      const metadata = extractMetadata(req);
      
      const analyticsData = {
        type: ANALYTICS_TYPES.FORM_SUBMIT,
        path: req.originalUrl,
        sessionId,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        userId: req.user?.id || null,
        metadata,
        data: {
          formName,
          success: res.statusCode < 400,
          fields: Object.keys(req.body || {}),
          referrer: req.get('Referer')
        }
      };
      
      // Save to database (async, don't wait)
      Analytics.create(analyticsData).catch(error => {
        console.error('Failed to save form submission analytics:', error);
      });
      
      next();
    } catch (error) {
      console.error('Form submission tracking error:', error);
      next(); // Continue on error
    }
  };
};

// Track search queries
const trackSearch = async (req, res, next) => {
  try {
    const sessionId = req.sessionId || generateSessionId(req);
    const metadata = extractMetadata(req);
    
    const analyticsData = {
      type: ANALYTICS_TYPES.SEARCH,
      path: req.originalUrl,
      sessionId,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      userId: req.user?.id || null,
      metadata,
      data: {
        query: req.query.q || req.query.query || req.body.query,
        type: req.query.type || 'all',
        results: res.locals.searchResults?.length || 0,
        filters: {
          category: req.query.category,
          tag: req.query.tag,
          sortBy: req.query.sortBy,
          sortOrder: req.query.sortOrder
        }
      }
    };
    
    // Save to database (async, don't wait)
    Analytics.create(analyticsData).catch(error => {
      console.error('Failed to save search analytics:', error);
    });
    
    next();
  } catch (error) {
    console.error('Search tracking error:', error);
    next(); // Continue on error
  }
};

// Track API usage
const trackApiUsage = (apiName) => {
  return async (req, res, next) => {
    try {
      const sessionId = req.sessionId || generateSessionId(req);
      const metadata = extractMetadata(req);
      
      const analyticsData = {
        type: 'api_usage',
        path: req.originalUrl,
        sessionId,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        userId: req.user?.id || null,
        metadata,
        data: {
          apiName,
          method: req.method,
          statusCode: res.statusCode,
          responseTime: Date.now() - req.startTime,
          userAgent: req.get('User-Agent'),
          referrer: req.get('Referer')
        }
      };
      
      // Save to database (async, don't wait)
      Analytics.create(analyticsData).catch(error => {
        console.error('Failed to save API usage analytics:', error);
      });
      
      next();
    } catch (error) {
      console.error('API usage tracking error:', error);
      next(); // Continue on error
    }
  };
};

// Track errors
const trackError = (error, req, res, next) => {
  try {
    const sessionId = req.sessionId || generateSessionId(req);
    const metadata = extractMetadata(req);
    
    const analyticsData = {
      type: 'error',
      path: req.originalUrl,
      sessionId,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      userId: req.user?.id || null,
      metadata,
      data: {
        error: {
          message: error.message,
          stack: error.stack,
          statusCode: error.statusCode || 500
        },
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params
      }
    };
    
    // Save to database (async, don't wait)
    Analytics.create(analyticsData).catch(saveError => {
      console.error('Failed to save error analytics:', saveError);
    });
    
    next(error);
  } catch (trackingError) {
    console.error('Error tracking error:', trackingError);
    next(error);
  }
};

// Performance tracking middleware
const trackPerformance = (req, res, next) => {
  req.startTime = Date.now();
  
  res.on('finish', () => {
    try {
      const responseTime = Date.now() - req.startTime;
      const sessionId = req.sessionId || generateSessionId(req);
      
      // Only track if response time is significant
      if (responseTime > 100) { // More than 100ms
        const analyticsData = {
          type: 'performance',
          path: req.originalUrl,
          sessionId,
          ip: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          userId: req.user?.id || null,
          metadata: extractMetadata(req),
          data: {
            responseTime,
            statusCode: res.statusCode,
            method: req.method,
            contentLength: res.get('Content-Length') || 0
          }
        };
        
        // Save to database (async, don't wait)
        Analytics.create(analyticsData).catch(error => {
          console.error('Failed to save performance analytics:', error);
        });
      }
    } catch (error) {
      console.error('Performance tracking error:', error);
    }
  });
  
  next();
};

// Custom analytics tracking
const trackCustom = (eventName, dataExtractor = null) => {
  return async (req, res, next) => {
    try {
      const sessionId = req.sessionId || generateSessionId(req);
      const metadata = extractMetadata(req);
      
      const customData = dataExtractor ? dataExtractor(req, res) : {};
      
      const analyticsData = {
        type: 'custom',
        path: req.originalUrl,
        sessionId,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        userId: req.user?.id || null,
        metadata,
        data: {
          eventName,
          ...customData
        }
      };
      
      // Save to database (async, don't wait)
      Analytics.create(analyticsData).catch(error => {
        console.error('Failed to save custom analytics:', error);
      });
      
      next();
    } catch (error) {
      console.error('Custom tracking error:', error);
      next(); // Continue on error
    }
  };
};

// Analytics middleware for specific endpoints
const analyticsMiddleware = {
  // Page views
  pageView: trackPageView,
  
  // Form submissions
  contactForm: trackFormSubmission('contact'),
  newsletter: trackFormSubmission('newsletter'),
  comment: trackFormSubmission('comment'),
  
  // Interactions
  like: trackInteraction(ANALYTICS_TYPES.CLICK, { element: 'like' }),
  share: trackInteraction(ANALYTICS_TYPES.CLICK, { element: 'share' }),
  bookmark: trackInteraction(ANALYTICS_TYPES.CLICK, { element: 'bookmark' }),
  
  // Search
  search: trackSearch,
  
  // API usage
  api: trackApiUsage,
  
  // Performance
  performance: trackPerformance,
  
  // Errors
  error: trackError,
  
  // Custom
  custom: trackCustom
};

// Analytics aggregation helpers
const analyticsHelpers = {
  // Get popular pages
  getPopularPages: async (timeframe = '30d', limit = 10) => {
    return await Analytics.getPopularPages(timeframe, limit);
  },
  
  // Get search analytics
  getSearchAnalytics: async (timeframe = '30d', limit = 50) => {
    return await Analytics.getSearchAnalytics(timeframe, limit);
  },
  
  // Get traffic sources
  getTrafficSources: async (timeframe = '30d') => {
    return await Analytics.getTrafficSources(timeframe);
  },
  
  // Get device analytics
  getDeviceAnalytics: async (timeframe = '30d') => {
    return await Analytics.getDeviceAnalytics(timeframe);
  },
  
  // Get real-time analytics
  getRealTimeAnalytics: async () => {
    return await Analytics.getRealTimeAnalytics();
  }
};

module.exports = {
  generateSessionId,
  extractMetadata,
  trackPageView,
  trackInteraction,
  trackFormSubmission,
  trackSearch,
  trackApiUsage,
  trackError,
  trackPerformance,
  trackCustom,
  analyticsMiddleware,
  analyticsHelpers
};
