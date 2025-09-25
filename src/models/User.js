const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
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
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'editor', 'author', 'moderator', 'user'],
    default: 'user'
  },
  permissions: {
    // Content permissions
    canCreatePosts: {
      type: Boolean,
      default: false
    },
    canEditPosts: {
      type: Boolean,
      default: false
    },
    canDeletePosts: {
      type: Boolean,
      default: false
    },
    canPublishPosts: {
      type: Boolean,
      default: false
    },
    canManageCategories: {
      type: Boolean,
      default: false
    },
    canManageTags: {
      type: Boolean,
      default: false
    },
    canManageAuthors: {
      type: Boolean,
      default: false
    },
    canManageUsers: {
      type: Boolean,
      default: false
    },
    canModerateComments: {
      type: Boolean,
      default: false
    },
    canViewAnalytics: {
      type: Boolean,
      default: false
    },
    canManageSettings: {
      type: Boolean,
      default: false
    },
    canManageMedia: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  lastLoginIP: {
    type: String,
    trim: true
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en',
      maxlength: [5, 'Language code cannot exceed 5 characters']
    },
    timezone: {
      type: String,
      default: 'UTC',
      maxlength: [50, 'Timezone cannot exceed 50 characters']
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    newsletter: {
      type: Boolean,
      default: true
    }
  },
  profile: {
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Website must be a valid URL']
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters']
    },
    socialLinks: {
      twitter: {
        type: String,
        trim: true,
        match: [/^@?[A-Za-z0-9_]+$/, 'Twitter handle must be valid']
      },
      linkedin: {
        type: String,
        trim: true,
        match: [/^[A-Za-z0-9-]+$/, 'LinkedIn username must be valid']
      },
      github: {
        type: String,
        trim: true,
        match: [/^[A-Za-z0-9-]+$/, 'GitHub username must be valid']
      }
    }
  },
  stats: {
    loginCount: {
      type: Number,
      default: 0
    },
    postsCreated: {
      type: Number,
      default: 0
    },
    postsPublished: {
      type: Number,
      default: 0
    },
    commentsModerated: {
      type: Number,
      default: 0
    }
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
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ isEmailVerified: 1 });
userSchema.index({ lastLoginAt: -1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  return this.fullName || this.username;
});

// Virtual for account locked status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for formatted join date
userSchema.virtual('formattedJoinDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for formatted last login
userSchema.virtual('formattedLastLogin').get(function() {
  if (!this.lastLoginAt) return 'Never';
  return this.lastLoginAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  this.updatedAt = new Date();
  
  // Hash password if it's been modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  // Set permissions based on role
  if (this.isModified('role')) {
    this.setPermissionsByRole();
  }
  
  next();
});

// Method to set permissions based on role
userSchema.methods.setPermissionsByRole = function() {
  const rolePermissions = {
    super_admin: {
      canCreatePosts: true,
      canEditPosts: true,
      canDeletePosts: true,
      canPublishPosts: true,
      canManageCategories: true,
      canManageTags: true,
      canManageAuthors: true,
      canManageUsers: true,
      canModerateComments: true,
      canViewAnalytics: true,
      canManageSettings: true,
      canManageMedia: true
    },
    admin: {
      canCreatePosts: true,
      canEditPosts: true,
      canDeletePosts: true,
      canPublishPosts: true,
      canManageCategories: true,
      canManageTags: true,
      canManageAuthors: true,
      canManageUsers: false,
      canModerateComments: true,
      canViewAnalytics: true,
      canManageSettings: false,
      canManageMedia: true
    },
    editor: {
      canCreatePosts: true,
      canEditPosts: true,
      canDeletePosts: false,
      canPublishPosts: true,
      canManageCategories: true,
      canManageTags: true,
      canManageAuthors: false,
      canManageUsers: false,
      canModerateComments: true,
      canViewAnalytics: true,
      canManageSettings: false,
      canManageMedia: true
    },
    author: {
      canCreatePosts: true,
      canEditPosts: true,
      canDeletePosts: false,
      canPublishPosts: false,
      canManageCategories: false,
      canManageTags: false,
      canManageAuthors: false,
      canManageUsers: false,
      canModerateComments: false,
      canViewAnalytics: false,
      canManageSettings: false,
      canManageMedia: false
    },
    moderator: {
      canCreatePosts: false,
      canEditPosts: false,
      canDeletePosts: false,
      canPublishPosts: false,
      canManageCategories: false,
      canManageTags: false,
      canManageAuthors: false,
      canManageUsers: false,
      canModerateComments: true,
      canViewAnalytics: false,
      canManageSettings: false,
      canManageMedia: false
    },
    user: {
      canCreatePosts: false,
      canEditPosts: false,
      canDeletePosts: false,
      canPublishPosts: false,
      canManageCategories: false,
      canManageTags: false,
      canManageAuthors: false,
      canManageUsers: false,
      canModerateComments: false,
      canViewAnalytics: false,
      canManageSettings: false,
      canManageMedia: false
    }
  };
  
  const permissions = rolePermissions[this.role] || rolePermissions.user;
  Object.assign(this.permissions, permissions);
};

// Method to check if user has permission
userSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] === true;
};

// Method to check if user has any of the permissions
userSchema.methods.hasAnyPermission = function(permissions) {
  return permissions.some(permission => this.hasPermission(permission));
};

// Method to check if user has all permissions
userSchema.methods.hasAllPermissions = function(permissions) {
  return permissions.every(permission => this.hasPermission(permission));
};

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  const payload = {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    permissions: this.permissions
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const token = jwt.sign(
    { id: this._id, type: 'email_verification' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  this.emailVerificationToken = token;
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return token;
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const token = jwt.sign(
    { id: this._id, type: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  this.passwordResetToken = token;
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  
  return token;
};

// Method to handle failed login attempt
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to update last login
userSchema.methods.updateLastLogin = function(ip) {
  this.lastLoginAt = new Date();
  this.lastLoginIP = ip;
  this.loginAttempts = 0;
  this.lockUntil = null;
  this.stats.loginCount += 1;
  return this.save();
};

// Method to verify email
userSchema.methods.verifyEmail = function() {
  this.isEmailVerified = true;
  this.emailVerificationToken = undefined;
  this.emailVerificationExpires = undefined;
  return this.save();
};

// Method to deactivate account
userSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Method to activate account
userSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

// Static method to find by credentials
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ email, isActive: true }).select('+password');
  
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  if (user.isLocked) {
    throw new Error('Account is locked due to too many failed login attempts');
  }
  
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    await user.incLoginAttempts();
    throw new Error('Invalid credentials');
  }
  
  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }
  
  return user;
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: {
          role: '$role',
          isActive: '$isActive',
          isEmailVerified: '$isEmailVerified'
        },
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    total: 0,
    active: 0,
    inactive: 0,
    verified: 0,
    unverified: 0,
    superAdmins: 0,
    admins: 0,
    editors: 0,
    authors: 0,
    moderators: 0,
    users: 0
  };
  
  stats.forEach(stat => {
    result.total += stat.count;
    
    if (stat._id.isActive) {
      result.active += stat.count;
    } else {
      result.inactive += stat.count;
    }
    
    if (stat._id.isEmailVerified) {
      result.verified += stat.count;
    } else {
      result.unverified += stat.count;
    }
    
    if (stat._id.role === 'super_admin') result.superAdmins += stat.count;
    if (stat._id.role === 'admin') result.admins += stat.count;
    if (stat._id.role === 'editor') result.editors += stat.count;
    if (stat._id.role === 'author') result.authors += stat.count;
    if (stat._id.role === 'moderator') result.moderators += stat.count;
    if (stat._id.role === 'user') result.users += stat.count;
  });
  
  return result;
};

// Static method to get recent users
userSchema.statics.getRecentUsers = async function(limit = 10) {
  return await this.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('username email firstName lastName role createdAt')
    .lean();
};

// Static method to search users
userSchema.statics.searchUsers = async function(searchQuery, options = {}) {
  const {
    limit = 20,
    role = null,
    active = true
  } = options;
  
  const query = {
    $or: [
      { username: { $regex: searchQuery, $options: 'i' } },
      { email: { $regex: searchQuery, $options: 'i' } },
      { firstName: { $regex: searchQuery, $options: 'i' } },
      { lastName: { $regex: searchQuery, $options: 'i' } }
    ],
    ...(active ? { isActive: true } : {}),
    ...(role ? { role } : {})
  };
  
  return await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('username email firstName lastName role isActive createdAt')
    .lean();
};

module.exports = mongoose.model('User', userSchema);
