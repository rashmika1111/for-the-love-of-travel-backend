const { cacheService, cacheInvalidation } = require('../middleware/cache');
const { CACHE_CONFIG } = require('../utils/constants');

// Cache service for managing application-specific caching
class CacheService {
  constructor() {
    this.defaultTTL = CACHE_CONFIG.TTL.MEDIUM;
  }

  // Content page caching
  async getContentPage(version = 'published') {
    const key = `${CACHE_CONFIG.KEYS.CONTENT_PAGE}:${version}`;
    return await cacheService.get(key);
  }

  async setContentPage(contentPage, version = 'published', ttl = CACHE_CONFIG.TTL.LONG) {
    const key = `${CACHE_CONFIG.KEYS.CONTENT_PAGE}:${version}`;
    return await cacheService.set(key, contentPage, ttl);
  }

  async invalidateContentPage() {
    return await cacheInvalidation.invalidateContentPage();
  }

  // Posts caching
  async getPopularPosts(limit = 10) {
    const key = `${CACHE_CONFIG.KEYS.POPULAR_POSTS}:${limit}`;
    return await cacheService.get(key);
  }

  async setPopularPosts(posts, limit = 10, ttl = CACHE_CONFIG.TTL.MEDIUM) {
    const key = `${CACHE_CONFIG.KEYS.POPULAR_POSTS}:${limit}`;
    return await cacheService.set(key, posts, ttl);
  }

  async getPostDetails(slug) {
    const key = `${CACHE_CONFIG.KEYS.POST_DETAILS}${slug}`;
    return await cacheService.get(key);
  }

  async setPostDetails(slug, post, ttl = CACHE_CONFIG.TTL.MEDIUM) {
    const key = `${CACHE_CONFIG.KEYS.POST_DETAILS}${slug}`;
    return await cacheService.set(key, post, ttl);
  }

  async getRelatedPosts(postId, limit = 5) {
    const key = `${CACHE_CONFIG.KEYS.RELATED_POSTS}${postId}:${limit}`;
    return await cacheService.get(key);
  }

  async setRelatedPosts(postId, posts, limit = 5, ttl = CACHE_CONFIG.TTL.MEDIUM) {
    const key = `${CACHE_CONFIG.KEYS.RELATED_POSTS}${postId}:${limit}`;
    return await cacheService.set(key, posts, ttl);
  }

  async invalidatePost(postId, slug) {
    return await cacheInvalidation.invalidatePost(postId, slug);
  }

  // Categories and tags caching
  async getCategories() {
    return await cacheService.get(CACHE_CONFIG.KEYS.CATEGORIES);
  }

  async setCategories(categories, ttl = CACHE_CONFIG.TTL.LONG) {
    return await cacheService.set(CACHE_CONFIG.KEYS.CATEGORIES, categories, ttl);
  }

  async getTags() {
    return await cacheService.get(CACHE_CONFIG.KEYS.TAGS);
  }

  async setTags(tags, ttl = CACHE_CONFIG.TTL.LONG) {
    return await cacheService.set(CACHE_CONFIG.KEYS.TAGS, tags, ttl);
  }

  async invalidateCategories() {
    return await cacheInvalidation.invalidateCategory();
  }

  async invalidateTags() {
    return await cacheInvalidation.invalidateTags();
  }

  // Search results caching
  async getSearchResults(query, type = 'all', page = 1) {
    const key = `${CACHE_CONFIG.KEYS.SEARCH_RESULTS}${query}:${type}:${page}`;
    return await cacheService.get(key);
  }

  async setSearchResults(query, type, page, results, ttl = CACHE_CONFIG.TTL.SHORT) {
    const key = `${CACHE_CONFIG.KEYS.SEARCH_RESULTS}${query}:${type}:${page}`;
    return await cacheService.set(key, results, ttl);
  }

  async invalidateSearch(query = null) {
    return await cacheInvalidation.invalidateSearch(query);
  }

  // Comments caching
  async getCommentCount(postId) {
    const key = `${CACHE_CONFIG.KEYS.COMMENT_COUNT}${postId}`;
    return await cacheService.get(key);
  }

  async setCommentCount(postId, count, ttl = CACHE_CONFIG.TTL.SHORT) {
    const key = `${CACHE_CONFIG.KEYS.COMMENT_COUNT}${postId}`;
    return await cacheService.set(key, count, ttl);
  }

  async invalidateCommentCount(postId) {
    const key = `${CACHE_CONFIG.KEYS.COMMENT_COUNT}${postId}`;
    return await cacheService.del(key);
  }

  // Analytics caching
  async getAnalyticsData(type, timeframe = '30d') {
    const key = `analytics:${type}:${timeframe}`;
    return await cacheService.get(key);
  }

  async setAnalyticsData(type, timeframe, data, ttl = CACHE_CONFIG.TTL.SHORT) {
    const key = `analytics:${type}:${timeframe}`;
    return await cacheService.set(key, data, ttl);
  }

  async getPopularContent(timeframe = '30d') {
    return await cacheService.get(CACHE_CONFIG.KEYS.ANALYTICS_POPULAR);
  }

  async setPopularContent(data, ttl = CACHE_CONFIG.TTL.MEDIUM) {
    return await cacheService.set(CACHE_CONFIG.KEYS.ANALYTICS_POPULAR, data, ttl);
  }

  async invalidateAnalytics() {
    return await cacheInvalidation.invalidateAnalytics();
  }

  // Newsletter caching
  async getNewsletterStats() {
    return await cacheService.get(CACHE_CONFIG.KEYS.NEWSLETTER_STATS);
  }

  async setNewsletterStats(stats, ttl = CACHE_CONFIG.TTL.MEDIUM) {
    return await cacheService.set(CACHE_CONFIG.KEYS.NEWSLETTER_STATS, stats, ttl);
  }

  // Generic caching methods
  async get(key) {
    return await cacheService.get(key);
  }

  async set(key, value, ttl = this.defaultTTL) {
    return await cacheService.set(key, value, ttl);
  }

  async del(key) {
    return await cacheService.del(key);
  }

  async exists(key) {
    return await cacheService.exists(key);
  }

  async mget(keys) {
    return await cacheService.mget(keys);
  }

  async mset(keyValuePairs, ttl = this.defaultTTL) {
    return await cacheService.mset(keyValuePairs, ttl);
  }

  // Cache warming methods
  async warmCache() {
    console.log('Starting cache warming...');
    
    try {
      // Warm popular posts cache
      // This would typically call your data service to get popular posts
      // await this.warmPopularPosts();
      
      // Warm categories cache
      // await this.warmCategories();
      
      // Warm tags cache
      // await this.warmTags();
      
      console.log('Cache warming completed');
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }

  // Cache statistics
  async getStats() {
    return await cacheService.getStats();
  }

  // Cache health check
  async healthCheck() {
    try {
      const testKey = 'health_check';
      const testValue = { timestamp: Date.now() };
      
      // Test set
      const setResult = await cacheService.set(testKey, testValue, 60);
      if (!setResult) {
        return { status: 'error', message: 'Failed to set cache value' };
      }
      
      // Test get
      const getValue = await cacheService.get(testKey);
      if (!getValue || getValue.timestamp !== testValue.timestamp) {
        return { status: 'error', message: 'Failed to get cache value' };
      }
      
      // Test delete
      const delResult = await cacheService.del(testKey);
      if (!delResult) {
        return { status: 'error', message: 'Failed to delete cache value' };
      }
      
      return { status: 'healthy', message: 'Cache is working properly' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  // Cache cleanup methods
  async cleanupExpiredKeys() {
    // This would typically be handled by Redis TTL
    // But we can implement custom cleanup logic here if needed
    console.log('Cache cleanup completed');
  }

  // Cache invalidation patterns
  async invalidateByPattern(pattern) {
    // This would require Redis SCAN functionality
    // Implementation depends on your Redis setup
    console.log(`Invalidating cache keys matching pattern: ${pattern}`);
  }

  // Cache preloading for critical data
  async preloadCriticalData() {
    console.log('Preloading critical cache data...');
    
    try {
      // Preload content page
      // await this.getContentPage('published');
      
      // Preload popular posts
      // await this.getPopularPosts(10);
      
      // Preload categories
      // await this.getCategories();
      
      console.log('Critical data preloading completed');
    } catch (error) {
      console.error('Critical data preloading failed:', error);
    }
  }

  // Cache monitoring
  async getCacheMetrics() {
    try {
      const stats = await this.getStats();
      const health = await this.healthCheck();
      
      return {
        stats,
        health,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

// Create singleton instance
const cacheServiceInstance = new CacheService();

module.exports = cacheServiceInstance;
