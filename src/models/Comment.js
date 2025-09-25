const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Post ID is required']
  },
  author: {
    name: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Author email is required'],
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    website: {
      type: String,
      trim: true,
      maxlength: [200, 'Website URL cannot exceed 200 characters']
    },
    avatar: {
      type: String,
      trim: true
    }
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    minlength: [10, 'Comment must be at least 10 characters long']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'spam'],
    default: 'pending'
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  depth: {
    type: Number,
    default: 0,
    max: 3 // Maximum nesting depth
  },
  likes: {
    type: Number,
    default: 0
  },
  dislikes: {
    type: Number,
    default: 0
  },
  reports: {
    type: Number,
    default: 0
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  moderation: {
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: {
      type: Date
    },
    moderationReason: {
      type: String,
      maxlength: [500, 'Moderation reason cannot exceed 500 characters']
    },
    autoModerated: {
      type: Boolean,
      default: false
    }
  },
  metadata: {
    ip: String,
    userAgent: String,
    country: String,
    city: String,
    referrer: String,
    spamScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
commentSchema.index({ postId: 1, status: 1 });
commentSchema.index({ postId: 1, parentId: 1 });
commentSchema.index({ status: 1, createdAt: -1 });
commentSchema.index({ 'author.email': 1 });
commentSchema.index({ createdAt: -1 });
commentSchema.index({ likes: -1 });

// Virtual for formatted date
commentSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual for reply count
commentSchema.virtual('replyCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
  count: true
});

// Virtual for net score (likes - dislikes)
commentSchema.virtual('netScore').get(function() {
  return this.likes - this.dislikes;
});

// Pre-save middleware
commentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Set approvedAt when status changes to approved
  if (this.isModified('status') && this.status === 'approved' && !this.approvedAt) {
    this.approvedAt = new Date();
  }
  
  // Set editedAt when content is modified
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  
  // Calculate depth based on parent
  if (this.parentId) {
    this.depth = 1; // Will be calculated properly in post-save
  }
  
  next();
});

// Post-save middleware to calculate depth
commentSchema.post('save', async function() {
  if (this.parentId && this.depth === 1) {
    const parent = await this.constructor.findById(this.parentId);
    if (parent) {
      this.depth = parent.depth + 1;
      if (this.depth > 3) {
        this.depth = 3; // Maximum depth
      }
      await this.save();
    }
  }
});

// Static method to get comments for a post
commentSchema.statics.getPostComments = async function(postId, options = {}) {
  const {
    status = 'approved',
    includeReplies = true,
    sortBy = 'createdAt',
    sortOrder = 'asc',
    limit = 50,
    skip = 0
  } = options;
  
  const query = { postId, status };
  
  if (!includeReplies) {
    query.parentId = null;
  }
  
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  return await this.find(query)
    .populate('author', 'name email website avatar')
    .populate('moderation.moderatedBy', 'name email')
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .lean();
};

// Static method to get comment statistics
commentSchema.statics.getCommentStats = async function(postId = null) {
  const match = postId ? { postId: mongoose.Types.ObjectId(postId) } : {};
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalLikes: { $sum: '$likes' },
        totalDislikes: { $sum: '$dislikes' },
        totalReports: { $sum: '$reports' }
      }
    }
  ]);
  
  const result = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    spam: 0,
    totalLikes: 0,
    totalDislikes: 0,
    totalReports: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
    result.totalLikes += stat.totalLikes;
    result.totalDislikes += stat.totalDislikes;
    result.totalReports += stat.totalReports;
  });
  
  return result;
};

// Static method to get recent comments
commentSchema.statics.getRecentComments = async function(limit = 10, status = 'approved') {
  return await this.find({ status })
    .populate('postId', 'title slug')
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('author content createdAt postId');
};

// Static method to get pending comments for moderation
commentSchema.statics.getPendingComments = async function(limit = 20) {
  return await this.find({ status: 'pending' })
    .populate('postId', 'title slug')
    .sort({ createdAt: 1 })
    .limit(limit)
    .select('author content createdAt postId metadata.spamScore');
};

// Static method to get comment analytics
commentSchema.statics.getCommentAnalytics = async function(timeframe = '30d') {
  const timeFilter = getTimeFilter(timeframe);
  
  return await this.aggregate([
    { $match: timeFilter },
    {
      $group: {
        _id: {
          status: '$status',
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          }
        },
        count: { $sum: 1 },
        totalLikes: { $sum: '$likes' },
        totalDislikes: { $sum: '$dislikes' }
      }
    },
    {
      $group: {
        _id: '$_id.status',
        total: { $sum: '$count' },
        dailyData: {
          $push: {
            date: '$_id.date',
            count: '$count',
            likes: '$totalLikes',
            dislikes: '$totalDislikes'
          }
        }
      }
    }
  ]);
};

// Instance method to approve comment
commentSchema.methods.approve = function(moderatedBy = null) {
  this.status = 'approved';
  this.approvedAt = new Date();
  if (moderatedBy) {
    this.moderation.moderatedBy = moderatedBy;
    this.moderation.moderatedAt = new Date();
  }
  return this.save();
};

// Instance method to reject comment
commentSchema.methods.reject = function(reason, moderatedBy = null) {
  this.status = 'rejected';
  if (moderatedBy) {
    this.moderation.moderatedBy = moderatedBy;
    this.moderation.moderatedAt = new Date();
    this.moderation.moderationReason = reason;
  }
  return this.save();
};

// Instance method to mark as spam
commentSchema.methods.markAsSpam = function(reason = 'Detected as spam', moderatedBy = null) {
  this.status = 'spam';
  if (moderatedBy) {
    this.moderation.moderatedBy = moderatedBy;
    this.moderation.moderatedAt = new Date();
    this.moderation.moderationReason = reason;
  }
  return this.save();
};

// Instance method to like comment
commentSchema.methods.like = function() {
  this.likes += 1;
  return this.save();
};

// Instance method to dislike comment
commentSchema.methods.dislike = function() {
  this.dislikes += 1;
  return this.save();
};

// Instance method to report comment
commentSchema.methods.report = function() {
  this.reports += 1;
  return this.save();
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

module.exports = mongoose.model('Comment', commentSchema);
