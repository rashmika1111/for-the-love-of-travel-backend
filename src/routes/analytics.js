const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { analyticsLimiter } = require('../middleware/rateLimiter');
const { analyticsMiddleware } = require('../middleware/analytics');
const {
  analyticsValidation
} = require('../utils/validation');

// Apply rate limiting to all analytics routes
router.use(analyticsLimiter);

// Track analytics events
router.post('/view',
  analyticsValidation,
  analyticsController.trackView
);

router.post('/interaction',
  analyticsValidation,
  analyticsController.trackInteraction
);

// Get analytics data
router.get('/page-views',
  analyticsController.getPageViews
);

router.get('/popular-pages',
  analyticsController.getPopularPages
);

router.get('/search',
  analyticsController.getSearchAnalytics
);

router.get('/traffic-sources',
  analyticsController.getTrafficSources
);

router.get('/devices',
  analyticsController.getDeviceAnalytics
);

router.get('/geographic',
  analyticsController.getGeographicAnalytics
);

router.get('/real-time',
  analyticsController.getRealTimeAnalytics
);

router.get('/conversions',
  analyticsController.getConversionAnalytics
);

router.get('/engagement',
  analyticsController.getUserEngagement
);

router.get('/content-performance',
  analyticsController.getContentPerformance
);

router.get('/bounce-rate',
  analyticsController.getBounceRateAnalytics
);

router.get('/time-on-page',
  analyticsController.getTimeOnPageAnalytics
);

// Dashboard and comprehensive data
router.get('/dashboard',
  analyticsController.getDashboardData
);

router.get('/date-range',
  analyticsController.getDateRangeAnalytics
);

// Export analytics data
router.get('/export',
  analyticsController.exportAnalyticsData
);

// Health check
router.get('/health',
  analyticsController.getAnalyticsHealth
);

module.exports = router;
