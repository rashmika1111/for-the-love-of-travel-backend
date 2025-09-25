const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  color: {
    type: String,
    trim: true,
    match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code'],
    default: '#3B82F6'
  },
  icon: {
    type: String,
    trim: true,
    maxlength: [50, 'Icon name cannot exceed 50 characters']
  },
  image: {
    url: {
      type: String,
      trim: true
    },
    alt: {
      type: String,
      trim: true,
      maxlength: [200, 'Alt text cannot exceed 200 characters']
    }
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  path: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
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
  postCount: {
    type: Number,
    default: 0
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
categorySchema.index({ slug: 1 });
categorySchema.index({ name: 1 });
categorySchema.index({ parent: 1, level: 1 });
categorySchema.index({ isActive: 1, sortOrder: 1 });
categorySchema.index({ isFeatured: 1, isActive: 1 });
categorySchema.index({ path: 1 });
categorySchema.index({ createdAt: -1 });

// Text search index
categorySchema.index({
  name: 'text',
  description: 'text',
  'seo.keywords': 'text'
});

// Virtual for category URL
categorySchema.virtual('url').get(function() {
  return `/category/${this.slug}`;
});

// Virtual for full path with parent names
categorySchema.virtual('fullPath').get(function() {
  return this.path.split('/').filter(Boolean);
});

// Virtual for children count
categorySchema.virtual('childrenCount', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent',
  count: true
});

// Pre-save middleware
categorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Generate slug from name if not provided
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, { 
      lower: true, 
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
  
  // Calculate level and path based on parent
  if (this.isModified('parent')) {
    this.calculateLevelAndPath();
  }
  
  next();
});

// Post-save middleware to update parent's children count
categorySchema.post('save', async function() {
  if (this.isModified('parent')) {
    await this.updateParentChildrenCount();
  }
});

// Method to calculate level and path
categorySchema.methods.calculateLevelAndPath = async function() {
  if (!this.parent) {
    this.level = 0;
    this.path = this.slug;
  } else {
    const parent = await this.constructor.findById(this.parent);
    if (parent) {
      this.level = parent.level + 1;
      this.path = `${parent.path}/${this.slug}`;
    }
  }
};

// Method to update parent's children count
categorySchema.methods.updateParentChildrenCount = async function() {
  if (this.parent) {
    const parent = await this.constructor.findById(this.parent);
    if (parent) {
      const childrenCount = await this.constructor.countDocuments({ parent: this.parent });
      parent.childrenCount = childrenCount;
      await parent.save();
    }
  }
};

// Static method to get active categories
categorySchema.statics.getActiveCategories = async function(options = {}) {
  const {
    includeInactive = false,
    includeChildren = true,
    sortBy = 'sortOrder',
    sortOrder = 'asc',
    limit = null
  } = options;
  
  const query = includeInactive ? {} : { isActive: true };
  
  if (!includeChildren) {
    query.parent = null;
  }
  
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  let queryBuilder = this.find(query).sort(sort);
  
  if (limit) {
    queryBuilder = queryBuilder.limit(limit);
  }
  
  return await queryBuilder.lean();
};

// Static method to get category tree
categorySchema.statics.getCategoryTree = async function() {
  const categories = await this.find({ isActive: true })
    .sort({ level: 1, sortOrder: 1 })
    .lean();
  
  return this.buildTree(categories);
};

// Static method to build category tree
categorySchema.statics.buildTree = function(categories, parentId = null) {
  const tree = [];
  
  categories.forEach(category => {
    if (String(category.parent) === String(parentId)) {
      const children = this.buildTree(categories, category._id);
      if (children.length > 0) {
        category.children = children;
      }
      tree.push(category);
    }
  });
  
  return tree;
};

// Static method to get featured categories
categorySchema.statics.getFeaturedCategories = async function(limit = 6) {
  return await this.find({
    isActive: true,
    isFeatured: true
  })
    .sort({ sortOrder: 1, name: 1 })
    .limit(limit)
    .lean();
};

// Static method to get categories with post counts
categorySchema.statics.getCategoriesWithPostCounts = async function() {
  const Post = mongoose.model('Post');
  
  return await this.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'categories',
        as: 'posts'
      }
    },
    {
      $addFields: {
        postCount: {
          $size: {
            $filter: {
              input: '$posts',
              cond: { $eq: ['$$this.status', 'published'] }
            }
          }
        }
      }
    },
    {
      $project: {
        name: 1,
        slug: 1,
        description: 1,
        color: 1,
        icon: 1,
        image: 1,
        parent: 1,
        level: 1,
        path: 1,
        isFeatured: 1,
        sortOrder: 1,
        postCount: 1,
        createdAt: 1
      }
    },
    { $sort: { sortOrder: 1, name: 1 } }
  ]);
};

// Static method to search categories
categorySchema.statics.searchCategories = async function(searchQuery, options = {}) {
  const {
    includeInactive = false,
    limit = 20
  } = options;
  
  const query = {
    $text: { $search: searchQuery },
    ...(includeInactive ? {} : { isActive: true })
  };
  
  return await this.find(query)
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean();
};

// Static method to get category statistics
categorySchema.statics.getCategoryStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: {
          isActive: '$isActive',
          level: '$level'
        },
        count: { $sum: 1 },
        totalPosts: { $sum: '$postCount' }
      }
    }
  ]);
  
  const result = {
    total: 0,
    active: 0,
    inactive: 0,
    level0: 0,
    level1: 0,
    level2: 0,
    level3: 0,
    totalPosts: 0
  };
  
  stats.forEach(stat => {
    result.total += stat.count;
    result.totalPosts += stat.totalPosts;
    
    if (stat._id.isActive) {
      result.active += stat.count;
    } else {
      result.inactive += stat.count;
    }
    
    if (stat._id.level === 0) result.level0 += stat.count;
    if (stat._id.level === 1) result.level1 += stat.count;
    if (stat._id.level === 2) result.level2 += stat.count;
    if (stat._id.level === 3) result.level3 += stat.count;
  });
  
  return result;
};

// Static method to get category breadcrumb
categorySchema.statics.getCategoryBreadcrumb = async function(categoryId) {
  const category = await this.findById(categoryId);
  if (!category) return [];
  
  const breadcrumb = [];
  const pathParts = category.path.split('/');
  
  for (let i = 0; i < pathParts.length; i++) {
    const path = pathParts.slice(0, i + 1).join('/');
    const cat = await this.findOne({ path });
    if (cat) {
      breadcrumb.push({
        name: cat.name,
        slug: cat.slug,
        url: `/category/${cat.slug}`,
        position: i + 1
      });
    }
  }
  
  return breadcrumb;
};

// Instance method to update post count
categorySchema.methods.updatePostCount = async function() {
  const Post = mongoose.model('Post');
  const count = await Post.countDocuments({
    categories: this._id,
    status: 'published'
  });
  this.postCount = count;
  return this.save();
};

// Instance method to get children
categorySchema.methods.getChildren = async function() {
  return await this.constructor.find({
    parent: this._id,
    isActive: true
  }).sort({ sortOrder: 1, name: 1 });
};

// Instance method to get parent
categorySchema.methods.getParent = async function() {
  if (!this.parent) return null;
  return await this.constructor.findById(this.parent);
};

// Instance method to get siblings
categorySchema.methods.getSiblings = async function() {
  return await this.constructor.find({
    parent: this.parent,
    _id: { $ne: this._id },
    isActive: true
  }).sort({ sortOrder: 1, name: 1 });
};

// Instance method to deactivate
categorySchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Instance method to activate
categorySchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

module.exports = mongoose.model('Category', categorySchema);
