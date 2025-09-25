const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { searchLimiter } = require('../middleware/rateLimiter');
const { analyticsMiddleware } = require('../middleware/analytics');
const {
  searchValidation
} = require('../utils/validation');

// Apply rate limiting to all search routes
router.use(searchLimiter);

// Apply analytics tracking to all search routes
router.use(analyticsMiddleware.search);

// Global search route
router.get('/',
  searchValidation,
  searchController.globalSearch
);

// Search specific content types
router.get('/posts',
  searchValidation,
  searchController.searchPosts
);

router.get('/categories',
  searchValidation,
  searchController.searchCategories
);

router.get('/tags',
  searchValidation,
  searchController.searchTags
);

// Search suggestions
router.get('/suggestions',
  searchController.getSearchSuggestions
);

// Popular search terms
router.get('/popular',
  searchController.getPopularSearchTerms
);

// Search statistics
router.get('/stats',
  searchController.getSearchStats
);

// Advanced search
router.get('/advanced',
  searchValidation,
  searchController.advancedSearch
);

module.exports = router;
