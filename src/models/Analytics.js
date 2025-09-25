const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['view', 'click', 'search', 'scroll', 'exit', 'form_submit', 'download', 'video_play', 'video_complete'],
    required: [true, 'Analytics type is required']
  },
  path: {
    type: String,
    required: [true, 'Path is required'],
    trim: true
  },
  data: {
    // Flexible data object for different analytics types
    element: String, // For click tracking
    query: String, // For search tracking
    duration: Number, // For time-based tracking
    scrollDepth: Number, // For scroll tracking
    formName: String, // For form submissions
    fileName: String, // For downloads
    videoId: String, // For video tracking
    videoDuration: Number, // For video tracking
    referrer: String,
    utm_source: String,
    utm_medium: String,
    utm_campaign: String,
    utm_term: String,
    utm_content: String,
    custom: mongoose.Schema.Types.Mixed // For custom tracking data
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sessionId: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  metadata: {
    country: String,
    city: String,
    region: String,
    timezone: String,
    device: String,
    browser: String,
    os: String,
    screenResolution: String,
    language: String,
    isMobile: Boolean,
    isTablet: Boolean,
    isDesktop: Boolean
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  value: {
    type: Number,
    default: 1 // For weighted analytics
  }
}, {
  timestamps: true
});

// Indexes for better performance
analyticsSchema.index({ type: 1, timestamp: -1 });
analyticsSchema.index({ path: 1, timestamp: -1 });
analyticsSchema.index({ sessionId: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ 'data.utm_source': 1, timestamp: -1 });
analyticsSchema.index({ 'data.utm_campaign': 1, timestamp: -1 });
analyticsSchema.index({ timestamp: -1 });

// Virtual for formatted timestamp
analyticsSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
});

// Static method to get page views
analyticsSchema.statics.getPageViews = async function(options = {}) {
  const {
    path = null,
    timeframe = '30d',
    groupBy = 'day',
    limit = 100
  } = options;
  
  const timeFilter = getTimeFilter(timeframe);
  const match = { type: 'view', ...timeFilter };
  
  if (path) {
    match.path = path;
  }
  
  const groupFormat = getGroupFormat(groupBy);
  
  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          path: '$path',
          date: {
            $dateToString: {
              format: groupFormat,
              date: '$timestamp'
            }
          }
        },
        views: { $sum: 1 },
        uniqueSessions: { $addToSet: '$sessionId' },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $addFields: {
        uniqueSessionCount: { $size: '$uniqueSessions' },
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    { $sort: { '_id.date': -1, views: -1 } },
    { $limit: limit }
  ]);
};

// Static method to get popular pages
analyticsSchema.statics.getPopularPages = async function(timeframe = '30d', limit = 20) {
  const timeFilter = getTimeFilter(timeframe);
  
  return await this.aggregate([
    { $match: { type: 'view', ...timeFilter } },
    {
      $group: {
        _id: '$path',
        views: { $sum: 1 },
        uniqueSessions: { $addToSet: '$sessionId' },
        uniqueUsers: { $addToSet: '$userId' },
        avgTimeOnPage: { $avg: '$data.duration' }
      }
    },
    {
      $addFields: {
        uniqueSessionCount: { $size: '$uniqueSessions' },
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    { $sort: { views: -1 } },
    { $limit: limit }
  ]);
};

// Static method to get search analytics
analyticsSchema.statics.getSearchAnalytics = async function(timeframe = '30d', limit = 50) {
  const timeFilter = getTimeFilter(timeframe);
  
  return await this.aggregate([
    { $match: { type: 'search', ...timeFilter } },
    {
      $group: {
        _id: '$data.query',
        searches: { $sum: 1 },
        uniqueSessions: { $addToSet: '$sessionId' },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $addFields: {
        uniqueSessionCount: { $size: '$uniqueSessions' },
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    { $sort: { searches: -1 } },
    { $limit: limit }
  ]);
};

// Static method to get click analytics
analyticsSchema.statics.getClickAnalytics = async function(path = null, timeframe = '30d') {
  const timeFilter = getTimeFilter(timeframe);
  const match = { type: 'click', ...timeFilter };
  
  if (path) {
    match.path = path;
  }
  
  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          path: '$path',
          element: '$data.element'
        },
        clicks: { $sum: 1 },
        uniqueSessions: { $addToSet: '$sessionId' }
      }
    },
    {
      $addFields: {
        uniqueSessionCount: { $size: '$uniqueSessions' }
      }
    },
    { $sort: { clicks: -1 } }
  ]);
};

// Static method to get user behavior analytics
analyticsSchema.statics.getUserBehavior = async function(sessionId) {
  return await this.find({ sessionId })
    .sort({ timestamp: 1 })
    .select('type path data timestamp')
    .lean();
};

// Static method to get traffic sources
analyticsSchema.statics.getTrafficSources = async function(timeframe = '30d') {
  const timeFilter = getTimeFilter(timeframe);
  
  return await this.aggregate([
    { $match: { type: 'view', ...timeFilter } },
    {
      $group: {
        _id: {
          utm_source: '$data.utm_source',
          utm_medium: '$data.utm_medium',
          utm_campaign: '$data.utm_campaign',
          referrer: '$data.referrer'
        },
        sessions: { $addToSet: '$sessionId' },
        users: { $addToSet: '$userId' },
        views: { $sum: 1 }
      }
    },
    {
      $addFields: {
        sessionCount: { $size: '$sessions' },
        userCount: { $size: '$users' }
      }
    },
    { $sort: { sessionCount: -1 } }
  ]);
};

// Static method to get device analytics
analyticsSchema.statics.getDeviceAnalytics = async function(timeframe = '30d') {
  const timeFilter = getTimeFilter(timeframe);
  
  return await this.aggregate([
    { $match: { type: 'view', ...timeFilter } },
    {
      $group: {
        _id: {
          device: '$metadata.device',
          browser: '$metadata.browser',
          os: '$metadata.os',
          isMobile: '$metadata.isMobile'
        },
        sessions: { $addToSet: '$sessionId' },
        views: { $sum: 1 }
      }
    },
    {
      $addFields: {
        sessionCount: { $size: '$sessions' }
      }
    },
    { $sort: { sessionCount: -1 } }
  ]);
};

// Static method to get geographic analytics
analyticsSchema.statics.getGeographicAnalytics = async function(timeframe = '30d') {
  const timeFilter = getTimeFilter(timeframe);
  
  return await this.aggregate([
    { $match: { type: 'view', ...timeFilter } },
    {
      $group: {
        _id: {
          country: '$metadata.country',
          city: '$metadata.city',
          region: '$metadata.region'
        },
        sessions: { $addToSet: '$sessionId' },
        views: { $sum: 1 }
      }
    },
    {
      $addFields: {
        sessionCount: { $size: '$sessions' }
      }
    },
    { $sort: { sessionCount: -1 } }
  ]);
};

// Static method to get real-time analytics
analyticsSchema.statics.getRealTimeAnalytics = async function() {
  const now = new Date();
  const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000);
  
  return await this.aggregate([
    { $match: { timestamp: { $gte: last5Minutes } } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        uniqueSessions: { $addToSet: '$sessionId' }
      }
    },
    {
      $addFields: {
        uniqueSessionCount: { $size: '$uniqueSessions' }
      }
    }
  ]);
};

// Static method to get conversion analytics
analyticsSchema.statics.getConversionAnalytics = async function(timeframe = '30d') {
  const timeFilter = getTimeFilter(timeframe);
  
  return await this.aggregate([
    { $match: { ...timeFilter, type: { $in: ['form_submit', 'download', 'video_complete'] } } },
    {
      $group: {
        _id: {
          type: '$type',
          path: '$path'
        },
        conversions: { $sum: 1 },
        uniqueSessions: { $addToSet: '$sessionId' }
      }
    },
    {
      $addFields: {
        uniqueSessionCount: { $size: '$uniqueSessions' }
      }
    },
    { $sort: { conversions: -1 } }
  ]);
};

// Helper function to get time filter
function getTimeFilter(timeframe) {
  const now = new Date();
  let startDate;
  
  switch (timeframe) {
    case '1h':
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
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

// Helper function to get group format
function getGroupFormat(groupBy) {
  switch (groupBy) {
    case 'hour':
      return '%Y-%m-%d %H:00';
    case 'day':
      return '%Y-%m-%d';
    case 'week':
      return '%Y-%U';
    case 'month':
      return '%Y-%m';
    default:
      return '%Y-%m-%d';
  }
}

module.exports = mongoose.model('Analytics', analyticsSchema);
