const searchService = require('../services/searchService');
const cacheService = require('../services/cacheService');
const { API_RESPONSES, HTTP_STATUS, ERROR_CODES, SEARCH_CONFIG } = require('../utils/constants');

// Search controller
class SearchController {
  // Global search across all content types
  async globalSearch(req, res) {
    try {
      const {
        q: query,
        type = 'all',
        page = 1,
        limit = SEARCH_CONFIG.DEFAULT_RESULTS_PER_PAGE,
        category,
        tag,
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = req.query;
      
      // Validate query
      if (!query || query.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Search query must be at least ${SEARCH_CONFIG.MIN_QUERY_LENGTH} characters long`,
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }
      
      if (query.length > SEARCH_CONFIG.MAX_QUERY_LENGTH) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Search query cannot exceed ${SEARCH_CONFIG.MAX_QUERY_LENGTH} characters`,
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }
      
      // Check cache first
      const cacheKey = `${query}:${type}:${page}:${category || 'all'}:${tag || 'all'}`;
      let searchResults = await cacheService.get(`search:${cacheKey}`);
      
      if (!searchResults) {
        // Perform search
        searchResults = await searchService.globalSearch(query, {
          type,
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit),
          sortBy,
          sortOrder,
          category,
          tag
        });
        
        // Cache results for 5 minutes
        await cacheService.set(`search:${cacheKey}`, searchResults, 300);
      }
      
      // Track search query for analytics
      await searchService.trackSearchQuery(query, searchResults.total, req.user?.id, req.sessionId);
      
      // Highlight search terms in results
      const highlightedResults = this.highlightSearchResults(searchResults.results, query);
      
      res.json({
        success: true,
        data: highlightedResults,
        meta: {
          query,
          type,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: searchResults.total,
            pages: Math.ceil(searchResults.total / parseInt(limit)),
            hasNext: (parseInt(page) * parseInt(limit)) < searchResults.total,
            hasPrev: page > 1
          },
          filters: {
            category,
            tag,
            sortBy,
            sortOrder
          },
          cached: !!searchResults,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Global search error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Search failed',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Search posts only
  async searchPosts(req, res) {
    try {
      const {
        q: query,
        page = 1,
        limit = SEARCH_CONFIG.DEFAULT_RESULTS_PER_PAGE,
        category,
        tag,
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = req.query;
      
      // Validate query
      if (!query || query.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Search query must be at least ${SEARCH_CONFIG.MIN_QUERY_LENGTH} characters long`,
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }
      
      // Check cache first
      const cacheKey = `posts:${query}:${page}:${category || 'all'}:${tag || 'all'}`;
      let searchResults = await cacheService.get(`search:${cacheKey}`);
      
      if (!searchResults) {
        // Perform search
        searchResults = await searchService.searchPosts(query, {
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit),
          sortBy,
          sortOrder,
          category,
          tag
        });
        
        // Cache results for 5 minutes
        await cacheService.set(`search:${cacheKey}`, searchResults, 300);
      }
      
      // Track search query for analytics
      await searchService.trackSearchQuery(query, searchResults.total, req.user?.id, req.sessionId);
      
      // Highlight search terms in results
      const highlightedResults = this.highlightSearchResults(searchResults.results, query);
      
      res.json({
        success: true,
        data: highlightedResults,
        meta: {
          query,
          type: 'posts',
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: searchResults.total,
            pages: Math.ceil(searchResults.total / parseInt(limit)),
            hasNext: (parseInt(page) * parseInt(limit)) < searchResults.total,
            hasPrev: page > 1
          },
          filters: {
            category,
            tag,
            sortBy,
            sortOrder
          },
          cached: !!searchResults,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Search posts error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Post search failed',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Search categories
  async searchCategories(req, res) {
    try {
      const {
        q: query,
        page = 1,
        limit = 10
      } = req.query;
      
      // Validate query
      if (!query || query.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Search query must be at least ${SEARCH_CONFIG.MIN_QUERY_LENGTH} characters long`,
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }
      
      // Check cache first
      const cacheKey = `categories:${query}:${page}`;
      let searchResults = await cacheService.get(`search:${cacheKey}`);
      
      if (!searchResults) {
        // Perform search
        searchResults = await searchService.searchCategories(query, {
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit)
        });
        
        // Cache results for 10 minutes
        await cacheService.set(`search:${cacheKey}`, searchResults, 600);
      }
      
      res.json({
        success: true,
        data: searchResults.results,
        meta: {
          query,
          type: 'categories',
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: searchResults.total,
            pages: Math.ceil(searchResults.total / parseInt(limit)),
            hasNext: (parseInt(page) * parseInt(limit)) < searchResults.total,
            hasPrev: page > 1
          },
          cached: !!searchResults,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Search categories error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Category search failed',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Search tags
  async searchTags(req, res) {
    try {
      const {
        q: query,
        page = 1,
        limit = 10
      } = req.query;
      
      // Validate query
      if (!query || query.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Search query must be at least ${SEARCH_CONFIG.MIN_QUERY_LENGTH} characters long`,
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }
      
      // Check cache first
      const cacheKey = `tags:${query}:${page}`;
      let searchResults = await cacheService.get(`search:${cacheKey}`);
      
      if (!searchResults) {
        // Perform search
        searchResults = await searchService.searchTags(query, {
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit)
        });
        
        // Cache results for 10 minutes
        await cacheService.set(`search:${cacheKey}`, searchResults, 600);
      }
      
      res.json({
        success: true,
        data: searchResults.results,
        meta: {
          query,
          type: 'tags',
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: searchResults.total,
            pages: Math.ceil(searchResults.total / parseInt(limit)),
            hasNext: (parseInt(page) * parseInt(limit)) < searchResults.total,
            hasPrev: page > 1
          },
          cached: !!searchResults,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Search tags error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Tag search failed',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get search suggestions
  async getSearchSuggestions(req, res) {
    try {
      const { q: query } = req.query;
      
      if (!query || query.trim().length < 2) {
        return res.json({
          success: true,
          data: [],
          meta: {
            query: query || '',
            timestamp: new Date()
          }
        });
      }
      
      // Check cache first
      const cacheKey = `suggestions:${query}`;
      let suggestions = await cacheService.get(`search:${cacheKey}`);
      
      if (!suggestions) {
        // Get suggestions
        suggestions = await searchService.getSearchSuggestions(query, 5);
        
        // Cache suggestions for 1 hour
        await cacheService.set(`search:${cacheKey}`, suggestions, 3600);
      }
      
      res.json({
        success: true,
        data: suggestions,
        meta: {
          query,
          cached: !!suggestions,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get search suggestions error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get search suggestions',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get popular search terms
  async getPopularSearchTerms(req, res) {
    try {
      const { limit = 10 } = req.query;
      
      // Check cache first
      const cacheKey = `popular:${limit}`;
      let popularTerms = await cacheService.get(`search:${cacheKey}`);
      
      if (!popularTerms) {
        // Get popular terms (this would typically come from analytics)
        popularTerms = await this.getPopularTermsFromAnalytics(parseInt(limit));
        
        // Cache for 1 hour
        await cacheService.set(`search:${cacheKey}`, popularTerms, 3600);
      }
      
      res.json({
        success: true,
        data: popularTerms,
        meta: {
          limit: parseInt(limit),
          cached: !!popularTerms,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get popular search terms error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get popular search terms',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get search statistics
  async getSearchStats(req, res) {
    try {
      const { timeframe = '30d' } = req.query;
      
      // Check cache first
      const cacheKey = `stats:${timeframe}`;
      let stats = await cacheService.get(`search:${cacheKey}`);
      
      if (!stats) {
        // Get search statistics
        stats = await searchService.getSearchStats(timeframe);
        
        // Cache for 30 minutes
        await cacheService.set(`search:${cacheKey}`, stats, 1800);
      }
      
      res.json({
        success: true,
        data: stats,
        meta: {
          timeframe,
          cached: !!stats,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get search stats error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get search statistics',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Advanced search with filters
  async advancedSearch(req, res) {
    try {
      const {
        q: query,
        type = 'all',
        page = 1,
        limit = SEARCH_CONFIG.DEFAULT_RESULTS_PER_PAGE,
        category,
        tag,
        dateFrom,
        dateTo,
        author,
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = req.query;
      
      // Validate query
      if (!query || query.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Search query must be at least ${SEARCH_CONFIG.MIN_QUERY_LENGTH} characters long`,
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }
      
      // Build advanced search options
      const searchOptions = {
        type,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        sortBy,
        sortOrder,
        category,
        tag,
        dateFrom,
        dateTo,
        author
      };
      
      // Check cache first
      const cacheKey = `advanced:${JSON.stringify(searchOptions)}`;
      let searchResults = await cacheService.get(`search:${cacheKey}`);
      
      if (!searchResults) {
        // Perform advanced search
        searchResults = await this.performAdvancedSearch(query, searchOptions);
        
        // Cache results for 5 minutes
        await cacheService.set(`search:${cacheKey}`, searchResults, 300);
      }
      
      // Track search query for analytics
      await searchService.trackSearchQuery(query, searchResults.total, req.user?.id, req.sessionId);
      
      // Highlight search terms in results
      const highlightedResults = this.highlightSearchResults(searchResults.results, query);
      
      res.json({
        success: true,
        data: highlightedResults,
        meta: {
          query,
          type,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: searchResults.total,
            pages: Math.ceil(searchResults.total / parseInt(limit)),
            hasNext: (parseInt(page) * parseInt(limit)) < searchResults.total,
            hasPrev: page > 1
          },
          filters: {
            category,
            tag,
            dateFrom,
            dateTo,
            author,
            sortBy,
            sortOrder
          },
          cached: !!searchResults,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Advanced search error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Advanced search failed',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Helper methods
  highlightSearchResults(results, query) {
    if (!results || !query) return results;
    
    const searchTerms = searchService.tokenize(query);
    
    if (Array.isArray(results)) {
      return results.map(result => this.highlightResult(result, searchTerms));
    } else if (results.posts) {
      return {
        ...results,
        posts: results.posts.map(post => this.highlightResult(post, searchTerms)),
        categories: results.categories ? results.categories.map(cat => this.highlightResult(cat, searchTerms)) : [],
        tags: results.tags ? results.tags.map(tag => this.highlightResult(tag, searchTerms)) : []
      };
    }
    
    return results;
  }

  highlightResult(result, searchTerms) {
    if (!result || !searchTerms) return result;
    
    const highlighted = { ...result };
    
    // Highlight title
    if (highlighted.title) {
      highlighted.title = searchService.highlightSearchTerms(highlighted.title, searchTerms);
    }
    
    // Highlight excerpt
    if (highlighted.excerpt) {
      highlighted.excerpt = searchService.highlightSearchTerms(highlighted.excerpt, searchTerms);
    }
    
    // Highlight content (first 200 characters)
    if (highlighted.content) {
      const contentPreview = highlighted.content.substring(0, 200) + '...';
      highlighted.contentPreview = searchService.highlightSearchTerms(contentPreview, searchTerms);
    }
    
    // Highlight name for categories and tags
    if (highlighted.name) {
      highlighted.name = searchService.highlightSearchTerms(highlighted.name, searchTerms);
    }
    
    return highlighted;
  }

  async getPopularTermsFromAnalytics(limit) {
    // This would typically query your analytics database
    // For now, return some common travel-related terms
    const commonTerms = [
      'travel', 'destination', 'vacation', 'trip', 'adventure',
      'beach', 'mountain', 'city', 'culture', 'food',
      'hotel', 'flight', 'budget', 'luxury', 'backpacking'
    ];
    
    return commonTerms.slice(0, limit);
  }

  async performAdvancedSearch(query, options) {
    // This would implement advanced search logic
    // For now, delegate to the appropriate search method
    if (options.type === 'posts') {
      return await searchService.searchPosts(query, options);
    } else if (options.type === 'categories') {
      return await searchService.searchCategories(query, options);
    } else if (options.type === 'tags') {
      return await searchService.searchTags(query, options);
    } else {
      return await searchService.globalSearch(query, options);
    }
  }
}

// Create singleton instance
const searchController = new SearchController();

module.exports = searchController;
