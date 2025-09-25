const cacheService = require('../services/cacheService');
const { API_RESPONSES, HTTP_STATUS, ERROR_CODES } = require('../utils/constants');
const Post = require('../models/Post');
const Category = require('../models/Category');
const Author = require('../models/Author');

// Public content controller
class PublicController {
  // Get published content page
  async getContentPage(req, res) {
    try {
      const { version = 'published' } = req.query;
      
      // Try to get from cache first
      let contentPage = await cacheService.getContentPage(version);
      
      if (!contentPage) {
        // If not in cache, fetch from database
        // This would typically query your CMS database
        contentPage = await this.fetchContentPageFromDatabase(version);
        
        if (contentPage) {
          // Cache the result
          await cacheService.setContentPage(contentPage, version);
        }
      }
      
      if (!contentPage) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Content page not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      res.json({
        success: true,
        data: contentPage,
        meta: {
          version,
          cached: !!contentPage,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get content page error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch content page',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get single post by slug
  async getPost(req, res) {
    try {
      const { slug } = req.params;
      
      // Try to get from cache first
      let post = await cacheService.getPostDetails(slug);
      
      if (!post) {
        // If not in cache, fetch from database
        post = await this.fetchPostFromDatabase(slug);
        
        if (post) {
          // Cache the result
          await cacheService.setPostDetails(slug, post);
        }
      }
      
      if (!post) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Post not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      // Check if post is published
      if (post.status !== 'published') {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Post not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      res.json({
        success: true,
        data: post,
        meta: {
          cached: !!post,
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

  // Get published posts with pagination and filtering
  async getPosts(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        tag,
        sortBy = 'publishedAt',
        sortOrder = 'desc'
      } = req.query;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Build query
      const query = { status: 'published' };
      
      if (category) {
        // Find category by slug and use its ID
        const categoryDoc = await Category.findOne({ slug: category, isActive: true });
        if (categoryDoc) {
          query.categories = categoryDoc._id;
        }
      }
      
      if (tag) {
        query.tags = tag;
      }
      
      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // Fetch posts from database
      const posts = await this.fetchPostsFromDatabase({
        query,
        sort,
        limit: parseInt(limit),
        offset
      });
      
      // Get total count for pagination
      const total = await this.countPostsFromDatabase(query);
      
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
            sortBy,
            sortOrder
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

  // Get popular posts
  async getPopularPosts(req, res) {
    try {
      const { limit = 10 } = req.query;
      
      // Try to get from cache first
      let popularPosts = await cacheService.getPopularPosts(parseInt(limit));
      
      if (!popularPosts) {
        // If not in cache, fetch from database
        popularPosts = await this.fetchPopularPostsFromDatabase(parseInt(limit));
        
        if (popularPosts) {
          // Cache the result
          await cacheService.setPopularPosts(popularPosts, parseInt(limit));
        }
      }
      
      res.json({
        success: true,
        data: popularPosts || [],
        meta: {
          limit: parseInt(limit),
          cached: !!popularPosts,
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

  // Get all categories
  async getCategories(req, res) {
    try {
      // Try to get from cache first
      let categories = await cacheService.getCategories();
      
      if (!categories) {
        // If not in cache, fetch from database
        categories = await this.fetchCategoriesFromDatabase();
        
        if (categories) {
          // Cache the result
          await cacheService.setCategories(categories);
        }
      }
      
      res.json({
        success: true,
        data: categories || [],
        meta: {
          cached: !!categories,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch categories',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get posts by category
  async getPostsByCategory(req, res) {
    try {
      const { slug } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = 'publishedAt',
        sortOrder = 'desc'
      } = req.query;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Find category by slug and use its ID
      const categoryDoc = await Category.findOne({ slug, isActive: true });
      if (!categoryDoc) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Category not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }

      // Build query
      const query = { 
        status: 'published',
        categories: categoryDoc._id
      };
      
      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // Fetch posts from database
      const posts = await this.fetchPostsFromDatabase({
        query,
        sort,
        limit: parseInt(limit),
        offset
      });
      
      // Get total count for pagination
      const total = await this.countPostsFromDatabase(query);
      
      res.json({
        success: true,
        data: posts,
        meta: {
          category: categoryDoc,
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
      console.error('Get posts by category error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch posts by category',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get all tags
  async getTags(req, res) {
    try {
      // Try to get from cache first
      let tags = await cacheService.getTags();
      
      if (!tags) {
        // If not in cache, fetch from database
        tags = await this.fetchTagsFromDatabase();
        
        if (tags) {
          // Cache the result
          await cacheService.setTags(tags);
        }
      }
      
      res.json({
        success: true,
        data: tags || [],
        meta: {
          cached: !!tags,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get tags error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch tags',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get posts by tag
  async getPostsByTag(req, res) {
    try {
      const { slug } = req.params;
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
        tags: slug
      };
      
      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // Fetch posts from database
      const posts = await this.fetchPostsFromDatabase({
        query,
        sort,
        limit: parseInt(limit),
        offset
      });
      
      // Get total count for pagination
      const total = await this.countPostsFromDatabase(query);
      
      // Get tag info
      const tag = await this.fetchTagFromDatabase(slug);
      
      if (!tag) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Tag not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      res.json({
        success: true,
        data: posts,
        meta: {
          tag,
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
      console.error('Get posts by tag error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch posts by tag',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get related posts
  async getRelatedPosts(req, res) {
    try {
      const { postId } = req.params;
      const { limit = 5 } = req.query;
      
      // Try to get from cache first
      let relatedPosts = await cacheService.getRelatedPosts(postId, parseInt(limit));
      
      if (!relatedPosts) {
        // If not in cache, fetch from database
        relatedPosts = await this.fetchRelatedPostsFromDatabase(postId, parseInt(limit));
        
        if (relatedPosts) {
          // Cache the result
          await cacheService.setRelatedPosts(postId, relatedPosts, parseInt(limit));
        }
      }
      
      res.json({
        success: true,
        data: relatedPosts || [],
        meta: {
          postId,
          limit: parseInt(limit),
          cached: !!relatedPosts,
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

  // Database query methods using Mongoose models
  async fetchContentPageFromDatabase(version) {
    // For now, return a simple content page structure
    // This could be enhanced to fetch from a CMS or content management system
    return {
      title: 'For the Love of Travel',
      description: 'Discover amazing travel destinations and stories',
      sections: [
        {
          type: 'hero',
          title: 'Welcome to For the Love of Travel',
          subtitle: 'Discover amazing destinations and share your travel stories',
          image: '/images/hero-bg.jpg'
        }
      ],
      seo: {
        title: 'For the Love of Travel - Travel Blog',
        description: 'Discover amazing travel destinations, read travel stories, and get inspired for your next adventure.',
        keywords: ['travel', 'blog', 'destinations', 'stories', 'adventure']
      }
    };
  }

  async fetchPostFromDatabase(slug) {
    try {
      const post = await Post.findOne({ slug, status: 'published' })
        .populate('author', 'name email bio avatar')
        .populate('categories', 'name slug description color')
        .lean();

      if (post) {
        // Increment view count
        await Post.findByIdAndUpdate(post._id, { $inc: { viewCount: 1 } });
      }

      return post;
    } catch (error) {
      console.error('Error fetching post from database:', error);
      return null;
    }
  }

  async fetchPostsFromDatabase(options) {
    try {
      const { query, sort, limit, offset } = options;
      
      const posts = await Post.find(query)
        .populate('author', 'name email bio avatar')
        .populate('categories', 'name slug description color')
        .sort(sort)
        .limit(limit)
        .skip(offset)
        .lean();

      return posts;
    } catch (error) {
      console.error('Error fetching posts from database:', error);
      return [];
    }
  }

  async countPostsFromDatabase(query) {
    try {
      return await Post.countDocuments(query);
    } catch (error) {
      console.error('Error counting posts from database:', error);
      return 0;
    }
  }

  async fetchPopularPostsFromDatabase(limit) {
    try {
      return await Post.getPopularPosts(limit);
    } catch (error) {
      console.error('Error fetching popular posts from database:', error);
      return [];
    }
  }

  async fetchCategoriesFromDatabase() {
    try {
      return await Category.getCategoriesWithPostCounts();
    } catch (error) {
      console.error('Error fetching categories from database:', error);
      return [];
    }
  }

  async fetchCategoryFromDatabase(slug) {
    try {
      return await Category.findOne({ slug, isActive: true }).lean();
    } catch (error) {
      console.error('Error fetching category from database:', error);
      return null;
    }
  }

  async fetchTagsFromDatabase() {
    try {
      // Get unique tags from posts
      const tags = await Post.aggregate([
        { $match: { status: 'published' } },
        { $unwind: '$tags' },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            name: '$_id',
            slug: '$_id',
            count: 1,
            _id: 0
          }
        },
        { $sort: { count: -1 } }
      ]);

      return tags;
    } catch (error) {
      console.error('Error fetching tags from database:', error);
      return [];
    }
  }

  async fetchTagFromDatabase(slug) {
    try {
      // Since tags are stored as strings, we'll create a simple tag object
      return {
        name: slug,
        slug: slug,
        count: await Post.countDocuments({ 
          status: 'published', 
          tags: slug 
        })
      };
    } catch (error) {
      console.error('Error fetching tag from database:', error);
      return null;
    }
  }

  async fetchRelatedPostsFromDatabase(postId, limit) {
    try {
      return await Post.getRelatedPosts(postId, limit);
    } catch (error) {
      console.error('Error fetching related posts from database:', error);
      return [];
    }
  }
}

// Create singleton instance
const publicController = new PublicController();

module.exports = publicController;
