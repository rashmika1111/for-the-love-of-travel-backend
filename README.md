# Love of Travel Backend API

A complete backend API for the Love of Travel main website that integrates with the existing Admin Panel CMS. This backend serves the public-facing website with content from the CMS and handles user interactions.

## Features

### 🚀 **Public Content APIs**
- Serve published content pages with sections
- Get published blog posts by slug with pagination
- List popular posts for homepage
- Get categories and posts by category
- Get tags and posts by tag
- Related posts suggestions

### 👥 **User Interaction APIs**
- Contact form submissions with email notifications
- Newsletter subscription management
- Post likes, shares, and bookmarks
- Comment system with moderation
- User interaction tracking

### 🔍 **Search & Discovery**
- Global search across posts, categories, and tags
- Advanced search with filters
- Search suggestions and popular terms
- Full-text search with relevance scoring

### 📊 **Analytics & Tracking**
- Page view tracking
- User interaction analytics
- Search query analytics
- Popular content metrics
- Real-time analytics dashboard

### ⚡ **Performance & Caching**
- Redis caching for frequently accessed content
- Response compression and optimization
- Rate limiting for public endpoints
- CDN-friendly headers

## Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- MongoDB 4.4+
- Redis 6.0+
- SMTP email service (Gmail, SendGrid, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd for-the-love-of-travel-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

## Environment Configuration

Copy `env.example` to `.env` and configure the following variables:

### Required Configuration

```env
# Server
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/love-of-travel

# Redis
REDIS_URL=redis://localhost:6379

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URLs
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
```

### Optional Configuration

```env
# Analytics
GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
MIXPANEL_TOKEN=your-mixpanel-token

# Security
JWT_SECRET=your-super-secret-jwt-key
BCRYPT_ROUNDS=12

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

## API Endpoints

### Content APIs

#### Get Published Content Page
```http
GET /api/content-page?version=published
```

#### Get Posts
```http
GET /api/posts?page=1&limit=10&category=travel&sortBy=publishedAt&sortOrder=desc
```

#### Get Single Post
```http
GET /api/posts/:slug
```

#### Get Popular Posts
```http
GET /api/posts/popular?limit=10
```

#### Get Categories
```http
GET /api/categories
```

#### Get Posts by Category
```http
GET /api/categories/:slug/posts?page=1&limit=10
```

#### Get Tags
```http
GET /api/tags
```

#### Get Posts by Tag
```http
GET /api/tags/:slug/posts?page=1&limit=10
```

#### Get Related Posts
```http
GET /api/posts/:postId/related?limit=5
```

### Interaction APIs

#### Like/Unlike Post
```http
POST /api/interactions/posts/:slug/like
```

#### Share Post
```http
POST /api/interactions/posts/:slug/share
Content-Type: application/json

{
  "platform": "facebook",
  "url": "https://example.com/post"
}
```

#### Get Post Comments
```http
GET /api/interactions/posts/:slug/comments?page=1&limit=20
```

#### Add Comment
```http
POST /api/interactions/posts/:slug/comments
Content-Type: application/json

{
  "author": {
    "name": "John Doe",
    "email": "john@example.com",
    "website": "https://johndoe.com"
  },
  "content": "Great post! Thanks for sharing.",
  "parentId": "optional-parent-comment-id"
}
```

#### Bookmark Post
```http
POST /api/interactions/posts/:slug/bookmark
```

#### Get User Bookmarks
```http
GET /api/interactions/user/bookmarks?page=1&limit=20
```

### Search APIs

#### Global Search
```http
GET /api/search?q=travel&type=all&page=1&limit=10
```

#### Search Posts
```http
GET /api/search/posts?q=travel&category=destinations&page=1&limit=10
```

#### Search Categories
```http
GET /api/search/categories?q=travel&page=1&limit=10
```

#### Search Tags
```http
GET /api/search/tags?q=travel&page=1&limit=10
```

#### Get Search Suggestions
```http
GET /api/search/suggestions?q=tra
```

#### Get Popular Search Terms
```http
GET /api/search/popular?limit=10
```

### Analytics APIs

#### Track Page View
```http
POST /api/analytics/view
Content-Type: application/json

{
  "path": "/posts/amazing-travel-destination",
  "data": {
    "duration": 120,
    "scrollDepth": 75
  }
}
```

#### Track Interaction
```http
POST /api/analytics/interaction
Content-Type: application/json

{
  "type": "click",
  "element": "like-button",
  "data": {
    "postId": "post-id"
  }
}
```

#### Get Analytics Dashboard
```http
GET /api/analytics/dashboard?timeframe=30d
```

#### Get Popular Pages
```http
GET /api/analytics/popular-pages?timeframe=7d&limit=20
```

#### Get Search Analytics
```http
GET /api/analytics/search?timeframe=30d&limit=50
```

### Contact APIs

#### Submit Contact Form
```http
POST /api/contact/contact
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Travel Inquiry",
  "message": "I'm interested in your travel services..."
}
```

#### Subscribe to Newsletter
```http
POST /api/contact/newsletter
Content-Type: application/json

{
  "email": "john@example.com",
  "preferences": {
    "frequency": "weekly",
    "categories": ["destinations", "travel-tips"],
    "language": "en"
  }
}
```

#### Unsubscribe from Newsletter
```http
POST /api/contact/newsletter/unsubscribe
Content-Type: application/json

{
  "email": "john@example.com",
  "reason": "Too many emails"
}
```

## Database Models

### Contact
```javascript
{
  name: String,
  email: String,
  subject: String,
  message: String,
  status: 'new' | 'read' | 'replied' | 'archived',
  priority: 'low' | 'medium' | 'high' | 'urgent',
  ip: String,
  userAgent: String,
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### Newsletter
```javascript
{
  email: String,
  status: 'active' | 'unsubscribed' | 'bounced' | 'complained',
  source: 'website' | 'popup' | 'footer' | 'admin' | 'import',
  preferences: {
    frequency: 'weekly' | 'monthly' | 'quarterly',
    categories: [String],
    language: String
  },
  metadata: Object,
  subscribedAt: Date,
  unsubscribedAt: Date
}
```

### PostInteraction
```javascript
{
  postId: ObjectId,
  type: 'like' | 'share' | 'view' | 'bookmark' | 'comment',
  userId: ObjectId,
  sessionId: String,
  ip: String,
  userAgent: String,
  metadata: Object,
  value: Number,
  createdAt: Date
}
```

### Comment
```javascript
{
  postId: ObjectId,
  author: {
    name: String,
    email: String,
    website: String,
    avatar: String
  },
  content: String,
  status: 'pending' | 'approved' | 'rejected' | 'spam',
  parentId: ObjectId,
  depth: Number,
  likes: Number,
  dislikes: Number,
  reports: Number,
  moderation: Object,
  metadata: Object,
  createdAt: Date,
  approvedAt: Date
}
```

### Analytics
```javascript
{
  type: 'view' | 'click' | 'search' | 'scroll' | 'exit' | 'form_submit' | 'download' | 'video_play' | 'video_complete',
  path: String,
  data: Object,
  userId: ObjectId,
  sessionId: String,
  ip: String,
  userAgent: String,
  metadata: Object,
  timestamp: Date,
  value: Number
}
```

## Rate Limiting

The API implements different rate limits for different endpoints:

- **General API**: 100 requests per 15 minutes
- **Contact Form**: 5 submissions per hour
- **Newsletter**: 3 subscriptions per hour
- **Comments**: 10 comments per hour
- **Search**: 30 searches per minute
- **Analytics**: 100 events per minute

## Caching Strategy

### Redis Caching
- **Content Page**: 24 hours
- **Popular Posts**: 30 minutes
- **Categories/Tags**: 24 hours
- **Search Results**: 5 minutes
- **Post Details**: 30 minutes
- **Related Posts**: 30 minutes

### Cache Invalidation
- Content page cache invalidated when content is published
- Post-related cache invalidated when post is updated
- Category/tag cache invalidated when categories/tags change
- Search cache invalidated when new content is published

## Security Features

### Input Validation
- Express-validator for request validation
- Zod schemas for TypeScript support
- Input sanitization with XSS protection
- MongoDB injection prevention

### Spam Protection
- Honeypot fields
- Rate limiting
- Content analysis for spam detection
- IP-based blocking
- User agent validation

### CORS Configuration
- Configured for frontend and admin domains
- Credentials support
- Preflight request handling

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message",
      "value": "invalidValue"
    }
  ]
}
```

### Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: Authentication required
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `DUPLICATE_ENTRY`: Resource already exists
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SPAM_DETECTED`: Content flagged as spam
- `INTERNAL_ERROR`: Server error

## Monitoring & Logging

### Winston Logging
- Structured JSON logging
- Error and combined log files
- Console output for development
- Request/response logging

### Health Checks
- Database connection status
- Redis connection status
- Email service status
- Overall system health

### Analytics Tracking
- Page view tracking
- User interaction tracking
- Search query analytics
- Performance metrics

## Development

### Scripts
```bash
# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure production MongoDB URI
- [ ] Set up Redis instance
- [ ] Configure SMTP email service
- [ ] Set secure JWT secret
- [ ] Configure CORS for production domains
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (nginx)

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://production-db:27017/love-of-travel
REDIS_URL=redis://production-redis:6379
SMTP_HOST=your-production-smtp-host
SMTP_USER=your-production-email
SMTP_PASS=your-production-password
FRONTEND_URL=https://your-frontend-domain.com
ADMIN_URL=https://your-admin-domain.com
JWT_SECRET=your-production-jwt-secret
```

## Integration with Admin Panel CMS

This backend is designed to integrate seamlessly with the existing Admin Panel CMS:

### Content Integration
- Fetches published content from CMS database
- Respects content status and publication dates
- Supports content versioning
- Handles content sections (hero, text, images, etc.)

### Cache Invalidation
- Webhook notifications for content updates
- Automatic cache invalidation on content publish
- Real-time content updates

### Authentication
- Uses existing admin authentication system
- JWT token validation
- Role-based access control

## Support

For support and questions:
- Email: support@loveoftravel.com
- Documentation: https://docs.loveoftravel.com/api
- Issues: GitHub Issues

## License

This project is licensed under the MIT License - see the LICENSE file for details.
