const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController');
const { generalLimiter, commentsLimiter } = require('../middleware/rateLimiter');
const { endpointSpamProtection } = require('../middleware/spamProtection');
const { analyticsMiddleware } = require('../middleware/analytics');
const {
  likeValidation,
  shareValidation,
  postCommentsValidation,
  addCommentValidation
} = require('../utils/validation');

// Apply rate limiting to all interaction routes
router.use(generalLimiter);

// Apply analytics tracking to all interaction routes
router.use(analyticsMiddleware.pageView);

// Post interaction routes
router.post('/posts/:slug/like',
  likeValidation,
  interactionController.likePost
);

router.post('/posts/:slug/share',
  shareValidation,
  interactionController.sharePost
);

router.get('/posts/:slug/stats',
  interactionController.getPostStats
);

// Comments routes
router.get('/posts/:slug/comments',
  postCommentsValidation,
  interactionController.getPostComments
);

router.post('/posts/:slug/comments',
  commentsLimiter,
  endpointSpamProtection.comments,
  addCommentValidation,
  interactionController.addComment
);

// User interaction routes (require authentication)
router.get('/user/interactions',
  interactionController.getUserInteractions
);

router.post('/posts/:slug/bookmark',
  interactionController.bookmarkPost
);

router.get('/user/bookmarks',
  interactionController.getUserBookmarks
);

module.exports = router;
