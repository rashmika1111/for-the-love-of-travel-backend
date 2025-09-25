const express = require('express');
const router = express.Router();
const Author = require('../models/Author');
const Post = require('../models/Post');
const { HTTP_STATUS, ERROR_CODES } = require('../utils/constants');
const { cacheMiddlewares } = require('../middleware/cache');
const { generalLimiter } = require('../middleware/rateLimiter');
const { analyticsMiddleware } = require('../middleware/analytics');

// Apply rate limiting to all author routes
router.use(generalLimiter);

// Apply analytics tracking to all author routes
router.use(analyticsMiddleware.pageView);

// Get all active authors
router.get('/', 
  cacheMiddlewares.authors,
  async (req, res) => {
    try {
      const {
        featured = false,
        role = null,
        search = null,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      const options = {
        featured: featured === 'true' ? true : null, // Only pass true or null
        role,
        search,
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const authors = await Author.getActiveAuthors(options);

      res.json({
        success: true,
        data: authors,
        meta: {
          filters: {
            featured,
            role,
            search,
            sortBy,
            sortOrder
          },
          count: authors.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get authors error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch authors',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Get featured authors
router.get('/featured',
  cacheMiddlewares.featuredAuthors,
  async (req, res) => {
    try {
      const { limit = 6 } = req.query;
      const authors = await Author.getFeaturedAuthors(parseInt(limit));

      res.json({
        success: true,
        data: authors,
        meta: {
          limit: parseInt(limit),
          count: authors.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get featured authors error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch featured authors',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Get top authors by posts
router.get('/top/posts',
  async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const authors = await Author.getTopAuthorsByPosts(parseInt(limit));

      res.json({
        success: true,
        data: authors,
        meta: {
          limit: parseInt(limit),
          count: authors.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get top authors by posts error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch top authors by posts',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Get top authors by views
router.get('/top/views',
  async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const authors = await Author.getTopAuthorsByViews(parseInt(limit));

      res.json({
        success: true,
        data: authors,
        meta: {
          limit: parseInt(limit),
          count: authors.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get top authors by views error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch top authors by views',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Get single author by slug
router.get('/:slug',
  cacheMiddlewares.authorDetails,
  async (req, res) => {
    try {
      const { slug } = req.params;
      
      const author = await Author.findOne({ 
        slug, 
        isActive: true 
      }).lean();

      if (!author) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Author not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      res.json({
        success: true,
        data: author,
        meta: {
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get author error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch author',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Get author's posts
router.get('/:slug/posts',
  async (req, res) => {
    try {
      const { slug } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = 'publishedAt',
        sortOrder = 'desc'
      } = req.query;

      // Find author first
      const author = await Author.findOne({ 
        slug, 
        isActive: true 
      });

      if (!author) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Author not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Get posts by author
      const posts = await Post.find({
        author: author._id,
        status: 'published'
      })
        .populate('categories', 'name slug description color')
        .sort(sort)
        .limit(parseInt(limit))
        .skip(offset)
        .lean();

      // Get total count
      const total = await Post.countDocuments({
        author: author._id,
        status: 'published'
      });

      res.json({
        success: true,
        data: posts,
        meta: {
          author: {
            _id: author._id,
            name: author.name,
            slug: author.slug,
            bio: author.bio,
            avatar: author.avatar
          },
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
      console.error('Get author posts error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch author posts',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Get author's popular posts
router.get('/:slug/posts/popular',
  async (req, res) => {
    try {
      const { slug } = req.params;
      const { limit = 5 } = req.query;

      // Find author first
      const author = await Author.findOne({ 
        slug, 
        isActive: true 
      });

      if (!author) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Author not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      // Get popular posts by author
      const posts = await Post.find({
        author: author._id,
        status: 'published'
      })
        .populate('categories', 'name slug description color')
        .sort({ viewCount: -1, likeCount: -1 })
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        data: posts,
        meta: {
          author: {
            _id: author._id,
            name: author.name,
            slug: author.slug
          },
          limit: parseInt(limit),
          count: posts.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get author popular posts error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch author popular posts',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Get author statistics
router.get('/:slug/stats',
  async (req, res) => {
    try {
      const { slug } = req.params;

      // Find author first
      const author = await Author.findOne({ 
        slug, 
        isActive: true 
      });

      if (!author) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Author not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      // Update author stats
      await author.updatePostCount();

      res.json({
        success: true,
        data: {
          author: {
            _id: author._id,
            name: author.name,
            slug: author.slug
          },
          stats: author.stats
        },
        meta: {
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get author stats error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch author statistics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

// Search authors
router.get('/search/:query',
  async (req, res) => {
    try {
      const { query: searchQuery } = req.params;
      const {
        limit = 20,
        role = null
      } = req.query;

      const options = {
        limit: parseInt(limit),
        role
      };

      const authors = await Author.searchAuthors(searchQuery, options);

      res.json({
        success: true,
        data: authors,
        meta: {
          query: searchQuery,
          filters: {
            role
          },
          count: authors.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Search authors error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to search authors',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
);

module.exports = router;
