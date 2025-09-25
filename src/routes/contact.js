const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { contactFormLimiter, newsletterLimiter } = require('../middleware/rateLimiter');
const { endpointSpamProtection } = require('../middleware/spamProtection');
const { analyticsMiddleware } = require('../middleware/analytics');
const {
  contactValidation,
  newsletterValidation
} = require('../utils/validation');

// Apply analytics tracking to all contact routes
router.use(analyticsMiddleware.pageView);

// Contact form routes
router.post('/contact',
  contactFormLimiter,
  endpointSpamProtection.contact,
  contactValidation,
  analyticsMiddleware.contactForm,
  contactController.submitContact
);

// Newsletter routes
router.post('/newsletter',
  newsletterLimiter,
  endpointSpamProtection.newsletter,
  newsletterValidation,
  analyticsMiddleware.newsletter,
  contactController.subscribeNewsletter
);

router.post('/unsubscribe',
  contactController.unsubscribeNewsletter
);

// Statistics routes (admin only - would need authentication middleware)
router.get('/stats/contact',
  contactController.getContactStats
);

router.get('/stats/newsletter',
  contactController.getNewsletterStats
);

router.get('/recent/contacts',
  contactController.getRecentContacts
);

router.get('/recent/newsletter',
  contactController.getRecentNewsletterSubscriptions
);

// Individual contact management (admin only)
router.get('/contact/:id',
  contactController.getContactById
);

router.put('/contact/:id/status',
  contactController.updateContactStatus
);

// Newsletter subscriber management
router.get('/newsletter/:email',
  contactController.getNewsletterSubscriber
);

router.put('/newsletter/:email/preferences',
  contactController.updateNewsletterPreferences
);

module.exports = router;
