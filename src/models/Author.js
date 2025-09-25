const mongoose = require('mongoose');
const slugify = require('slugify');

const authorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [1000, 'Bio cannot exceed 1000 characters']
  },
  shortBio: {
    type: String,
    trim: true,
    maxlength: [200, 'Short bio cannot exceed 200 characters']
  },
  avatar: {
    url: {
      type: String,
      trim: true
    },
    alt: {
      type: String,
      trim: true,
      maxlength: [200, 'Alt text cannot exceed 200 characters']
    },
    width: Number,
    height: Number
  },
  coverImage: {
    url: {
      type: String,
      trim: true
    },
    alt: {
      type: String,
      trim: true,
      maxlength: [200, 'Alt text cannot exceed 200 characters']
    },
    width: Number,
    height: Number
  },
  socialLinks: {
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Website must be a valid URL']
    },
    twitter: {
      type: String,
      trim: true,
      match: [/^@?[A-Za-z0-9_]+$/, 'Twitter handle must be valid']
    },
    facebook: {
      type: String,
      trim: true,
      match: [/^[A-Za-z0-9.]+$/, 'Facebook username must be valid']
    },
    instagram: {
      type: String,
      trim: true,
      match: [/^[A-Za-z0-9._]+$/, 'Instagram username must be valid']
    },
    linkedin: {
      type: String,
      trim: true,
      match: [/^[A-Za-z0-9-]+$/, 'LinkedIn username must be valid']
    },
    youtube: {
      type: String,
      trim: true,
      match: [/^[A-Za-z0-9_-]+$/, 'YouTube channel ID must be valid']
    },
    tiktok: {
      type: String,
      trim: true,
      match: [/^[A-Za-z0-9._]+$/, 'TikTok username must be valid']
    }
  },
  expertise: [{
    type: String,
    trim: true,
    maxlength: [50, 'Expertise item cannot exceed 50 characters']
  }],
  specializations: [{
    type: String,
    trim: true,
    maxlength: [50, 'Specialization cannot exceed 50 characters']
  }],
  languages: [{
    type: String,
    trim: true,
    maxlength: [20, 'Language cannot exceed 20 characters']
  }],
  location: {
    city: {
      type: String,
      trim: true,
      maxlength: [50, 'City cannot exceed 50 characters']
    },
    country: {
      type: String,
      trim: true,
      maxlength: [50, 'Country cannot exceed 50 characters']
    },
    timezone: {
      type: String,
      trim: true,
      maxlength: [50, 'Timezone cannot exceed 50 characters']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['author', 'editor', 'admin', 'contributor', 'guest'],
    default: 'author'
  },
  permissions: {
    canPublish: {
      type: Boolean,
      default: false
    },
    canEdit: {
      type: Boolean,
      default: true
    },
    canDelete: {
      type: Boolean,
      default: false
    },
    canModerate: {
      type: Boolean,
      default: false
    }
  },
  stats: {
    postCount: {
      type: Number,
      default: 0
    },
    publishedPostCount: {
      type: Number,
      default: 0
    },
    draftPostCount: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    totalLikes: {
      type: Number,
      default: 0
    },
    totalComments: {
      type: Number,
      default: 0
    },
    totalShares: {
      type: Number,
      default: 0
    },
    averageReadingTime: {
      type: Number,
      default: 0
    }
  },
  seo: {
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [60, 'Meta title cannot exceed 60 characters']
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, 'Meta description cannot exceed 160 characters']
    },
    keywords: [{
      type: String,
      trim: true,
      lowercase: true
    }]
  },
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    commentNotifications: {
      type: Boolean,
      default: true
    },
    postNotifications: {
      type: Boolean,
      default: true
    },
    newsletter: {
      type: Boolean,
      default: true
    }
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ip: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['admin_panel', 'api', 'import', 'registration'],
      default: 'admin_panel'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
authorSchema.index({ slug: 1 });
authorSchema.index({ email: 1 });
authorSchema.index({ name: 1 });
authorSchema.index({ isActive: 1, isFeatured: 1 });
authorSchema.index({ role: 1, isActive: 1 });
authorSchema.index({ 'stats.postCount': -1 });
authorSchema.index({ 'stats.totalViews': -1 });
authorSchema.index({ joinedAt: -1 });
authorSchema.index({ lastActiveAt: -1 });

// Text search index
authorSchema.index({
  name: 'text',
  bio: 'text',
  shortBio: 'text',
  expertise: 'text',
  specializations: 'text',
  'seo.keywords': 'text'
});

// Virtual for author URL
authorSchema.virtual('url').get(function() {
  return `/author/${this.slug}`;
});

// Virtual for full name with title
authorSchema.virtual('displayName').get(function() {
  return this.name;
});

// Virtual for formatted join date
authorSchema.virtual('formattedJoinDate').get(function() {
  return this.joinedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for formatted last active date
authorSchema.virtual('formattedLastActive').get(function() {
  return this.lastActiveAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Pre-save middleware
authorSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Generate slug from name if not provided
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, { 
      lower: true, 
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
  
  // Generate short bio from bio if not provided
  if (this.isModified('bio') && !this.shortBio && this.bio) {
    this.shortBio = this.bio.length > 200 
      ? this.bio.substring(0, 200) + '...'
      : this.bio;
  }
  
  // Update last active timestamp
  if (this.isModified('lastActiveAt') || this.isNew) {
    this.lastActiveAt = new Date();
  }
  
  next();
});

// Static method to get active authors
authorSchema.statics.getActiveAuthors = async function(options = {}) {
  const {
    role = null,
    featured = null,
    sortBy = 'name',
    sortOrder = 'asc',
    limit = null,
    search = null
  } = options;
  
  const query = { isActive: true };
  
  if (role) {
    query.role = role;
  }
  
  if (featured !== null && featured !== undefined) {
    query.isFeatured = featured;
  }
  
  if (search) {
    query.$text = { $search: search };
  }
  
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  let queryBuilder = this.find(query).sort(sort);
  
  if (limit) {
    queryBuilder = queryBuilder.limit(limit);
  }
  
  return await queryBuilder.lean();
};

// Static method to get featured authors
authorSchema.statics.getFeaturedAuthors = async function(limit = 6) {
  return await this.find({
    isActive: true,
    isFeatured: true
  })
    .sort({ 'stats.postCount': -1, name: 1 })
    .limit(limit)
    .lean();
};

// Static method to get top authors by posts
authorSchema.statics.getTopAuthorsByPosts = async function(limit = 10) {
  return await this.find({ isActive: true })
    .sort({ 'stats.publishedPostCount': -1, name: 1 })
    .limit(limit)
    .lean();
};

// Static method to get top authors by views
authorSchema.statics.getTopAuthorsByViews = async function(limit = 10) {
  return await this.find({ isActive: true })
    .sort({ 'stats.totalViews': -1, name: 1 })
    .limit(limit)
    .lean();
};

// Static method to search authors
authorSchema.statics.searchAuthors = async function(searchQuery, options = {}) {
  const {
    limit = 20,
    role = null,
    active = true
  } = options;
  
  const query = {
    $text: { $search: searchQuery },
    ...(active ? { isActive: true } : {}),
    ...(role ? { role } : {})
  };
  
  return await this.find(query)
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean();
};

// Static method to get author statistics
authorSchema.statics.getAuthorStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: {
          isActive: '$isActive',
          role: '$role'
        },
        count: { $sum: 1 },
        totalPosts: { $sum: '$stats.publishedPostCount' },
        totalViews: { $sum: '$stats.totalViews' }
      }
    }
  ]);
  
  const result = {
    total: 0,
    active: 0,
    inactive: 0,
    authors: 0,
    editors: 0,
    admins: 0,
    contributors: 0,
    guests: 0,
    totalPosts: 0,
    totalViews: 0
  };
  
  stats.forEach(stat => {
    result.total += stat.count;
    result.totalPosts += stat.totalPosts;
    result.totalViews += stat.totalViews;
    
    if (stat._id.isActive) {
      result.active += stat.count;
    } else {
      result.inactive += stat.count;
    }
    
    if (stat._id.role === 'author') result.authors += stat.count;
    if (stat._id.role === 'editor') result.editors += stat.count;
    if (stat._id.role === 'admin') result.admins += stat.count;
    if (stat._id.role === 'contributor') result.contributors += stat.count;
    if (stat._id.role === 'guest') result.guests += stat.count;
  });
  
  return result;
};

// Static method to get recent authors
authorSchema.statics.getRecentAuthors = async function(limit = 10) {
  return await this.find({ isActive: true })
    .sort({ joinedAt: -1 })
    .limit(limit)
    .lean();
};

// Instance method to update post count
authorSchema.methods.updatePostCount = async function() {
  const Post = mongoose.model('Post');
  
  const stats = await Post.aggregate([
    { $match: { author: this._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalViews: { $sum: '$viewCount' },
        totalLikes: { $sum: '$likeCount' },
        totalComments: { $sum: '$commentCount' },
        totalShares: { $sum: '$shareCount' },
        avgReadingTime: { $avg: '$readingTime' }
      }
    }
  ]);
  
  this.stats.postCount = 0;
  this.stats.publishedPostCount = 0;
  this.stats.draftPostCount = 0;
  this.stats.totalViews = 0;
  this.stats.totalLikes = 0;
  this.stats.totalComments = 0;
  this.stats.totalShares = 0;
  this.stats.averageReadingTime = 0;
  
  stats.forEach(stat => {
    this.stats.postCount += stat.count;
    this.stats.totalViews += stat.totalViews;
    this.stats.totalLikes += stat.totalLikes;
    this.stats.totalComments += stat.totalComments;
    this.stats.totalShares += stat.totalShares;
    
    if (stat._id === 'published') {
      this.stats.publishedPostCount = stat.count;
    } else if (stat._id === 'draft') {
      this.stats.draftPostCount = stat.count;
    }
  });
  
  if (this.stats.publishedPostCount > 0) {
    this.stats.averageReadingTime = Math.round(
      stats.reduce((sum, stat) => sum + (stat.avgReadingTime || 0), 0) / 
      stats.filter(stat => stat.avgReadingTime).length
    );
  }
  
  return this.save();
};

// Instance method to get recent posts
authorSchema.methods.getRecentPosts = async function(limit = 10) {
  const Post = mongoose.model('Post');
  return await Post.find({
    author: this._id,
    status: 'published'
  })
    .populate('categories', 'name slug')
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();
};

// Instance method to get popular posts
authorSchema.methods.getPopularPosts = async function(limit = 5) {
  const Post = mongoose.model('Post');
  return await Post.find({
    author: this._id,
    status: 'published'
  })
    .populate('categories', 'name slug')
    .sort({ viewCount: -1, likeCount: -1 })
    .limit(limit)
    .lean();
};

// Instance method to update last active
authorSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

// Instance method to deactivate
authorSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Instance method to activate
authorSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

// Instance method to verify
authorSchema.methods.verify = function() {
  this.isVerified = true;
  return this.save();
};

// Instance method to unverify
authorSchema.methods.unverify = function() {
  this.isVerified = false;
  return this.save();
};

module.exports = mongoose.model('Author', authorSchema);
