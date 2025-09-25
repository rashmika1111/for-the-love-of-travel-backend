const Contact = require('../models/Contact');
const Newsletter = require('../models/Newsletter');
const emailService = require('../services/emailService');
const { API_RESPONSES, HTTP_STATUS, ERROR_CODES } = require('../utils/constants');

// Contact controller
class ContactController {
  // Submit contact form
  async submitContact(req, res) {
    try {
      const { name, email, subject, message } = req.body;
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Create contact record
      const contact = new Contact({
        name: name,
        email: email,
        subject: subject,
        message: message,
        ip: ip,
        userAgent: userAgent,
        metadata: {
          referrer: req.get('Referer'),
          source: 'website',
          campaign: req.query.utm_campaign,
          utm_source: req.query.utm_source,
          utm_medium: req.query.utm_medium,
          utm_term: req.query.utm_term,
          utm_content: req.query.utm_content
        }
      });
      
      await contact.save();
      
      // Send confirmation email to user
      try {
        await emailService.sendContactConfirmation({
          name: contact.name,
          email: contact.email,
          subject: contact.subject,
          message: contact.message,
          createdAt: contact.createdAt
        });
      } catch (emailError) {
        console.error('Failed to send contact confirmation email:', emailError);
        // Don't fail the request if email fails
      }
      
      // Send notification email to admin
      try {
        await emailService.sendContactNotification({
          name: contact.name,
          email: contact.email,
          subject: contact.subject,
          message: contact.message,
          createdAt: contact.createdAt
        });
      } catch (emailError) {
        console.error('Failed to send contact notification email:', emailError);
        // Don't fail the request if email fails
      }
      
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Contact form submitted successfully. We will get back to you soon!',
        data: {
          id: contact._id,
          status: contact.status,
          submittedAt: contact.createdAt
        }
      });
    } catch (error) {
      console.error('Submit contact error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to submit contact form',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Subscribe to newsletter
  async subscribeNewsletter(req, res) {
    try {
      const { email, preferences = {} } = req.body;
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Check if email is already subscribed
      const existingSubscription = await Newsletter.findOne({ email: email });
      
      if (existingSubscription) {
        if (existingSubscription.status === 'active') {
          return res.status(HTTP_STATUS.CONFLICT).json({
            success: false,
            message: 'Email is already subscribed to our newsletter',
            code: ERROR_CODES.DUPLICATE_ENTRY
          });
        } else if (existingSubscription.status === 'unsubscribed') {
          // Resubscribe
          existingSubscription.status = 'active';
          existingSubscription.unsubscribedAt = undefined;
          existingSubscription.preferences = {
            frequency: preferences.frequency || 'weekly',
            categories: preferences.categories || ['all'],
            language: preferences.language || 'en'
          };
          existingSubscription.metadata = {
            ip: ip,
            userAgent: userAgent,
            referrer: req.get('Referer'),
            utm_source: req.query.utm_source,
            utm_medium: req.query.utm_medium,
            utm_campaign: req.query.utm_campaign,
            utm_term: req.query.utm_term,
            utm_content: req.query.utm_content
          };
          
          await existingSubscription.save();
          
          // Send welcome email
          try {
            await emailService.sendNewsletterWelcome({
              email: existingSubscription.email,
              preferences: existingSubscription.preferences,
              subscribedAt: existingSubscription.subscribedAt
            });
          } catch (emailError) {
            console.error('Failed to send newsletter welcome email:', emailError);
          }
          
          return res.json({
            success: true,
            message: 'Successfully resubscribed to our newsletter!',
            data: {
              id: existingSubscription._id,
              status: existingSubscription.status,
              subscribedAt: existingSubscription.subscribedAt
            }
          });
        }
      }
      
      // Create new subscription
      const newsletter = new Newsletter({
        email: email,
        status: 'active',
        source: 'website',
        preferences: {
          frequency: preferences.frequency || 'weekly',
          categories: preferences.categories || ['all'],
          language: preferences.language || 'en'
        },
        metadata: {
          ip: ip,
          userAgent: userAgent,
          referrer: req.get('Referer'),
          utm_source: req.query.utm_source,
          utm_medium: req.query.utm_medium,
          utm_campaign: req.query.utm_campaign,
          utm_term: req.query.utm_term,
          utm_content: req.query.utm_content
        }
      });
      
      await newsletter.save();
      
      // Send welcome email
      try {
        await emailService.sendNewsletterWelcome({
          email: newsletter.email,
          preferences: newsletter.preferences,
          subscribedAt: newsletter.subscribedAt
        });
      } catch (emailError) {
        console.error('Failed to send newsletter welcome email:', emailError);
        // Don't fail the request if email fails
      }
      
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Successfully subscribed to our newsletter!',
        data: {
          id: newsletter._id,
          status: newsletter.status,
          subscribedAt: newsletter.subscribedAt
        }
      });
    } catch (error) {
      console.error('Subscribe newsletter error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to subscribe to newsletter',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Unsubscribe from newsletter
  async unsubscribeNewsletter(req, res) {
    try {
      const { email, reason } = req.body;
      
      const newsletter = await Newsletter.findOne({ email: email });
      
      if (!newsletter) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Email not found in our newsletter database',
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      if (newsletter.status === 'unsubscribed') {
        return res.json({
          success: true,
          message: 'Email is already unsubscribed from our newsletter',
          data: {
            id: newsletter._id,
            status: newsletter.status,
            unsubscribedAt: newsletter.unsubscribedAt
          }
        });
      }
      
      // Unsubscribe
      await newsletter.unsubscribe(reason);
      
      // Send unsubscribe confirmation email
      try {
        await emailService.sendNewsletterUnsubscribe({
          email: newsletter.email,
          unsubscribedAt: newsletter.unsubscribedAt
        });
      } catch (emailError) {
        console.error('Failed to send newsletter unsubscribe email:', emailError);
        // Don't fail the request if email fails
      }
      
      res.json({
        success: true,
        message: 'Successfully unsubscribed from our newsletter',
        data: {
          id: newsletter._id,
          status: newsletter.status,
          unsubscribedAt: newsletter.unsubscribedAt
        }
      });
    } catch (error) {
      console.error('Unsubscribe newsletter error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to unsubscribe from newsletter',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get contact form statistics
  async getContactStats(req, res) {
    try {
      const stats = await Contact.getStats();
      
      res.json({
        success: true,
        data: stats,
        meta: {
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get contact stats error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch contact statistics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get newsletter statistics
  async getNewsletterStats(req, res) {
    try {
      const stats = await Newsletter.getStats();
      
      res.json({
        success: true,
        data: stats,
        meta: {
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get newsletter stats error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch newsletter statistics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get recent contact submissions
  async getRecentContacts(req, res) {
    try {
      const { limit = 10, status } = req.query;
      
      const query = {};
      if (status) {
        query.status = status;
      }
      
      const contacts = await Contact.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .select('name email subject status createdAt priority');
      
      res.json({
        success: true,
        data: contacts,
        meta: {
          limit: parseInt(limit),
          status: status || 'all',
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get recent contacts error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch recent contacts',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get recent newsletter subscriptions
  async getRecentNewsletterSubscriptions(req, res) {
    try {
      const { limit = 10, status = 'active' } = req.query;
      
      const subscriptions = await Newsletter.find({ status })
        .sort({ subscribedAt: -1 })
        .limit(parseInt(limit))
        .select('email preferences.frequency preferences.categories subscribedAt');
      
      res.json({
        success: true,
        data: subscriptions,
        meta: {
          limit: parseInt(limit),
          status,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get recent newsletter subscriptions error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch recent newsletter subscriptions',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get contact by ID (admin only)
  async getContactById(req, res) {
    try {
      const { id } = req.params;
      
      const contact = await Contact.findById(id);
      
      if (!contact) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Contact not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      res.json({
        success: true,
        data: contact,
        meta: {
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get contact by ID error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch contact',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Update contact status (admin only)
  async updateContactStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, priority, notes } = req.body;
      
      const contact = await Contact.findById(id);
      
      if (!contact) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Contact not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      // Update status
      if (status) {
        contact.status = status;
        if (status === 'replied') {
          contact.repliedAt = new Date();
        } else if (status === 'archived') {
          contact.archivedAt = new Date();
        }
      }
      
      // Update priority
      if (priority) {
        contact.priority = priority;
      }
      
      // Update notes
      if (notes) {
        contact.notes = notes;
      }
      
      await contact.save();
      
      res.json({
        success: true,
        message: 'Contact status updated successfully',
        data: {
          id: contact._id,
          status: contact.status,
          priority: contact.priority,
          updatedAt: contact.updatedAt
        }
      });
    } catch (error) {
      console.error('Update contact status error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to update contact status',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get newsletter subscriber by email
  async getNewsletterSubscriber(req, res) {
    try {
      const { email } = req.params;
      
      const subscriber = await Newsletter.findOne({ email: email });
      
      if (!subscriber) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Newsletter subscriber not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      res.json({
        success: true,
        data: subscriber,
        meta: {
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get newsletter subscriber error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch newsletter subscriber',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Update newsletter subscriber preferences
  async updateNewsletterPreferences(req, res) {
    try {
      const { email } = req.params;
      const { preferences } = req.body;
      
      const subscriber = await Newsletter.findOne({ email: email });
      
      if (!subscriber) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Newsletter subscriber not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      // Update preferences
      if (preferences.frequency) {
        subscriber.preferences.frequency = preferences.frequency;
      }
      
      if (preferences.categories) {
        subscriber.preferences.categories = preferences.categories;
      }
      
      if (preferences.language) {
        subscriber.preferences.language = preferences.language;
      }
      
      await subscriber.save();
      
      res.json({
        success: true,
        message: 'Newsletter preferences updated successfully',
        data: {
          id: subscriber._id,
          preferences: subscriber.preferences,
          updatedAt: subscriber.updatedAt
        }
      });
    } catch (error) {
      console.error('Update newsletter preferences error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to update newsletter preferences',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }
}

// Create singleton instance
const contactController = new ContactController();

module.exports = contactController;
