# Redis Setup Guide

## Issue Fixed
The backend was trying to connect to Redis but Redis wasn't running, causing connection errors.

## Solution Implemented
Made Redis optional in the backend configuration. The server will now:
- Try to connect to Redis if available
- Continue running without Redis if connection fails
- Log appropriate messages for both scenarios

## Environment Configuration

Create a `.env` file in the `for-the-love-of-travel-backend` directory with the following content:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/love-of-travel

# Redis Configuration (optional - comment out if Redis is not available)
# REDIS_URL=redis://localhost:6379
# REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_EXPIRES_IN=7d

# Email Configuration (SMTP) - configure these for email functionality
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URLs
FRONTEND_URL=http://localhost:3001
ADMIN_URL=http://localhost:3001

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Security Configuration
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-here-change-this-in-production
```

## Options for Redis

### Option 1: Run without Redis (Recommended for development)
- Comment out or remove the `REDIS_URL` line in your `.env` file
- The backend will run without caching
- All functionality will work except caching

### Option 2: Install and run Redis
1. **Windows**: Download Redis from https://github.com/microsoftarchive/redis/releases
2. **macOS**: `brew install redis` then `brew services start redis`
3. **Linux**: `sudo apt-get install redis-server` then `sudo systemctl start redis`

### Option 3: Use Redis Cloud (Free tier available)
1. Sign up at https://redis.com/try-free/
2. Get your connection URL
3. Update `REDIS_URL` in your `.env` file

## Changes Made

### 1. Updated `server.js`
- Added try-catch around Redis initialization
- Server continues even if Redis fails to connect
- Logs appropriate warning messages

### 2. Updated `src/middleware/cache.js`
- Added connection timeout (5 seconds)
- Better error handling
- Graceful fallback when Redis is unavailable
- Updated health check to show "disabled" status

## Testing

1. **Without Redis**: The backend should start successfully and show "Redis initialization failed, continuing without cache"
2. **With Redis**: The backend should connect to Redis and show "Connected to Redis"

## Benefits

- ✅ Backend runs without Redis dependency
- ✅ Caching is optional, not required
- ✅ Better error handling and logging
- ✅ Graceful degradation when Redis is unavailable
- ✅ All API endpoints work regardless of Redis status

## Next Steps

1. Create the `.env` file with the configuration above
2. Start the backend: `npm run dev`
3. The server should start without Redis errors
4. Test the contact form and newsletter functionality
