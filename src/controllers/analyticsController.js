const analyticsService = require('../services/analyticsService');
const { API_RESPONSES, HTTP_STATUS, ERROR_CODES } = require('../utils/constants');

// Analytics controller
class AnalyticsController {
  // Track page view
  async trackView(req, res) {
    try {
      const { path, data } = req.body;
      const userId = req.user?.id || null;
      const sessionId = req.sessionId || 'anonymous';
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Create analytics record
      const analytics = new (require('../models/Analytics'))({
        type: 'view',
        path: path,
        sessionId: sessionId,
        ip: ip,
        userAgent: userAgent,
        userId: userId,
        data: {
          ...data,
          referrer: req.get('Referer'),
          utm_source: req.query.utm_source,
          utm_medium: req.query.utm_medium,
          utm_campaign: req.query.utm_campaign,
          utm_term: req.query.utm_term,
          utm_content: req.query.utm_content
        },
        metadata: {
          country: req.geoip?.country || null,
          city: req.geoip?.city || null,
          region: req.geoip?.region || null,
          timezone: req.geoip?.timezone || null,
          device: req.device?.type || 'unknown',
          browser: req.browser?.name || 'unknown',
          os: req.os?.name || 'unknown',
          screenResolution: req.screen?.resolution || null,
          language: req.get('Accept-Language')?.split(',')[0] || 'en',
          isMobile: req.device?.type === 'mobile',
          isTablet: req.device?.type === 'tablet',
          isDesktop: req.device?.type === 'desktop'
        }
      });
      
      await analytics.save();
      
      res.json({
        success: true,
        message: 'Page view tracked successfully'
      });
    } catch (error) {
      console.error('Track view error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to track page view',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Track user interaction
  async trackInteraction(req, res) {
    try {
      const { type, element, data } = req.body;
      const userId = req.user?.id || null;
      const sessionId = req.sessionId || 'anonymous';
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Validate interaction type
      const validTypes = ['click', 'scroll', 'exit', 'form_submit', 'download', 'video_play', 'video_complete'];
      if (!validTypes.includes(type)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Invalid interaction type',
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }
      
      // Create analytics record
      const analytics = new (require('../models/Analytics'))({
        type: type,
        path: req.originalUrl,
        sessionId: sessionId,
        ip: ip,
        userAgent: userAgent,
        userId: userId,
        data: {
          element: element,
          ...data,
          referrer: req.get('Referer')
        },
        metadata: {
          country: req.geoip?.country || null,
          city: req.geoip?.city || null,
          region: req.geoip?.region || null,
          timezone: req.geoip?.timezone || null,
          device: req.device?.type || 'unknown',
          browser: req.browser?.name || 'unknown',
          os: req.os?.name || 'unknown',
          screenResolution: req.screen?.resolution || null,
          language: req.get('Accept-Language')?.split(',')[0] || 'en',
          isMobile: req.device?.type === 'mobile',
          isTablet: req.device?.type === 'tablet',
          isDesktop: req.device?.type === 'desktop'
        }
      });
      
      await analytics.save();
      
      res.json({
        success: true,
        message: 'Interaction tracked successfully'
      });
    } catch (error) {
      console.error('Track interaction error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to track interaction',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get page views analytics
  async getPageViews(req, res) {
    try {
      const { timeframe = '30d', groupBy = 'day', limit = 100 } = req.query;
      
      const pageViews = await analyticsService.getPageViews(timeframe, groupBy, parseInt(limit));
      
      res.json({
        success: true,
        data: pageViews,
        meta: {
          timeframe,
          groupBy,
          limit: parseInt(limit),
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get page views error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch page views analytics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get popular pages
  async getPopularPages(req, res) {
    try {
      const { timeframe = '30d', limit = 20 } = req.query;
      
      const popularPages = await analyticsService.getPopularPages(timeframe, parseInt(limit));
      
      res.json({
        success: true,
        data: popularPages,
        meta: {
          timeframe,
          limit: parseInt(limit),
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get popular pages error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch popular pages analytics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get search analytics
  async getSearchAnalytics(req, res) {
    try {
      const { timeframe = '30d', limit = 50 } = req.query;
      
      const searchAnalytics = await analyticsService.getSearchAnalytics(timeframe, parseInt(limit));
      
      res.json({
        success: true,
        data: searchAnalytics,
        meta: {
          timeframe,
          limit: parseInt(limit),
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get search analytics error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch search analytics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get traffic sources
  async getTrafficSources(req, res) {
    try {
      const { timeframe = '30d' } = req.query;
      
      const trafficSources = await analyticsService.getTrafficSources(timeframe);
      
      res.json({
        success: true,
        data: trafficSources,
        meta: {
          timeframe,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get traffic sources error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch traffic sources analytics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get device analytics
  async getDeviceAnalytics(req, res) {
    try {
      const { timeframe = '30d' } = req.query;
      
      const deviceAnalytics = await analyticsService.getDeviceAnalytics(timeframe);
      
      res.json({
        success: true,
        data: deviceAnalytics,
        meta: {
          timeframe,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get device analytics error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch device analytics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get geographic analytics
  async getGeographicAnalytics(req, res) {
    try {
      const { timeframe = '30d' } = req.query;
      
      const geographicAnalytics = await analyticsService.getGeographicAnalytics(timeframe);
      
      res.json({
        success: true,
        data: geographicAnalytics,
        meta: {
          timeframe,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get geographic analytics error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch geographic analytics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get real-time analytics
  async getRealTimeAnalytics(req, res) {
    try {
      const realTimeAnalytics = await analyticsService.getRealTimeAnalytics();
      
      res.json({
        success: true,
        data: realTimeAnalytics,
        meta: {
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get real-time analytics error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch real-time analytics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get conversion analytics
  async getConversionAnalytics(req, res) {
    try {
      const { timeframe = '30d' } = req.query;
      
      const conversionAnalytics = await analyticsService.getConversionAnalytics(timeframe);
      
      res.json({
        success: true,
        data: conversionAnalytics,
        meta: {
          timeframe,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get conversion analytics error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch conversion analytics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get user engagement metrics
  async getUserEngagement(req, res) {
    try {
      const { timeframe = '30d' } = req.query;
      
      const userEngagement = await analyticsService.getUserEngagement(timeframe);
      
      res.json({
        success: true,
        data: userEngagement,
        meta: {
          timeframe,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get user engagement error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch user engagement metrics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get content performance metrics
  async getContentPerformance(req, res) {
    try {
      const { timeframe = '30d', limit = 20 } = req.query;
      
      const contentPerformance = await analyticsService.getContentPerformance(timeframe, parseInt(limit));
      
      res.json({
        success: true,
        data: contentPerformance,
        meta: {
          timeframe,
          limit: parseInt(limit),
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get content performance error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch content performance metrics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get bounce rate analytics
  async getBounceRateAnalytics(req, res) {
    try {
      const { timeframe = '30d' } = req.query;
      
      const bounceRateAnalytics = await analyticsService.getBounceRateAnalytics(timeframe);
      
      res.json({
        success: true,
        data: bounceRateAnalytics,
        meta: {
          timeframe,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get bounce rate analytics error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch bounce rate analytics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get time on page analytics
  async getTimeOnPageAnalytics(req, res) {
    try {
      const { timeframe = '30d' } = req.query;
      
      const timeOnPageAnalytics = await analyticsService.getTimeOnPageAnalytics(timeframe);
      
      res.json({
        success: true,
        data: timeOnPageAnalytics,
        meta: {
          timeframe,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get time on page analytics error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch time on page analytics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get comprehensive dashboard data
  async getDashboardData(req, res) {
    try {
      const { timeframe = '30d' } = req.query;
      
      const dashboardData = await analyticsService.getDashboardData(timeframe);
      
      res.json({
        success: true,
        data: dashboardData,
        meta: {
          timeframe,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get dashboard data error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch dashboard data',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get analytics for specific date range
  async getDateRangeAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Start date and end date are required',
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }
      
      const dateRangeAnalytics = await analyticsService.getDateRangeAnalytics(startDate, endDate);
      
      res.json({
        success: true,
        data: dateRangeAnalytics,
        meta: {
          startDate,
          endDate,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get date range analytics error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch date range analytics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Export analytics data
  async exportAnalyticsData(req, res) {
    try {
      const { timeframe = '30d', format = 'json' } = req.query;
      
      const exportData = await analyticsService.exportAnalyticsData(timeframe, format);
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${timeframe}.csv"`);
        res.send(exportData);
      } else {
        res.json({
          success: true,
          data: exportData,
          meta: {
            timeframe,
            format,
            timestamp: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Export analytics data error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to export analytics data',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get analytics health check
  async getAnalyticsHealth(req, res) {
    try {
      const health = await analyticsService.healthCheck();
      
      res.json({
        success: true,
        data: health,
        meta: {
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Analytics health check error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Analytics health check failed',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
}

// Create singleton instance
const analyticsController = new AnalyticsController();

module.exports = analyticsController;
