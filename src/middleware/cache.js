const redis = require('redis');
const { CACHE_CONFIG, ENV_VARS } = require('../utils/constants');

// Redis client configuration
let redisClient = null;

// Initialize Redis client
const initRedis = async () => {
  try {
    // Check if Redis URL is provided
    if (!ENV_VARS.REDIS_URL) {
      console.log('Redis URL not provided, skipping Redis initialization');
      return null;
    }

    redisClient = redis.createClient({
      url: ENV_VARS.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
        reconnectStrategy: false // Disable automatic reconnection
      }
    });

    redisClient.on('error', (err) => {
      console.warn('Redis Client Error:', err.message);
      redisClient = null; // Set to null on error
    });

    redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });

    redisClient.on('disconnect', () => {
      console.log('Disconnected from Redis');
      redisClient = null;
    });

    // Try to connect with timeout
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
      )
    ]);
    
    return redisClient;
  } catch (error) {
    console.warn('Redis initialization failed, continuing without cache:', error.message);
    redisClient = null;
    return null; // Return null instead of throwing
  }
};

// Cache service functions
const cacheService = {
  // Get value from cache
  get: async (key) => {
    if (!redisClient) return null;
    
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  // Set value in cache
  set: async (key, value, ttl = CACHE_CONFIG.TTL.MEDIUM) => {
    if (!redisClient) return false;
    
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  // Delete key from cache
  del: async (key) => {
    if (!redisClient) return false;
    
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  },

  // Check if key exists
  exists: async (key) => {
    if (!redisClient) return false;
    
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  },

  // Get multiple keys
  mget: async (keys) => {
    if (!redisClient) return [];
    
    try {
      const values = await redisClient.mGet(keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error('Cache mget error:', error);
      return [];
    }
  },

  // Set multiple key-value pairs
  mset: async (keyValuePairs, ttl = CACHE_CONFIG.TTL.MEDIUM) => {
    if (!redisClient) return false;
    
    try {
      const pipeline = redisClient.multi();
      
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        pipeline.setEx(key, ttl, JSON.stringify(value));
      });
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  },

  // Increment counter
  incr: async (key, ttl = CACHE_CONFIG.TTL.MEDIUM) => {
    if (!redisClient) return 0;
    
    try {
      const result = await redisClient.incr(key);
      if (result === 1) {
        await redisClient.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error('Cache incr error:', error);
      return 0;
    }
  },

  // Set expiration for key
  expire: async (key, ttl) => {
    if (!redisClient) return false;
    
    try {
      await redisClient.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  },

  // Get TTL for key
  ttl: async (key) => {
    if (!redisClient) return -1;
    
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      console.error('Cache ttl error:', error);
      return -1;
    }
  },

  // Clear all cache
  flushAll: async () => {
    if (!redisClient) return false;
    
    try {
      await redisClient.flushAll();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  },

  // Get cache statistics
  getStats: async () => {
    if (!redisClient) return null;
    
    try {
      const info = await redisClient.info('memory');
      const keyspace = await redisClient.info('keyspace');
      
      return {
        memory: info,
        keyspace: keyspace,
        connected: true
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { connected: false };
    }
  }
};

// Cache middleware for Express
const cacheMiddleware = (options = {}) => {
  const {
    ttl = CACHE_CONFIG.TTL.MEDIUM,
    keyGenerator = null,
    skipCache = false,
    condition = null
  } = options;

  return async (req, res, next) => {
    // Skip cache if disabled
    if (skipCache || !redisClient) {
      return next();
    }

    // Generate cache key
    const key = keyGenerator 
      ? keyGenerator(req)
      : `cache:${req.method}:${req.originalUrl}`;

    // Check condition
    if (condition && !condition(req)) {
      return next();
    }

    try {
      // Try to get from cache
      const cachedData = await cacheService.get(key);
      
      if (cachedData) {
        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': key,
          'Cache-Control': `public, max-age=${ttl}`
        });
        
        return res.json(cachedData);
      }

      // Cache miss - continue to route handler
      res.set('X-Cache', 'MISS');
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache the response
        cacheService.set(key, data, ttl).catch(error => {
          console.error('Failed to cache response:', error);
        });
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Specific cache middleware functions
const cacheMiddlewares = {
  // Cache content page
  contentPage: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.LONG,
    keyGenerator: (req) => `${CACHE_CONFIG.KEYS.CONTENT_PAGE}:${req.query.version || 'published'}`
  }),

  // Cache popular posts
  popularPosts: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.MEDIUM,
    keyGenerator: (req) => `${CACHE_CONFIG.KEYS.POPULAR_POSTS}:${req.query.limit || 10}`
  }),

  // Cache categories
  categories: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.LONG,
    keyGenerator: () => CACHE_CONFIG.KEYS.CATEGORIES
  }),

  // Cache tags
  tags: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.LONG,
    keyGenerator: () => CACHE_CONFIG.KEYS.TAGS
  }),

  // Cache search results
  searchResults: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.SHORT,
    keyGenerator: (req) => `${CACHE_CONFIG.KEYS.SEARCH_RESULTS}${req.query.q}:${req.query.type || 'all'}:${req.query.page || 1}`
  }),

  // Cache post details
  postDetails: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.MEDIUM,
    keyGenerator: (req) => `${CACHE_CONFIG.KEYS.POST_DETAILS}${req.params.slug}`
  }),

  // Cache related posts
  relatedPosts: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.MEDIUM,
    keyGenerator: (req) => `${CACHE_CONFIG.KEYS.RELATED_POSTS}${req.params.postId}:${req.query.limit || 5}`
  }),

  // Cache comment counts
  commentCounts: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.SHORT,
    keyGenerator: (req) => `${CACHE_CONFIG.KEYS.COMMENT_COUNT}${req.params.postId}`
  }),

  // Cache analytics data
  analytics: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.SHORT,
    keyGenerator: (req) => `analytics:${req.query.type || 'popular'}:${req.query.timeframe || '30d'}`
  }),

  // Cache newsletter stats
  newsletterStats: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.MEDIUM,
    keyGenerator: () => CACHE_CONFIG.KEYS.NEWSLETTER_STATS
  }),

  // Cache authors
  authors: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.MEDIUM,
    keyGenerator: (req) => `authors:${req.query.featured || 'all'}:${req.query.role || 'all'}:${req.query.search || 'all'}`
  }),

  // Cache featured authors
  featuredAuthors: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.MEDIUM,
    keyGenerator: (req) => `featured-authors:${req.query.limit || 6}`
  }),

  // Cache author details
  authorDetails: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.MEDIUM,
    keyGenerator: (req) => `author-details:${req.params.slug}`
  }),

  // Cache posts listing
  posts: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.SHORT,
    keyGenerator: (req) => `posts:${req.query.page || 1}:${req.query.limit || 10}:${req.query.category || 'all'}:${req.query.tag || 'all'}:${req.query.author || 'all'}:${req.query.search || 'all'}`
  }),

  // Cache featured posts
  featuredPosts: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.MEDIUM,
    keyGenerator: (req) => `featured-posts:${req.query.limit || 5}`
  }),

  // Cache pinned posts
  pinnedPosts: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.MEDIUM,
    keyGenerator: (req) => `pinned-posts:${req.query.limit || 3}`
  }),

  // Cache recent posts
  recentPosts: cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.SHORT,
    keyGenerator: (req) => `recent-posts:${req.query.limit || 10}`
  })
};

// Cache invalidation helpers
const cacheInvalidation = {
  // Invalidate content page cache
  invalidateContentPage: async () => {
    const keys = [
      CACHE_CONFIG.KEYS.CONTENT_PAGE,
      `${CACHE_CONFIG.KEYS.CONTENT_PAGE}:published`,
      `${CACHE_CONFIG.KEYS.CONTENT_PAGE}:draft`
    ];
    
    for (const key of keys) {
      await cacheService.del(key);
    }
  },

  // Invalidate post-related cache
  invalidatePost: async (postId, slug) => {
    const keys = [
      `${CACHE_CONFIG.KEYS.POST_DETAILS}${slug}`,
      `${CACHE_CONFIG.KEYS.RELATED_POSTS}${postId}`,
      `${CACHE_CONFIG.KEYS.COMMENT_COUNT}${postId}`,
      CACHE_CONFIG.KEYS.POPULAR_POSTS
    ];
    
    for (const key of keys) {
      await cacheService.del(key);
    }
  },

  // Invalidate category cache
  invalidateCategory: async () => {
    await cacheService.del(CACHE_CONFIG.KEYS.CATEGORIES);
  },

  // Invalidate tag cache
  invalidateTags: async () => {
    await cacheService.del(CACHE_CONFIG.KEYS.TAGS);
  },

  // Invalidate search cache
  invalidateSearch: async (query) => {
    if (query) {
      const pattern = `${CACHE_CONFIG.KEYS.SEARCH_RESULTS}${query}*`;
      // Note: Redis doesn't support pattern deletion in a single command
      // This would need to be implemented with SCAN and DEL
    } else {
      // Clear all search results
      const pattern = `${CACHE_CONFIG.KEYS.SEARCH_RESULTS}*`;
      // Implementation would use SCAN to find and delete matching keys
    }
  },

  // Invalidate analytics cache
  invalidateAnalytics: async () => {
    const keys = [
      CACHE_CONFIG.KEYS.ANALYTICS_POPULAR,
      CACHE_CONFIG.KEYS.NEWSLETTER_STATS
    ];
    
    for (const key of keys) {
      await cacheService.del(key);
    }
  }
};

// Health check for cache
const cacheHealthCheck = async () => {
  try {
    if (!redisClient) {
      return { status: 'disabled', message: 'Redis not available, caching disabled' };
    }
    
    const pong = await redisClient.ping();
    if (pong === 'PONG') {
      return { status: 'connected', message: 'Redis is healthy' };
    } else {
      return { status: 'error', message: 'Redis ping failed' };
    }
  } catch (error) {
    return { status: 'error', message: error.message };
  }
};

module.exports = {
  initRedis,
  cacheService,
  cacheMiddleware,
  cacheMiddlewares,
  cacheInvalidation,
  cacheHealthCheck
};
