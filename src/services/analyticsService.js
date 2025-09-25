const Analytics = require('../models/Analytics');
const PostInteraction = require('../models/PostInteraction');
const Comment = require('../models/Comment');
const Newsletter = require('../models/Newsletter');
const Contact = require('../models/Contact');

// Analytics service class
class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get cached data or fetch from database
  async getCachedData(key, fetchFunction, ttl = this.cacheTimeout) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    const data = await fetchFunction();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get page views analytics
  async getPageViews(timeframe = '30d', groupBy = 'day', limit = 100) {
    const cacheKey = `pageviews:${timeframe}:${groupBy}:${limit}`;
    
    return await this.getCachedData(cacheKey, async () => {
      return await Analytics.getPageViews({
        timeframe,
        groupBy,
        limit
      });
    });
  }

  // Get popular pages
  async getPopularPages(timeframe = '30d', limit = 20) {
    const cacheKey = `popularpages:${timeframe}:${limit}`;
    
    return await this.getCachedData(cacheKey, async () => {
      return await Analytics.getPopularPages(timeframe, limit);
    });
  }

  // Get search analytics
  async getSearchAnalytics(timeframe = '30d', limit = 50) {
    const cacheKey = `search:${timeframe}:${limit}`;
    
    return await this.getCachedData(cacheKey, async () => {
      return await Analytics.getSearchAnalytics(timeframe, limit);
    });
  }

  // Get traffic sources
  async getTrafficSources(timeframe = '30d') {
    const cacheKey = `trafficsources:${timeframe}`;
    
    return await this.getCachedData(cacheKey, async () => {
      return await Analytics.getTrafficSources(timeframe);
    });
  }

  // Get device analytics
  async getDeviceAnalytics(timeframe = '30d') {
    const cacheKey = `devices:${timeframe}`;
    
    return await this.getCachedData(cacheKey, async () => {
      return await Analytics.getDeviceAnalytics(timeframe);
    });
  }

  // Get geographic analytics
  async getGeographicAnalytics(timeframe = '30d') {
    const cacheKey = `geographic:${timeframe}`;
    
    return await this.getCachedData(cacheKey, async () => {
      return await Analytics.getGeographicAnalytics(timeframe);
    });
  }

  // Get real-time analytics
  async getRealTimeAnalytics() {
    const cacheKey = 'realtime';
    
    return await this.getCachedData(cacheKey, async () => {
      return await Analytics.getRealTimeAnalytics();
    }, 60000); // 1 minute cache
  }

  // Get conversion analytics
  async getConversionAnalytics(timeframe = '30d') {
    const cacheKey = `conversions:${timeframe}`;
    
    return await this.getCachedData(cacheKey, async () => {
      return await Analytics.getConversionAnalytics(timeframe);
    });
  }

  // Get post interaction analytics
  async getPostInteractionAnalytics(timeframe = '30d') {
    const cacheKey = `postinteractions:${timeframe}`;
    
    return await this.getCachedData(cacheKey, async () => {
      const timeFilter = this.getTimeFilter(timeframe);
      
      return await PostInteraction.aggregate([
        { $match: timeFilter },
        {
          $group: {
            _id: {
              type: '$type',
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              }
            },
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            uniqueSessions: { $addToSet: '$sessionId' }
          }
        },
        {
          $group: {
            _id: '$_id.type',
            total: { $sum: '$count' },
            dailyData: {
              $push: {
                date: '$_id.date',
                count: '$count',
                uniqueUsers: { $size: '$uniqueUsers' },
                uniqueSessions: { $size: '$uniqueSessions' }
              }
            }
          }
        }
      ]);
    });
  }

  // Get comment analytics
  async getCommentAnalytics(timeframe = '30d') {
    const cacheKey = `comments:${timeframe}`;
    
    return await this.getCachedData(cacheKey, async () => {
      return await Comment.getCommentAnalytics(timeframe);
    });
  }

  // Get newsletter analytics
  async getNewsletterAnalytics() {
    const cacheKey = 'newsletter';
    
    return await this.getCachedData(cacheKey, async () => {
      const stats = await Newsletter.getStats();
      const subscribersByFrequency = await Newsletter.getSubscribersByFrequency();
      const recentSubscribers = await Newsletter.getRecentSubscribers(10);
      
      return {
        stats,
        subscribersByFrequency,
        recentSubscribers
      };
    });
  }

  // Get contact form analytics
  async getContactAnalytics(timeframe = '30d') {
    const cacheKey = `contact:${timeframe}`;
    
    return await this.getCachedData(cacheKey, async () => {
      const timeFilter = this.getTimeFilter(timeframe);
      
      const stats = await Contact.aggregate([
        { $match: timeFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const totalContacts = await Contact.countDocuments(timeFilter);
      const recentContacts = await Contact.find(timeFilter)
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name email subject status createdAt');
      
      return {
        stats: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        total: totalContacts,
        recent: recentContacts
      };
    });
  }

  // Get user engagement metrics
  async getUserEngagement(timeframe = '30d') {
    const cacheKey = `engagement:${timeframe}`;
    
    return await this.getCachedData(cacheKey, async () => {
      const timeFilter = this.getTimeFilter(timeframe);
      
      // Get page views
      const pageViews = await Analytics.countDocuments({
        type: 'view',
        ...timeFilter
      });
      
      // Get interactions
      const interactions = await PostInteraction.countDocuments(timeFilter);
      
      // Get comments
      const comments = await Comment.countDocuments({
        status: 'approved',
        ...timeFilter
      });
      
      // Get unique users
      const uniqueUsers = await Analytics.distinct('userId', {
        type: 'view',
        ...timeFilter
      });
      
      // Get unique sessions
      const uniqueSessions = await Analytics.distinct('sessionId', {
        type: 'view',
        ...timeFilter
      });
      
      return {
        pageViews,
        interactions,
        comments,
        uniqueUsers: uniqueUsers.length,
        uniqueSessions: uniqueSessions.length,
        engagementRate: pageViews > 0 ? (interactions + comments) / pageViews : 0
      };
    });
  }

  // Get content performance metrics
  async getContentPerformance(timeframe = '30d', limit = 20) {
    const cacheKey = `contentperformance:${timeframe}:${limit}`;
    
    return await this.getCachedData(cacheKey, async () => {
      return await PostInteraction.getPopularPosts(limit, timeframe);
    });
  }

  // Get bounce rate analytics
  async getBounceRateAnalytics(timeframe = '30d') {
    const cacheKey = `bouncerate:${timeframe}`;
    
    return await this.getCachedData(cacheKey, async () => {
      const timeFilter = this.getTimeFilter(timeframe);
      
      // Get single-page sessions
      const singlePageSessions = await Analytics.aggregate([
        { $match: { type: 'view', ...timeFilter } },
        {
          $group: {
            _id: '$sessionId',
            pageCount: { $sum: 1 }
          }
        },
        {
          $match: {
            pageCount: 1
          }
        }
      ]);
      
      // Get total sessions
      const totalSessions = await Analytics.distinct('sessionId', {
        type: 'view',
        ...timeFilter
      });
      
      const bounceRate = totalSessions.length > 0 
        ? (singlePageSessions.length / totalSessions.length) * 100 
        : 0;
      
      return {
        bounceRate: Math.round(bounceRate * 100) / 100,
        singlePageSessions: singlePageSessions.length,
        totalSessions: totalSessions.length
      };
    });
  }

  // Get time on page analytics
  async getTimeOnPageAnalytics(timeframe = '30d') {
    const cacheKey = `timeonpage:${timeframe}`;
    
    return await this.getCachedData(cacheKey, async () => {
      const timeFilter = this.getTimeFilter(timeframe);
      
      return await Analytics.aggregate([
        { 
          $match: { 
            type: 'view', 
            'data.duration': { $exists: true, $gt: 0 },
            ...timeFilter 
          } 
        },
        {
          $group: {
            _id: '$path',
            avgTimeOnPage: { $avg: '$data.duration' },
            totalViews: { $sum: 1 },
            totalTime: { $sum: '$data.duration' }
          }
        },
        { $sort: { avgTimeOnPage: -1 } },
        { $limit: 20 }
      ]);
    });
  }

  // Get comprehensive dashboard data
  async getDashboardData(timeframe = '30d') {
    const cacheKey = `dashboard:${timeframe}`;
    
    return await this.getCachedData(cacheKey, async () => {
      const [
        pageViews,
        popularPages,
        trafficSources,
        deviceAnalytics,
        userEngagement,
        contentPerformance,
        bounceRate,
        newsletterStats,
        contactStats
      ] = await Promise.all([
        this.getPageViews(timeframe),
        this.getPopularPages(timeframe, 10),
        this.getTrafficSources(timeframe),
        this.getDeviceAnalytics(timeframe),
        this.getUserEngagement(timeframe),
        this.getContentPerformance(timeframe, 10),
        this.getBounceRateAnalytics(timeframe),
        this.getNewsletterAnalytics(),
        this.getContactAnalytics(timeframe)
      ]);
      
      return {
        overview: {
          pageViews: pageViews.reduce((sum, pv) => sum + pv.views, 0),
          uniqueUsers: userEngagement.uniqueUsers,
          uniqueSessions: userEngagement.uniqueSessions,
          bounceRate: bounceRate.bounceRate,
          engagementRate: userEngagement.engagementRate
        },
        pageViews,
        popularPages,
        trafficSources,
        deviceAnalytics,
        userEngagement,
        contentPerformance,
        bounceRate,
        newsletterStats,
        contactStats,
        timeframe,
        generatedAt: new Date()
      };
    });
  }

  // Get analytics for specific date range
  async getDateRangeAnalytics(startDate, endDate) {
    const cacheKey = `daterange:${startDate}:${endDate}`;
    
    return await this.getCachedData(cacheKey, async () => {
      const timeFilter = {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
      
      const [
        pageViews,
        interactions,
        comments,
        newsletterSubscriptions,
        contactSubmissions
      ] = await Promise.all([
        Analytics.countDocuments({ type: 'view', ...timeFilter }),
        PostInteraction.countDocuments(timeFilter),
        Comment.countDocuments({ status: 'approved', ...timeFilter }),
        Newsletter.countDocuments({ status: 'active', ...timeFilter }),
        Contact.countDocuments(timeFilter)
      ]);
      
      return {
        pageViews,
        interactions,
        comments,
        newsletterSubscriptions,
        contactSubmissions,
        dateRange: { startDate, endDate }
      };
    });
  }

  // Export analytics data
  async exportAnalyticsData(timeframe = '30d', format = 'json') {
    try {
      const data = await this.getDashboardData(timeframe);
      
      if (format === 'csv') {
        return this.convertToCSV(data);
      }
      
      return data;
    } catch (error) {
      console.error('Export analytics error:', error);
      throw error;
    }
  }

  // Convert data to CSV format
  convertToCSV(data) {
    // This is a simplified CSV conversion
    // You might want to use a proper CSV library like 'csv-writer'
    const csvRows = [];
    
    // Add headers
    csvRows.push('Metric,Value,Date');
    
    // Add data rows
    csvRows.push(`Page Views,${data.overview.pageViews},${data.generatedAt}`);
    csvRows.push(`Unique Users,${data.overview.uniqueUsers},${data.generatedAt}`);
    csvRows.push(`Unique Sessions,${data.overview.uniqueSessions},${data.generatedAt}`);
    csvRows.push(`Bounce Rate,${data.overview.bounceRate},${data.generatedAt}`);
    
    return csvRows.join('\n');
  }

  // Helper function to get time filter
  getTimeFilter(timeframe) {
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return { timestamp: { $gte: startDate } };
  }

  // Health check
  async healthCheck() {
    try {
      const testData = await this.getRealTimeAnalytics();
      return {
        status: 'healthy',
        message: 'Analytics service is working properly',
        testData
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

module.exports = analyticsService;
