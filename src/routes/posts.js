const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Category = require('../models/Category');
const Author = require('../models/Author');
const { HTTP_STATUS, ERROR_CODES } = require('../utils/constants');
const { cacheMiddlewares } = require('../middleware/cache');
const { generalLimiter } = require('../middleware/rateLimiter');
const { analyticsMiddleware } = require('../middleware/analytics');

// Apply rate limiting to all post routes
router.use(generalLimiter);

// Apply analytics tracking to all post routes
router.use(analyticsMiddleware.pageView);

// Get all published posts with advanced filtering
router.get('/',
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        tag,
        author,
        search,
        sortBy = 'publishedAt',
        sortOrder = 'desc',
        featured = null,
        pinned = null
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Build query
      const query = { status: 'published' };
      
      if (category) {
        const categoryDoc = await Category.findOne({ slug: category, isActive: true });
        if (categoryDoc) {
          query.categories = categoryDoc._id;
        }
      }
      
      if (tag) {
        query.tags = tag;
      }
      
      if (author) {
        const authorDoc = await Author.findOne({ slug: author, isActive: true });
        if (authorDoc) {
          query.author = authorDoc._id;
        }
      }
      
      if (search) {
        query.$text = { $search: search };
      }
      
      if (featured !== null) {
        query.isFeatured = featured === 'true';
      }
      
      if (pinned !== null) {
        query.isPinned = pinned === 'true';
      }
      
      // Build sort
      const sort = {};
      if (search && sortBy === 'publishedAt') {
        // For search results, sort by relevance first, then by date
        sort.score = { $meta: 'textScore' };
        sort.publishedAt = -1;
      } else {
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      }
      
      // Fetch posts
      const posts = await Post.find(query)
        .populate('author', 'name email bio avatar slug')
        .populate('categories', 'name slug description color')
        .sort(sort)
        .limit(parseInt(limit))
        .skip(offset)
        .lean();
      
      // Get total count
      const total = await Post.countDocuments(query);
      
      res.json({
        success: true,
        data: posts,
        meta: {
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
            hasNext: offset + parseInt(limit) < total,
            hasPrev: page > 1
          },
          filters: {
            category,
            tag,
            author,
            search,
            sortBy,
            sortOrder,
            featured,
            pinned
          },
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get posts error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch posts',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Get popular posts
router.get('/popular',
  cacheMiddlewares.popularPosts,
  async (req, res) => {
    try {
      const { 
        limit = 10, 
        timeframe = '30d' 
      } = req.query;
      
      const posts = await Post.getPopularPosts(parseInt(limit), timeframe);
      
      // Extract metadata for each post
      const postsWithMetadata = posts.map(post => ({
        _id: post._id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        featuredImage: post.featuredImage,
        author: post.author,
        categories: post.categories,
        tags: post.tags,
        publishedAt: post.publishedAt,
        metadata: {
          readTime: post.readingTime || 0,
          readTimeText: post.readingTime === 0 ? 'Less than 1 min read' : 
                       post.readingTime === 1 ? '1 min read' : 
                       `${post.readingTime} mins read`,
          wordCount: post.wordCount || 0,
          viewCount: post.viewCount || 0,
          likeCount: post.likeCount || 0,
          commentCount: post.commentCount || 0,
          shareCount: post.shareCount || 0,
          publishedDate: post.publishedAt ? post.publishedAt.toISOString() : null,
          formattedPublishedDate: post.publishedAt ? post.publishedAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : null,
          categoryNames: post.categories ? post.categories.map(cat => cat.name) : [],
          categorySlugs: post.categories ? post.categories.map(cat => cat.slug) : [],
          contentPreview: post.content ? post.content.substring(0, 200) + '...' : '',
          contentLength: post.content ? post.content.length : 0,
          isFeatured: post.isFeatured || false,
          isPinned: post.isPinned || false,
          allowComments: post.allowComments !== false,
          allowSharing: post.allowSharing !== false,
          popularityScore: (post.viewCount || 0) + (post.likeCount || 0) * 2 + (post.shareCount || 0) * 3,
          isHighEngagement: (post.viewCount || 0) > 100 || (post.likeCount || 0) > 100
        }
      }));
      
      res.json({
        success: true,
        data: postsWithMetadata,
        meta: {
          limit: parseInt(limit),
          timeframe,
          count: postsWithMetadata.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get popular posts error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch popular posts',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Get featured posts
router.get('/featured',
  async (req, res) => {
    try {
      const { limit = 5 } = req.query;
      const posts = await Post.getFeaturedPosts(parseInt(limit));
      
      res.json({
        success: true,
        data: posts,
        meta: {
          limit: parseInt(limit),
          count: posts.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get featured posts error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch featured posts',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Get pinned posts
router.get('/pinned',
  async (req, res) => {
    try {
      const { limit = 3 } = req.query;
      const posts = await Post.getPinnedPosts(parseInt(limit));
      
      res.json({
        success: true,
        data: posts,
        meta: {
          limit: parseInt(limit),
          count: posts.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get pinned posts error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch pinned posts',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Get recent posts
router.get('/recent',
  async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const posts = await Post.getRecentPosts(parseInt(limit));
      
      res.json({
        success: true,
        data: posts,
        meta: {
          limit: parseInt(limit),
          count: posts.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get recent posts error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch recent posts',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Get latest posts with metadata
router.get('/latest',
  async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      
      // Fetch latest posts with populated data
      const posts = await Post.find({ status: 'published' })
        .populate('author', 'name email bio avatar slug')
        .populate('categories', 'name slug description color')
        .sort({ publishedAt: -1 })
        .limit(parseInt(limit))
        .lean();
      
      // Extract metadata for each post
      const postsWithMetadata = posts.map(post => ({
        _id: post._id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        featuredImage: post.featuredImage,
        author: post.author,
        categories: post.categories,
        tags: post.tags,
        publishedAt: post.publishedAt,
        metadata: {
          readTime: post.readingTime || 0,
          readTimeText: post.readingTime === 0 ? 'Less than 1 min read' : 
                       post.readingTime === 1 ? '1 min read' : 
                       `${post.readingTime} mins read`,
          wordCount: post.wordCount || 0,
          viewCount: post.viewCount || 0,
          likeCount: post.likeCount || 0,
          commentCount: post.commentCount || 0,
          shareCount: post.shareCount || 0,
          publishedDate: post.publishedAt ? post.publishedAt.toISOString() : null,
          formattedPublishedDate: post.publishedAt ? post.publishedAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : null,
          categoryNames: post.categories ? post.categories.map(cat => cat.name) : [],
          categorySlugs: post.categories ? post.categories.map(cat => cat.slug) : [],
          contentPreview: post.content ? post.content.substring(0, 200) + '...' : '',
          contentLength: post.content ? post.content.length : 0,
          isFeatured: post.isFeatured || false,
          isPinned: post.isPinned || false,
          allowComments: post.allowComments !== false,
          allowSharing: post.allowSharing !== false
        }
      }));
      
      res.json({
        success: true,
        data: postsWithMetadata,
        meta: {
          limit: parseInt(limit),
          count: postsWithMetadata.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get latest posts error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch latest posts',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Get single post by slug
router.get('/:slug',
  cacheMiddlewares.postDetails,
  async (req, res) => {
    try {
      const { slug } = req.params;
      
      const post = await Post.findOne({ slug, status: 'published' })
        .populate('author', 'name email bio avatar slug socialLinks')
        .populate('categories', 'name slug description color')
        .lean();

      if (!post) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Post not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      // Increment view count
      await Post.findByIdAndUpdate(post._id, { $inc: { viewCount: 1 } });

      res.json({
        success: true,
        data: post,
        meta: {
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get post error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch post',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Get related posts
router.get('/:postId/related',
  cacheMiddlewares.relatedPosts,
  async (req, res) => {
    try {
      const { postId } = req.params;
      const { limit = 5 } = req.query;
      
      const posts = await Post.getRelatedPosts(postId, parseInt(limit));
      
      res.json({
        success: true,
        data: posts,
        meta: {
          postId,
          limit: parseInt(limit),
          count: posts.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get related posts error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch related posts',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Like a post
router.post('/:postId/like',
  async (req, res) => {
    try {
      const { postId } = req.params;
      
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Post not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      await post.like();
      
      res.json({
        success: true,
        data: {
          postId,
          likeCount: post.likeCount
        },
        message: 'Post liked successfully'
      });
    } catch (error) {
      console.error('Like post error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to like post',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Unlike a post
router.post('/:postId/unlike',
  async (req, res) => {
    try {
      const { postId } = req.params;
      
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Post not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      await post.unlike();
      
      res.json({
        success: true,
        data: {
          postId,
          likeCount: post.likeCount
        },
        message: 'Post unliked successfully'
      });
    } catch (error) {
      console.error('Unlike post error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to unlike post',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Share a post
router.post('/:postId/share',
  async (req, res) => {
    try {
      const { postId } = req.params;
      const { platform } = req.body; // facebook, twitter, linkedin, etc.
      
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Post not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      await post.share();
      
      res.json({
        success: true,
        data: {
          postId,
          shareCount: post.shareCount,
          platform
        },
        message: 'Post shared successfully'
      });
    } catch (error) {
      console.error('Share post error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to share post',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Search posts
router.get('/search/:query',
  async (req, res) => {
    try {
      const { query: searchQuery } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = 'publishedAt',
        sortOrder = 'desc'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Build query
      const query = { 
        status: 'published',
        $text: { $search: searchQuery }
      };
      
      // Build sort
      const sort = {
        score: { $meta: 'textScore' },
        [sortBy]: sortOrder === 'desc' ? -1 : 1
      };
      
      // Fetch posts
      const posts = await Post.find(query)
        .populate('author', 'name email bio avatar slug')
        .populate('categories', 'name slug description color')
        .sort(sort)
        .limit(parseInt(limit))
        .skip(offset)
        .lean();
      
      // Get total count
      const total = await Post.countDocuments(query);
      
      res.json({
        success: true,
        data: posts,
        meta: {
          query: searchQuery,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
            hasNext: offset + parseInt(limit) < total,
            hasPrev: page > 1
          },
          filters: {
            sortBy,
            sortOrder
          },
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Search posts error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to search posts',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Get post statistics
router.get('/stats/overview',
  async (req, res) => {
    try {
      const stats = await Post.getPostStats();
      
      res.json({
        success: true,
        data: stats,
        meta: {
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get post stats error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch post statistics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

module.exports = router;
