const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const winston = require('winston');

// Load environment variables
dotenv.config();

// Import utilities and constants
const { ENV_VARS, CORS_CONFIG, HTTP_STATUS, ERROR_CODES } = require('./src/utils/constants');

// Import middleware
const { initRedis } = require('./src/middleware/cache');
const { generalLimiter } = require('./src/middleware/rateLimiter');
const { analyticsMiddleware } = require('./src/middleware/analytics');

// Import routes
const publicRoutes = require('./src/routes/public');
const postsRoutes = require('./src/routes/posts');
const authorsRoutes = require('./src/routes/authors');
const interactionRoutes = require('./src/routes/interactions');
const searchRoutes = require('./src/routes/search');
const analyticsRoutes = require('./src/routes/analytics');
const contactRoutes = require('./src/routes/contact');

// Import services
const emailService = require('./src/services/emailService');
const cacheService = require('./src/services/cacheService');

// Configure Winston logger
const logger = winston.createLogger({
  level: ENV_VARS.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'love-of-travel-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add console transport for non-production environments
if (ENV_VARS.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create Express app
const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors(CORS_CONFIG));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Data sanitization middleware
app.use(mongoSanitize());
app.use(hpp());

// Rate limiting
app.use(generalLimiter);

// Request tracking middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  req.logger = logger;
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: ENV_VARS.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    };

    // Check database connection
    if (mongoose.connection.readyState === 1) {
      health.database = 'connected';
    } else {
      health.database = 'disconnected';
      health.status = 'unhealthy';
    }

    // Check Redis connection
    const cacheHealth = await cacheService.healthCheck();
    health.cache = cacheHealth.status;

    // Check email service
    const emailHealth = await emailService.healthCheck();
    health.email = emailHealth.status;

    const statusCode = health.status === 'healthy' ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/content-page', publicRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/authors', authorsRoutes);
app.use('/api/categories', publicRoutes);
app.use('/api/tags', publicRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', contactRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Love of Travel API',
    version: '1.0.0',
    description: 'Backend API for Love of Travel main website',
    endpoints: {
      content: '/api/content-page',
      posts: '/api/posts',
      categories: '/api/categories',
      tags: '/api/tags',
      interactions: '/api/interactions',
      search: '/api/search',
      analytics: '/api/analytics',
      contact: '/api/contact',
      newsletter: '/api/newsletter'
    },
    documentation: 'https://docs.loveoftravel.com/api',
    support: 'support@loveoftravel.com'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: 'API endpoint not found',
    code: ERROR_CODES.NOT_FOUND,
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  const isDevelopment = ENV_VARS.NODE_ENV === 'development';
  
  res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: isDevelopment ? error.message : 'Internal server error',
    code: error.code || ERROR_CODES.INTERNAL_ERROR,
    ...(isDevelopment && { stack: error.stack })
  });
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close database connection
      await mongoose.connection.close();
      logger.info('Database connection closed');
      
      // Close Redis connection
      // await redisClient.quit();
      logger.info('Redis connection closed');
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize services and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(ENV_VARS.MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Initialize Redis (optional)
    try {
      await initRedis();
      logger.info('Redis initialized');
    } catch (error) {
      logger.warn('Redis initialization failed, continuing without cache:', error.message);
    }

    // Initialize email service
    await emailService.initialize();
    logger.info('Email service initialized');

    // Start HTTP server
    const server = app.listen(ENV_VARS.PORT, () => {
      logger.info(`Server running on port ${ENV_VARS.PORT} in ${ENV_VARS.NODE_ENV} mode`);
      logger.info(`API documentation available at http://localhost:${ENV_VARS.PORT}/api`);
      logger.info(`Health check available at http://localhost:${ENV_VARS.PORT}/health`);
    });

    // Store server reference for graceful shutdown
    global.server = server;

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
