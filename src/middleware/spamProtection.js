const { spamDetection, validateAndSanitize } = require('../utils/sanitization');
const { ERROR_CODES } = require('../utils/constants');

// Spam protection middleware
const spamProtection = (options = {}) => {
  const {
    checkContent = true,
    checkLinks = true,
    checkCaps = true,
    checkSuspiciousWords = true,
    checkRepeatedChars = true,
    maxSpamScore = 50,
    logSpamAttempts = true
  } = options;

  return async (req, res, next) => {
    try {
      const spamChecks = [];
      let totalSpamScore = 0;

      // Check request body content
      if (checkContent && req.body) {
        const contentFields = ['message', 'content', 'comment', 'description'];
        
        for (const field of contentFields) {
          if (req.body[field]) {
            const spamResult = spamDetection.isSpam(req.body[field]);
            if (spamResult.isSpam) {
              spamChecks.push({
                field,
                reason: spamResult.reason,
                score: spamDetection.calculateSpamScore(req.body[field])
              });
              totalSpamScore += spamDetection.calculateSpamScore(req.body[field]);
            }
          }
        }
      }

      // Check for excessive links
      if (checkLinks && req.body) {
        const linkFields = ['message', 'content', 'comment', 'website'];
        
        for (const field of linkFields) {
          if (req.body[field]) {
            const linkCount = (req.body[field].match(/https?:\/\/[^\s]+/g) || []).length;
            if (linkCount > 3) {
              spamChecks.push({
                field,
                reason: `Contains ${linkCount} links (max allowed: 3)`,
                score: linkCount * 10
              });
              totalSpamScore += linkCount * 10;
            }
          }
        }
      }

      // Check for excessive caps
      if (checkCaps && req.body) {
        const textFields = ['name', 'subject', 'message', 'content'];
        
        for (const field of textFields) {
          if (req.body[field]) {
            const text = req.body[field];
            const capsCount = (text.match(/[A-Z]/g) || []).length;
            const totalChars = text.length;
            
            if (totalChars > 0 && capsCount / totalChars > 0.7) {
              spamChecks.push({
                field,
                reason: `Contains ${Math.round((capsCount / totalChars) * 100)}% capital letters`,
                score: 25
              });
              totalSpamScore += 25;
            }
          }
        }
      }

      // Check for suspicious words
      if (checkSuspiciousWords && req.body) {
        const textFields = ['message', 'content', 'comment', 'subject'];
        
        for (const field of textFields) {
          if (req.body[field]) {
            const lowerText = req.body[field].toLowerCase();
            const suspiciousWords = [
              'viagra', 'casino', 'lottery', 'winner', 'congratulations',
              'click here', 'free money', 'make money', 'work from home',
              'bitcoin', 'cryptocurrency', 'investment', 'guaranteed',
              'act now', 'limited time', 'exclusive offer', 'no obligation'
            ];
            
            const foundWords = suspiciousWords.filter(word => lowerText.includes(word));
            if (foundWords.length > 0) {
              spamChecks.push({
                field,
                reason: `Contains suspicious words: ${foundWords.join(', ')}`,
                score: foundWords.length * 15
              });
              totalSpamScore += foundWords.length * 15;
            }
          }
        }
      }

      // Check for repeated characters
      if (checkRepeatedChars && req.body) {
        const textFields = ['message', 'content', 'comment'];
        
        for (const field of textFields) {
          if (req.body[field]) {
            const repeatedChars = /(.)\1{4,}/.test(req.body[field]);
            if (repeatedChars) {
              spamChecks.push({
                field,
                reason: 'Contains too many repeated characters',
                score: 20
              });
              totalSpamScore += 20;
            }
          }
        }
      }

      // Check for rapid submissions (basic rate limiting) - Skip in development
      if (process.env.NODE_ENV !== 'development') {
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent') || '';
        const submissionKey = `spam:${ip}:${userAgent}`;
        
        // This would integrate with your cache/Redis system
        // For now, we'll use a simple in-memory check
        if (!global.spamSubmissionTracker) {
          global.spamSubmissionTracker = new Map();
        }
        
        const now = Date.now();
        const lastSubmission = global.spamSubmissionTracker.get(submissionKey);
        
        if (lastSubmission && (now - lastSubmission) < 5000) { // 5 seconds
          spamChecks.push({
            field: 'rate',
            reason: 'Rapid submission detected',
            score: 30
          });
          totalSpamScore += 30;
        }
        
        global.spamSubmissionTracker.set(submissionKey, now);
      }

      // Check if spam score exceeds threshold
      if (totalSpamScore > maxSpamScore) {
        if (logSpamAttempts) {
          console.log('Spam attempt detected:', {
            ip,
            userAgent,
            spamScore: totalSpamScore,
            checks: spamChecks,
            body: req.body,
            timestamp: new Date()
          });
        }

        return res.status(400).json({
          success: false,
          message: 'Content appears to be spam and cannot be processed',
          code: ERROR_CODES.SPAM_DETECTED,
          spamScore: totalSpamScore,
          checks: spamChecks
        });
      }

      // Add spam score to request for logging
      req.spamScore = totalSpamScore;
      req.spamChecks = spamChecks;

      next();
    } catch (error) {
      console.error('Spam protection error:', error);
      next(); // Continue on error to avoid blocking legitimate requests
    }
  };
};

// Honeypot middleware
const honeypot = (fieldName = 'website') => {
  return (req, res, next) => {
    // Check if honeypot field is filled (bots often fill all fields)
    if (req.body[fieldName] && req.body[fieldName].trim() !== '') {
      console.log('Honeypot triggered:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        honeypotValue: req.body[fieldName],
        timestamp: new Date()
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid submission',
        code: ERROR_CODES.SPAM_DETECTED
      });
    }

    // Remove honeypot field from body
    delete req.body[fieldName];
    next();
  };
};

// Time-based submission validation
const timeBasedValidation = (minTime = 3000) => { // 3 seconds minimum
  return (req, res, next) => {
    // Skip time validation in development
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    const startTime = req.startTime || Date.now();
    const submissionTime = Date.now() - startTime;

    if (submissionTime < minTime) {
      console.log('Too fast submission detected:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        submissionTime,
        minTime,
        timestamp: new Date()
      });

      return res.status(400).json({
        success: false,
        message: 'Submission too fast, please take your time',
        code: ERROR_CODES.SPAM_DETECTED
      });
    }

    next();
  };
};

// IP-based spam protection
const ipSpamProtection = () => {
  const blockedIPs = new Set();
  const suspiciousIPs = new Map(); // IP -> { count, lastSeen }

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Check if IP is blocked
    if (blockedIPs.has(ip)) {
      return res.status(403).json({
        success: false,
        message: 'IP address is blocked',
        code: ERROR_CODES.SPAM_DETECTED
      });
    }

    // Track suspicious activity
    const suspiciousData = suspiciousIPs.get(ip);
    if (suspiciousData) {
      // Reset count if last seen was more than 1 hour ago
      if (now - suspiciousData.lastSeen > 60 * 60 * 1000) {
        suspiciousIPs.set(ip, { count: 1, lastSeen: now });
      } else {
        suspiciousData.count++;
        suspiciousData.lastSeen = now;

        // Block IP if too many suspicious activities
        if (suspiciousData.count > 10) {
          blockedIPs.add(ip);
          console.log('IP blocked due to suspicious activity:', ip);
          
          return res.status(403).json({
            success: false,
            message: 'IP address is blocked due to suspicious activity',
            code: ERROR_CODES.SPAM_DETECTED
          });
        }
      }
    } else {
      suspiciousIPs.set(ip, { count: 1, lastSeen: now });
    }

    // Add spam score to request
    if (suspiciousData && suspiciousData.count > 3) {
      req.spamScore = (req.spamScore || 0) + (suspiciousData.count * 5);
    }

    next();
  };
};

// User agent validation
const userAgentValidation = () => {
  const suspiciousUserAgents = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
    'python', 'java', 'php', 'perl', 'ruby'
  ];

  return (req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    const lowerUserAgent = userAgent.toLowerCase();

    // Check for suspicious user agents
    const isSuspicious = suspiciousUserAgents.some(agent => 
      lowerUserAgent.includes(agent)
    );

    if (isSuspicious) {
      console.log('Suspicious user agent detected:', {
        ip: req.ip,
        userAgent,
        timestamp: new Date()
      });

      // Add to spam score but don't block completely
      req.spamScore = (req.spamScore || 0) + 10;
    }

    next();
  };
};

// Content length validation
const contentLengthValidation = (options = {}) => {
  const {
    minLength = 10,
    maxLength = 2000,
    fields = ['message', 'content', 'comment']
  } = options;

  return (req, res, next) => {
    for (const field of fields) {
      if (req.body[field]) {
        const length = req.body[field].length;
        
        if (length < minLength) {
          return res.status(400).json({
            success: false,
            message: `Content too short (minimum ${minLength} characters)`,
            code: ERROR_CODES.VALIDATION_ERROR
          });
        }
        
        if (length > maxLength) {
          return res.status(400).json({
            success: false,
            message: `Content too long (maximum ${maxLength} characters)`,
            code: ERROR_CODES.VALIDATION_ERROR
          });
        }
      }
    }

    next();
  };
};

// Combined spam protection middleware
const combinedSpamProtection = (options = {}) => {
  return [
    // Track request start time
    (req, res, next) => {
      req.startTime = Date.now();
      next();
    },
    
    // User agent validation
    userAgentValidation(),
    
    // IP-based protection
    ipSpamProtection(),
    
    // Honeypot
    honeypot(options.honeypotField || 'website'),
    
    // Time-based validation
    timeBasedValidation(options.minTime || 3000),
    
    // Content length validation
    contentLengthValidation(options.contentLength || {}),
    
    // Main spam protection
    spamProtection(options.spamProtection || {})
  ];
};

// Spam protection for specific endpoints
const endpointSpamProtection = {
  contact: combinedSpamProtection({
    honeypotField: 'website',
    minTime: 5000,
    contentLength: {
      minLength: 20,
      maxLength: 2000,
      fields: ['message']
    },
    spamProtection: {
      maxSpamScore: 40,
      checkContent: true,
      checkLinks: true,
      checkCaps: true,
      checkSuspiciousWords: true
    }
  }),

  newsletter: combinedSpamProtection({
    honeypotField: 'phone',
    minTime: 2000,
    spamProtection: {
      maxSpamScore: 30,
      checkContent: false,
      checkLinks: false,
      checkCaps: false,
      checkSuspiciousWords: false
    }
  }),

  comments: combinedSpamProtection({
    honeypotField: 'website',
    minTime: 3000,
    contentLength: {
      minLength: 10,
      maxLength: 2000,
      fields: ['content']
    },
    spamProtection: {
      maxSpamScore: 50,
      checkContent: true,
      checkLinks: true,
      checkCaps: true,
      checkSuspiciousWords: true,
      checkRepeatedChars: true
    }
  })
};

module.exports = {
  spamProtection,
  honeypot,
  timeBasedValidation,
  ipSpamProtection,
  userAgentValidation,
  contentLengthValidation,
  combinedSpamProtection,
  endpointSpamProtection
};
