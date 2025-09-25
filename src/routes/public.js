const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const { cacheMiddlewares } = require('../middleware/cache');
const { generalLimiter } = require('../middleware/rateLimiter');
const { analyticsMiddleware } = require('../middleware/analytics');
const {
  contentPageValidation,
  postsValidation,
  singlePostValidation,
  categoryPostsValidation,
  tagPostsValidation,
  relatedPostsValidation
} = require('../utils/validation');

// Apply rate limiting to all public routes
router.use(generalLimiter);

// Apply analytics tracking to all public routes
router.use(analyticsMiddleware.pageView);

// Content page route
router.get('/content-page', 
  contentPageValidation,
  cacheMiddlewares.contentPage,
  publicController.getContentPage
);

// Posts routes
router.get('/posts',
  postsValidation,
  publicController.getPosts
);

router.get('/posts/popular',
  cacheMiddlewares.popularPosts,
  publicController.getPopularPosts
);

router.get('/posts/:slug',
  singlePostValidation,
  cacheMiddlewares.postDetails,
  publicController.getPost
);

router.get('/posts/:postId/related',
  relatedPostsValidation,
  cacheMiddlewares.relatedPosts,
  publicController.getRelatedPosts
);

// Categories routes
router.get('/categories',
  cacheMiddlewares.categories,
  publicController.getCategories
);

router.get('/categories/:slug/posts',
  categoryPostsValidation,
  publicController.getPostsByCategory
);

// Tags routes
router.get('/tags',
  cacheMiddlewares.tags,
  publicController.getTags
);

router.get('/tags/:slug/posts',
  tagPostsValidation,
  publicController.getPostsByTag
);

module.exports = router;
