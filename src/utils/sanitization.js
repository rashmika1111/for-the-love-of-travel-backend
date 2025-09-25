const xss = require('xss');
const { VALIDATION_RULES, SPAM_DETECTION } = require('./constants');

// XSS configuration for different content types
const xssOptions = {
  // Basic text content (comments, messages)
  basic: {
    whiteList: {
      p: [],
      br: [],
      strong: [],
      em: [],
      u: [],
      a: ['href', 'title'],
      ul: [],
      ol: [],
      li: [],
      blockquote: []
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed']
  },

  // Rich text content (blog posts)
  rich: {
    whiteList: {
      p: [],
      br: [],
      strong: [],
      em: [],
      u: [],
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      a: ['href', 'title', 'target'],
      ul: [],
      ol: [],
      li: [],
      blockquote: [],
      img: ['src', 'alt', 'title', 'width', 'height'],
      table: [],
      thead: [],
      tbody: [],
      tr: [],
      td: [],
      th: [],
      code: [],
      pre: []
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed']
  },

  // Minimal content (names, subjects)
  minimal: {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed']
  }
};

// Main sanitization functions
const sanitize = {
  // Sanitize HTML content
  html: (content, type = 'basic') => {
    if (!content || typeof content !== 'string') {
      return '';
    }
    
    const options = xssOptions[type] || xssOptions.basic;
    return xss(content, options);
  },

  // Sanitize plain text
  text: (text) => {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    return text
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .trim();
  },

  // Sanitize email
  email: (email) => {
    if (!email || typeof email !== 'string') {
      return '';
    }
    
    return email
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9@._-]/g, '');
  },

  // Sanitize URL
  url: (url) => {
    if (!url || typeof url !== 'string') {
      return '';
    }
    
    try {
      const urlObj = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid protocol');
      }
      
      // Remove potentially dangerous parameters
      const dangerousParams = ['javascript', 'data', 'vbscript'];
      urlObj.searchParams.forEach((value, key) => {
        if (dangerousParams.some(param => 
          key.toLowerCase().includes(param) || 
          value.toLowerCase().includes(param)
        )) {
          urlObj.searchParams.delete(key);
        }
      });
      
      return urlObj.toString();
    } catch (error) {
      return '';
    }
  },

  // Sanitize slug
  slug: (slug) => {
    if (!slug || typeof slug !== 'string') {
      return '';
    }
    
    return slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  },

  // Sanitize search query
  searchQuery: (query) => {
    if (!query || typeof query !== 'string') {
      return '';
    }
    
    return query
      .trim()
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .substring(0, VALIDATION_RULES.SEARCH_QUERY.MAX_LENGTH);
  },

  // Sanitize file name
  fileName: (fileName) => {
    if (!fileName || typeof fileName !== 'string') {
      return '';
    }
    
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
};

// Spam detection functions
const spamDetection = {
  // Check if content is spam
  isSpam: (content) => {
    if (!content || typeof content !== 'string') {
      return false;
    }
    
    const lowerContent = content.toLowerCase();
    
    // Check for excessive links
    const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
    if (linkCount > SPAM_DETECTION.MAX_LINKS) {
      return { isSpam: true, reason: 'Too many links' };
    }
    
    // Check for excessive caps
    const capsCount = (content.match(/[A-Z]/g) || []).length;
    const totalChars = content.length;
    if (totalChars > 0 && capsCount / totalChars > SPAM_DETECTION.MAX_CAPS_RATIO) {
      return { isSpam: true, reason: 'Too many capital letters' };
    }
    
    // Check for suspicious words
    const suspiciousWords = SPAM_DETECTION.SUSPICIOUS_WORDS.filter(word => 
      lowerContent.includes(word)
    );
    if (suspiciousWords.length > 0) {
      return { isSpam: true, reason: `Contains suspicious words: ${suspiciousWords.join(', ')}` };
    }
    
    // Check for repeated characters
    const repeatedChars = /(.)\1{4,}/.test(content);
    if (repeatedChars) {
      return { isSpam: true, reason: 'Contains too many repeated characters' };
    }
    
    // Check minimum content length
    if (content.length < SPAM_DETECTION.MIN_CONTENT_LENGTH) {
      return { isSpam: true, reason: 'Content too short' };
    }
    
    return { isSpam: false };
  },

  // Calculate spam score (0-100)
  calculateSpamScore: (content) => {
    if (!content || typeof content !== 'string') {
      return 100;
    }
    
    let score = 0;
    const lowerContent = content.toLowerCase();
    
    // Link count penalty
    const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
    score += Math.min(linkCount * 10, 30);
    
    // Caps ratio penalty
    const capsCount = (content.match(/[A-Z]/g) || []).length;
    const totalChars = content.length;
    if (totalChars > 0) {
      const capsRatio = capsCount / totalChars;
      if (capsRatio > SPAM_DETECTION.MAX_CAPS_RATIO) {
        score += 25;
      }
    }
    
    // Suspicious words penalty
    const suspiciousWords = SPAM_DETECTION.SUSPICIOUS_WORDS.filter(word => 
      lowerContent.includes(word)
    );
    score += suspiciousWords.length * 15;
    
    // Repeated characters penalty
    const repeatedChars = /(.)\1{4,}/.test(content);
    if (repeatedChars) {
      score += 20;
    }
    
    // Length penalty
    if (content.length < SPAM_DETECTION.MIN_CONTENT_LENGTH) {
      score += 15;
    }
    
    return Math.min(score, 100);
  }
};

// Input validation and sanitization
const validateAndSanitize = {
  // Contact form
  contactForm: (data) => {
    return {
      name: sanitize.text(data.name),
      email: sanitize.email(data.email),
      subject: sanitize.text(data.subject),
      message: sanitize.html(data.message, 'basic')
    };
  },

  // Newsletter subscription
  newsletter: (data) => {
    return {
      email: sanitize.email(data.email),
      preferences: {
        frequency: data.preferences?.frequency || 'weekly',
        categories: Array.isArray(data.preferences?.categories) 
          ? data.preferences.categories.filter(cat => 
              ['destinations', 'travel-tips', 'deals', 'news', 'all'].includes(cat)
            )
          : ['all'],
        language: data.preferences?.language || 'en'
      }
    };
  },

  // Comment
  comment: (data) => {
    return {
      author: {
        name: sanitize.text(data.author?.name || data.name),
        email: sanitize.email(data.author?.email || data.email),
        website: data.author?.website || data.website ? sanitize.url(data.author?.website || data.website) : undefined
      },
      content: sanitize.html(data.content, 'basic'),
      parentId: data.parentId || null
    };
  },

  // Search query
  search: (data) => {
    return {
      query: sanitize.searchQuery(data.q || data.query),
      type: data.type || 'all',
      category: data.category ? sanitize.slug(data.category) : undefined,
      tag: data.tag ? sanitize.slug(data.tag) : undefined,
      sortBy: data.sortBy || 'relevance',
      sortOrder: data.sortOrder || 'desc',
      page: parseInt(data.page) || 1,
      limit: Math.min(parseInt(data.limit) || 10, 50)
    };
  },

  // Analytics data
  analytics: (data) => {
    return {
      type: data.type,
      path: sanitize.text(data.path),
      data: {
        ...data.data,
        element: data.data?.element ? sanitize.text(data.data.element) : undefined,
        query: data.data?.query ? sanitize.searchQuery(data.data.query) : undefined,
        referrer: data.data?.referrer ? sanitize.url(data.data.referrer) : undefined
      }
    };
  }
};

// Content moderation helpers
const moderation = {
  // Check if content needs moderation
  needsModeration: (content, user = null) => {
    // If user is authenticated and trusted, skip moderation
    if (user && user.isTrusted) {
      return false;
    }
    
    // Check spam score
    const spamScore = spamDetection.calculateSpamScore(content);
    if (spamScore > 50) {
      return true;
    }
    
    // Check for moderation keywords
    const moderationKeywords = [
      'spam', 'scam', 'fake', 'fraud', 'hack', 'crack',
      'illegal', 'drugs', 'weapons', 'violence'
    ];
    
    const lowerContent = content.toLowerCase();
    const hasModerationKeywords = moderationKeywords.some(keyword => 
      lowerContent.includes(keyword)
    );
    
    return hasModerationKeywords;
  },

  // Auto-moderate content
  autoModerate: (content) => {
    const spamCheck = spamDetection.isSpam(content);
    if (spamCheck.isSpam) {
      return {
        status: 'spam',
        reason: spamCheck.reason,
        autoModerated: true
      };
    }
    
    const needsMod = moderation.needsModeration(content);
    if (needsMod) {
      return {
        status: 'pending',
        reason: 'Content flagged for manual review',
        autoModerated: true
      };
    }
    
    return {
      status: 'approved',
      reason: 'Content approved automatically',
      autoModerated: true
    };
  }
};

module.exports = {
  sanitize,
  spamDetection,
  validateAndSanitize,
  moderation,
  xssOptions
};
