const mongoose = require('mongoose');
const slugify = require('slugify');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    trim: true
  },
  excerpt: {
    type: String,
    required: [true, 'Post excerpt is required'],
    trim: true,
    maxlength: [500, 'Excerpt cannot exceed 500 characters']
  },
  featuredImage: {
    url: {
      type: String,
      required: [true, 'Featured image URL is required'],
      trim: true
    },
    alt: {
      type: String,
      trim: true,
      maxlength: [200, 'Alt text cannot exceed 200 characters']
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [300, 'Caption cannot exceed 300 characters']
    },
    width: Number,
    height: Number
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'At least one category is required']
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Author',
    required: [true, 'Author is required']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'scheduled'],
    default: 'draft'
  },
  publishedAt: {
    type: Date,
    default: null
  },
  scheduledAt: {
    type: Date,
    default: null
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
    }],
    canonicalUrl: {
      type: String,
      trim: true
    },
    noIndex: {
      type: Boolean,
      default: false
    },
    noFollow: {
      type: Boolean,
      default: false
    }
  },
  contentSections: [{
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'gallery', 'quote', 'code', 'hero', 'testimonial'],
      required: true
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    order: {
      type: Number,
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  breadcrumb: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    position: {
      type: Number,
      required: true
    }
  }],
  readingTime: {
    type: Number, // in minutes
    default: 0
  },
  wordCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  commentCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  allowSharing: {
    type: Boolean,
    default: true
  },
  socialSharing: {
    facebook: { type: Boolean, default: true },
    twitter: { type: Boolean, default: true },
    linkedin: { type: Boolean, default: true },
    pinterest: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: true }
  },
  relatedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  version: {
    type: Number,
    default: 1
  },
  previousVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  metadata: {
    source: {
      type: String,
      enum: ['admin_panel', 'api', 'import', 'migration'],
      default: 'admin_panel'
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modificationReason: String,
    ip: String,
    userAgent: String
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
postSchema.index({ slug: 1 });
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ author: 1, status: 1 });
postSchema.index({ categories: 1, status: 1 });
postSchema.index({ tags: 1, status: 1 });
postSchema.index({ publishedAt: -1 });
postSchema.index({ viewCount: -1 });
postSchema.index({ likeCount: -1 });
postSchema.index({ isPinned: 1, publishedAt: -1 });
postSchema.index({ isFeatured: 1, publishedAt: -1 });
postSchema.index({ 'seo.keywords': 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ updatedAt: -1 });

// Text search index
postSchema.index({
  title: 'text',
  content: 'text',
  excerpt: 'text',
  'seo.keywords': 'text',
  tags: 'text'
});

// Virtual for formatted published date
postSchema.virtual('formattedPublishedDate').get(function() {
  if (!this.publishedAt) return null;
  return this.publishedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for reading time in text format
postSchema.virtual('readingTimeText').get(function() {
  if (this.readingTime === 0) return 'Less than 1 min read';
  if (this.readingTime === 1) return '1 min read';
  return `${this.readingTime} mins read`;
});

// Virtual for post URL
postSchema.virtual('url').get(function() {
  return `/content/${this.slug}`;
});

// Pre-save middleware
postSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Generate slug from title if not provided
  if (this.isModified('title') && !this.slug) {
    this.slug = slugify(this.title, { 
      lower: true, 
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Calculate reading time and word count
  if (this.isModified('content')) {
    this.wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(this.wordCount / 200); // Assuming 200 words per minute
  }
  
  // Set scheduledAt when status is scheduled
  if (this.isModified('status') && this.status === 'scheduled' && !this.scheduledAt) {
    this.scheduledAt = this.publishedAt || new Date();
  }
  
  next();
});

// Post-save middleware to update version
postSchema.post('save', function() {
  if (this.isModified('content') || this.isModified('title')) {
    this.version += 1;
    this.save();
  }
});

// Static method to get published posts
postSchema.statics.getPublishedPosts = async function(options = {}) {
  const {
    limit = 10,
    skip = 0,
    sortBy = 'publishedAt',
    sortOrder = 'desc',
    category = null,
    tag = null,
    author = null,
    search = null
  } = options;
  
  const query = { status: 'published' };
  
  if (category) {
    query.categories = category;
  }
  
  if (tag) {
    query.tags = tag;
  }
  
  if (author) {
    query.author = author;
  }
  
  if (search) {
    query.$text = { $search: search };
  }
  
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  return await this.find(query)
    .populate('author', 'name email bio avatar')
    .populate('categories', 'name slug description')
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .lean();
};

// Static method to get popular posts
postSchema.statics.getPopularPosts = async function(limit = 10, timeframe = '30d') {
  const timeFilter = getTimeFilter(timeframe);
  
  return await this.find({ 
    status: 'published',
    publishedAt: timeFilter.publishedAt
  })
    .populate('author', 'name email bio avatar')
    .populate('categories', 'name slug description')
    .sort({ viewCount: -1, likeCount: -1 })
    .limit(limit)
    .lean();
};

// Static method to get related posts
postSchema.statics.getRelatedPosts = async function(postId, limit = 5) {
  const post = await this.findById(postId).select('categories tags');
  if (!post) return [];
  
  return await this.find({
    _id: { $ne: postId },
    status: 'published',
    $or: [
      { categories: { $in: post.categories } },
      { tags: { $in: post.tags } }
    ]
  })
    .populate('author', 'name email bio avatar')
    .populate('categories', 'name slug description')
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to get posts by category
postSchema.statics.getPostsByCategory = async function(categorySlug, options = {}) {
  const category = await mongoose.model('Category').findOne({ slug: categorySlug });
  if (!category) return [];
  
  return await this.getPublishedPosts({
    ...options,
    category: category._id
  });
};

// Static method to get posts by tag
postSchema.statics.getPostsByTag = async function(tag, options = {}) {
  return await this.getPublishedPosts({
    ...options,
    tag
  });
};

// Static method to search posts
postSchema.statics.searchPosts = async function(searchQuery, options = {}) {
  return await this.getPublishedPosts({
    ...options,
    search: searchQuery
  });
};

// Static method to get post statistics
postSchema.statics.getPostStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalViews: { $sum: '$viewCount' },
        totalLikes: { $sum: '$likeCount' },
        totalComments: { $sum: '$commentCount' }
      }
    }
  ]);
  
  const result = {
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
    scheduled: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
    result.totalViews += stat.totalViews;
    result.totalLikes += stat.totalLikes;
    result.totalComments += stat.totalComments;
  });
  
  return result;
};

// Static method to get recent posts
postSchema.statics.getRecentPosts = async function(limit = 10) {
  return await this.getPublishedPosts({ limit, sortBy: 'publishedAt' });
};

// Static method to get featured posts
postSchema.statics.getFeaturedPosts = async function(limit = 5) {
  return await this.find({
    status: 'published',
    isFeatured: true
  })
    .populate('author', 'name email bio avatar')
    .populate('categories', 'name slug description')
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to get pinned posts
postSchema.statics.getPinnedPosts = async function(limit = 3) {
  return await this.find({
    status: 'published',
    isPinned: true
  })
    .populate('author', 'name email bio avatar')
    .populate('categories', 'name slug description')
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();
};

// Instance method to increment view count
postSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Instance method to like post
postSchema.methods.like = function() {
  this.likeCount += 1;
  return this.save();
};

// Instance method to unlike post
postSchema.methods.unlike = function() {
  if (this.likeCount > 0) {
    this.likeCount -= 1;
  }
  return this.save();
};

// Instance method to share post
postSchema.methods.share = function() {
  this.shareCount += 1;
  return this.save();
};

// Instance method to update comment count
postSchema.methods.updateCommentCount = async function() {
  const Comment = mongoose.model('Comment');
  const count = await Comment.countDocuments({ 
    postId: this._id, 
    status: 'approved' 
  });
  this.commentCount = count;
  return this.save();
};

// Instance method to generate excerpt from content
postSchema.methods.generateExcerpt = function(length = 160) {
  if (this.excerpt) return this.excerpt;
  
  const plainText = this.content.replace(/<[^>]*>/g, ''); // Remove HTML tags
  return plainText.length > length 
    ? plainText.substring(0, length) + '...'
    : plainText;
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
  
  return { publishedAt: { $gte: startDate } };
}

module.exports = mongoose.model('Post', postSchema);
