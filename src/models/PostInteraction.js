const mongoose = require('mongoose');

const postInteractionSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Post ID is required']
  },
  type: {
    type: String,
    enum: ['like', 'share', 'view', 'bookmark', 'comment'],
    required: [true, 'Interaction type is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for anonymous users
  },
  sessionId: {
    type: String,
    required: true // for tracking anonymous users
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
    referrer: String,
    source: String, // social media platform for shares
    device: String,
    browser: String,
    os: String,
    country: String,
    city: String,
    timeOnPage: Number, // in seconds
    scrollDepth: Number, // percentage
    exitIntent: Boolean
  },
  value: {
    type: Number,
    default: 1 // for weighted interactions
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for better performance
postInteractionSchema.index({ postId: 1, type: 1 });
postInteractionSchema.index({ postId: 1, userId: 1, type: 1 });
postInteractionSchema.index({ postId: 1, sessionId: 1, type: 1 });
postInteractionSchema.index({ createdAt: -1 });
postInteractionSchema.index({ type: 1, createdAt: -1 });

// Unique constraint to prevent duplicate interactions from same user/session
postInteractionSchema.index(
  { postId: 1, userId: 1, type: 1 },
  { 
    unique: true, 
    partialFilterExpression: { userId: { $ne: null } }
  }
);

postInteractionSchema.index(
  { postId: 1, sessionId: 1, type: 1 },
  { 
    unique: true, 
    partialFilterExpression: { userId: null }
  }
);

// Virtual for formatted date
postInteractionSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Static method to get interaction counts for a post
postInteractionSchema.statics.getPostStats = async function(postId) {
  const stats = await this.aggregate([
    { $match: { postId: mongoose.Types.ObjectId(postId) } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueSessions: { $addToSet: '$sessionId' }
      }
    }
  ]);
  
  const result = {
    total: 0,
    likes: 0,
    shares: 0,
    views: 0,
    bookmarks: 0,
    comments: 0,
    uniqueUsers: 0,
    uniqueSessions: 0
  };
  
  stats.forEach(stat => {
    result[stat._id + 's'] = stat.count;
    result.total += stat.count;
  });
  
  // Calculate unique users and sessions
  const allUsers = new Set();
  const allSessions = new Set();
  
  stats.forEach(stat => {
    stat.uniqueUsers.forEach(user => {
      if (user) allUsers.add(user.toString());
    });
    stat.uniqueSessions.forEach(session => {
      allSessions.add(session);
    });
  });
  
  result.uniqueUsers = allUsers.size;
  result.uniqueSessions = allSessions.size;
  
  return result;
};

// Static method to get popular posts
postInteractionSchema.statics.getPopularPosts = async function(limit = 10, timeframe = '7d') {
  const timeFilter = getTimeFilter(timeframe);
  
  return await this.aggregate([
    { $match: { ...timeFilter, type: { $in: ['like', 'share', 'view'] } } },
    {
      $group: {
        _id: '$postId',
        totalInteractions: { $sum: 1 },
        likes: { $sum: { $cond: [{ $eq: ['$type', 'like'] }, 1, 0] } },
        shares: { $sum: { $cond: [{ $eq: ['$type', 'share'] }, 1, 0] } },
        views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueSessions: { $addToSet: '$sessionId' }
      }
    },
    {
      $addFields: {
        engagementScore: {
          $add: [
            { $multiply: ['$likes', 3] },
            { $multiply: ['$shares', 5] },
            { $multiply: ['$views', 1] }
          ]
        },
        uniqueUserCount: { $size: '$uniqueUsers' },
        uniqueSessionCount: { $size: '$uniqueSessions' }
      }
    },
    { $sort: { engagementScore: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: '_id',
        as: 'post'
      }
    },
    { $unwind: '$post' },
    {
      $project: {
        postId: '$_id',
        title: '$post.title',
        slug: '$post.slug',
        excerpt: '$post.excerpt',
        featuredImage: '$post.featuredImage',
        publishedAt: '$post.publishedAt',
        totalInteractions: 1,
        likes: 1,
        shares: 1,
        views: 1,
        engagementScore: 1,
        uniqueUserCount: 1,
        uniqueSessionCount: 1
      }
    }
  ]);
};

// Static method to get user interaction history
postInteractionSchema.statics.getUserInteractions = async function(userId, limit = 20) {
  return await this.find({ userId })
    .populate('postId', 'title slug featuredImage publishedAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('type createdAt metadata');
};

// Static method to get interaction analytics
postInteractionSchema.statics.getAnalytics = async function(timeframe = '30d') {
  const timeFilter = getTimeFilter(timeframe);
  
  const analytics = await this.aggregate([
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
  
  return analytics;
};

// Helper function to get time filter
function getTimeFilter(timeframe) {
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
  
  return { createdAt: { $gte: startDate } };
}

// Instance method to check if user can interact
postInteractionSchema.methods.canInteract = function(userId, sessionId) {
  // Check if user has already interacted with this post
  return this.constructor.findOne({
    postId: this.postId,
    $or: [
      { userId: userId },
      { sessionId: sessionId }
    ],
    type: this.type
  }).then(existing => !existing);
};

module.exports = mongoose.model('PostInteraction', postInteractionSchema);
