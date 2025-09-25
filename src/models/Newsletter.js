const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  status: {
    type: String,
    enum: ['active', 'unsubscribed', 'bounced', 'complained'],
    default: 'active'
  },
  source: {
    type: String,
    enum: ['website', 'popup', 'footer', 'admin', 'import'],
    default: 'website'
  },
  preferences: {
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly'],
      default: 'weekly'
    },
    categories: [{
      type: String,
      enum: ['destinations', 'travel-tips', 'deals', 'news', 'all']
    }],
    language: {
      type: String,
      default: 'en'
    }
  },
  metadata: {
    ip: String,
    userAgent: String,
    referrer: String,
    utm_source: String,
    utm_medium: String,
    utm_campaign: String,
    utm_term: String,
    utm_content: String
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  unsubscribedAt: {
    type: Date
  },
  lastEmailSent: {
    type: Date
  },
  emailCount: {
    type: Number,
    default: 0
  },
  bounceCount: {
    type: Number,
    default: 0
  },
  complaintCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for better performance
newsletterSchema.index({ email: 1 });
newsletterSchema.index({ status: 1 });
newsletterSchema.index({ subscribedAt: -1 });
newsletterSchema.index({ 'preferences.frequency': 1 });
newsletterSchema.index({ 'preferences.categories': 1 });

// Virtual for subscription duration
newsletterSchema.virtual('subscriptionDuration').get(function() {
  if (this.status === 'active') {
    return Math.floor((Date.now() - this.subscribedAt) / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for formatted subscription date
newsletterSchema.virtual('formattedSubscribedDate').get(function() {
  return this.subscribedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Pre-save middleware
newsletterSchema.pre('save', function(next) {
  // If status is being changed to unsubscribed, set unsubscribedAt
  if (this.isModified('status') && this.status === 'unsubscribed' && !this.unsubscribedAt) {
    this.unsubscribedAt = new Date();
  }
  
  // If status is being changed to active, clear unsubscribedAt
  if (this.isModified('status') && this.status === 'active' && this.unsubscribedAt) {
    this.unsubscribedAt = undefined;
  }
  
  next();
});

// Static method to get newsletter statistics
newsletterSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const totalSubscribers = await this.countDocuments({ status: 'active' });
  const totalUnsubscribed = await this.countDocuments({ status: 'unsubscribed' });
  const totalBounced = await this.countDocuments({ status: 'bounced' });
  
  return {
    total: totalSubscribers + totalUnsubscribed + totalBounced,
    active: totalSubscribers,
    unsubscribed: totalUnsubscribed,
    bounced: totalBounced,
    byStatus: stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {})
  };
};

// Static method to get subscribers by frequency
newsletterSchema.statics.getSubscribersByFrequency = async function() {
  return await this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$preferences.frequency',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to get recent subscribers
newsletterSchema.statics.getRecentSubscribers = async function(limit = 10) {
  return await this.find({ status: 'active' })
    .sort({ subscribedAt: -1 })
    .limit(limit)
    .select('email subscribedAt preferences.frequency');
};

// Instance method to unsubscribe
newsletterSchema.methods.unsubscribe = function(reason = null) {
  this.status = 'unsubscribed';
  this.unsubscribedAt = new Date();
  if (reason) {
    this.notes = reason;
  }
  return this.save();
};

// Instance method to resubscribe
newsletterSchema.methods.resubscribe = function() {
  this.status = 'active';
  this.unsubscribedAt = undefined;
  return this.save();
};

// Instance method to record email sent
newsletterSchema.methods.recordEmailSent = function() {
  this.lastEmailSent = new Date();
  this.emailCount += 1;
  return this.save();
};

// Instance method to record bounce
newsletterSchema.methods.recordBounce = function() {
  this.bounceCount += 1;
  if (this.bounceCount >= 3) {
    this.status = 'bounced';
  }
  return this.save();
};

// Instance method to record complaint
newsletterSchema.methods.recordComplaint = function() {
  this.complaintCount += 1;
  if (this.complaintCount >= 1) {
    this.status = 'complained';
  }
  return this.save();
};

module.exports = mongoose.model('Newsletter', newsletterSchema);
