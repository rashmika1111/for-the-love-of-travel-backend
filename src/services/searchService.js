const { SEARCH_CONFIG } = require('../utils/constants');

// Search service class
class SearchService {
  constructor() {
    this.searchIndex = new Map();
    this.stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
      'had', 'what', 'said', 'each', 'which', 'their', 'time', 'if',
      'up', 'out', 'many', 'then', 'them', 'can', 'only', 'other',
      'new', 'some', 'could', 'these', 'may', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their'
    ]);
  }

  // Tokenize text for search
  tokenize(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/)
      .filter(token => token.length > 1 && !this.stopWords.has(token))
      .map(token => this.stem(token));
  }

  // Simple stemming (can be enhanced with a proper stemmer)
  stem(word) {
    // Basic stemming rules
    if (word.endsWith('ing') && word.length > 5) {
      return word.slice(0, -3);
    }
    if (word.endsWith('ed') && word.length > 4) {
      return word.slice(0, -2);
    }
    if (word.endsWith('s') && word.length > 3) {
      return word.slice(0, -1);
    }
    return word;
  }

  // Calculate TF-IDF score
  calculateTFIDF(term, document, allDocuments) {
    const tf = this.calculateTF(term, document);
    const idf = this.calculateIDF(term, allDocuments);
    return tf * idf;
  }

  // Calculate Term Frequency
  calculateTF(term, document) {
    const tokens = this.tokenize(document);
    const termCount = tokens.filter(token => token === term).length;
    return termCount / tokens.length;
  }

  // Calculate Inverse Document Frequency
  calculateIDF(term, allDocuments) {
    const documentsContainingTerm = allDocuments.filter(doc => 
      this.tokenize(doc).includes(term)
    ).length;
    
    if (documentsContainingTerm === 0) return 0;
    return Math.log(allDocuments.length / documentsContainingTerm);
  }

  // Search posts
  async searchPosts(query, options = {}) {
    const {
      limit = SEARCH_CONFIG.DEFAULT_RESULTS_PER_PAGE,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc',
      category = null,
      tag = null,
      status = 'published'
    } = options;

    try {
      // This would typically query your database
      // For now, we'll simulate the search
      const searchTerms = this.tokenize(query);
      
      if (searchTerms.length === 0) {
        return {
          results: [],
          total: 0,
          page: Math.floor(offset / limit) + 1,
          limit,
          hasMore: false
        };
      }

      // Simulate database query
      const posts = await this.getPostsFromDatabase({
        searchTerms,
        category,
        tag,
        status,
        limit,
        offset,
        sortBy,
        sortOrder
      });

      // Calculate relevance scores
      const scoredPosts = posts.map(post => ({
        ...post,
        relevanceScore: this.calculateRelevanceScore(searchTerms, post)
      }));

      // Sort by relevance if requested
      if (sortBy === 'relevance') {
        scoredPosts.sort((a, b) => 
          sortOrder === 'desc' ? b.relevanceScore - a.relevanceScore : a.relevanceScore - b.relevanceScore
        );
      }

      return {
        results: scoredPosts,
        total: scoredPosts.length,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: scoredPosts.length === limit
      };
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  // Search categories
  async searchCategories(query, options = {}) {
    const { limit = 10, offset = 0 } = options;

    try {
      const searchTerms = this.tokenize(query);
      
      if (searchTerms.length === 0) {
        return {
          results: [],
          total: 0,
          page: Math.floor(offset / limit) + 1,
          limit,
          hasMore: false
        };
      }

      // Simulate database query
      const categories = await this.getCategoriesFromDatabase({
        searchTerms,
        limit,
        offset
      });

      return {
        results: categories,
        total: categories.length,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: categories.length === limit
      };
    } catch (error) {
      console.error('Category search error:', error);
      throw error;
    }
  }

  // Search tags
  async searchTags(query, options = {}) {
    const { limit = 10, offset = 0 } = options;

    try {
      const searchTerms = this.tokenize(query);
      
      if (searchTerms.length === 0) {
        return {
          results: [],
          total: 0,
          page: Math.floor(offset / limit) + 1,
          limit,
          hasMore: false
        };
      }

      // Simulate database query
      const tags = await this.getTagsFromDatabase({
        searchTerms,
        limit,
        offset
      });

      return {
        results: tags,
        total: tags.length,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: tags.length === limit
      };
    } catch (error) {
      console.error('Tag search error:', error);
      throw error;
    }
  }

  // Global search across all content types
  async globalSearch(query, options = {}) {
    const {
      type = 'all',
      limit = SEARCH_CONFIG.DEFAULT_RESULTS_PER_PAGE,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = options;

    try {
      const searchTerms = this.tokenize(query);
      
      if (searchTerms.length === 0) {
        return {
          results: {
            posts: [],
            categories: [],
            tags: []
          },
          total: 0,
          page: Math.floor(offset / limit) + 1,
          limit,
          hasMore: false
        };
      }

      const results = {
        posts: [],
        categories: [],
        tags: []
      };

      // Search posts
      if (type === 'all' || type === 'posts') {
        const postsResult = await this.searchPosts(query, {
          limit: Math.floor(limit * 0.7), // 70% of results
          offset: Math.floor(offset * 0.7),
          sortBy,
          sortOrder
        });
        results.posts = postsResult.results;
      }

      // Search categories
      if (type === 'all' || type === 'categories') {
        const categoriesResult = await this.searchCategories(query, {
          limit: Math.floor(limit * 0.2), // 20% of results
          offset: Math.floor(offset * 0.2)
        });
        results.categories = categoriesResult.results;
      }

      // Search tags
      if (type === 'all' || type === 'tags') {
        const tagsResult = await this.searchTags(query, {
          limit: Math.floor(limit * 0.1), // 10% of results
          offset: Math.floor(offset * 0.1)
        });
        results.tags = tagsResult.results;
      }

      const total = results.posts.length + results.categories.length + results.tags.length;

      return {
        results,
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: total === limit
      };
    } catch (error) {
      console.error('Global search error:', error);
      throw error;
    }
  }

  // Calculate relevance score for a post
  calculateRelevanceScore(searchTerms, post) {
    let score = 0;
    const postText = `${post.title} ${post.excerpt} ${post.content}`.toLowerCase();
    const postTokens = this.tokenize(postText);

    // Title matches get higher weight
    const titleTokens = this.tokenize(post.title);
    searchTerms.forEach(term => {
      if (titleTokens.includes(term)) {
        score += 10;
      }
    });

    // Content matches
    searchTerms.forEach(term => {
      const termCount = postTokens.filter(token => token === term).length;
      score += termCount * 2;
    });

    // Exact phrase matches
    const queryPhrase = searchTerms.join(' ');
    if (postText.includes(queryPhrase)) {
      score += 15;
    }

    // Category and tag matches
    if (post.category) {
      const categoryTokens = this.tokenize(post.category.name);
      searchTerms.forEach(term => {
        if (categoryTokens.includes(term)) {
          score += 5;
        }
      });
    }

    if (post.tags && post.tags.length > 0) {
      post.tags.forEach(tag => {
        const tagTokens = this.tokenize(tag.name);
        searchTerms.forEach(term => {
          if (tagTokens.includes(term)) {
            score += 3;
          }
        });
      });
    }

    return score;
  }

  // Get search suggestions
  async getSearchSuggestions(query, limit = 5) {
    try {
      const searchTerms = this.tokenize(query);
      
      if (searchTerms.length === 0) {
        return [];
      }

      // Get popular search terms that start with the query
      const suggestions = await this.getPopularSearchTerms(searchTerms[0], limit);
      
      return suggestions;
    } catch (error) {
      console.error('Search suggestions error:', error);
      return [];
    }
  }

  // Get popular search terms
  async getPopularSearchTerms(prefix, limit = 10) {
    try {
      // This would typically query your analytics database
      // For now, we'll return some common travel-related terms
      const commonTerms = [
        'travel', 'destination', 'vacation', 'trip', 'adventure',
        'beach', 'mountain', 'city', 'culture', 'food',
        'hotel', 'flight', 'budget', 'luxury', 'backpacking'
      ];

      return commonTerms
        .filter(term => term.startsWith(prefix.toLowerCase()))
        .slice(0, limit);
    } catch (error) {
      console.error('Popular search terms error:', error);
      return [];
    }
  }

  // Highlight search terms in text
  highlightSearchTerms(text, searchTerms, highlightTags = SEARCH_CONFIG.HIGHLIGHT_TAGS) {
    if (!text || !searchTerms || searchTerms.length === 0) {
      return text;
    }

    let highlightedText = text;
    const [openTag, closeTag] = highlightTags;

    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, `${openTag}$1${closeTag}`);
    });

    return highlightedText;
  }

  // Database query methods (these would be implemented based on your database)
  async getPostsFromDatabase(options) {
    // This is a placeholder - implement based on your database
    // You would typically use Mongoose, Sequelize, or raw SQL queries here
    return [];
  }

  async getCategoriesFromDatabase(options) {
    // This is a placeholder - implement based on your database
    return [];
  }

  async getTagsFromDatabase(options) {
    // This is a placeholder - implement based on your database
    return [];
  }

  // Search analytics
  async trackSearchQuery(query, resultsCount, userId = null, sessionId = null) {
    try {
      // This would typically save to your analytics database
      const searchData = {
        query,
        resultsCount,
        userId,
        sessionId,
        timestamp: new Date()
      };

      // Save search analytics
      console.log('Search tracked:', searchData);
    } catch (error) {
      console.error('Search tracking error:', error);
    }
  }

  // Get search statistics
  async getSearchStats(timeframe = '30d') {
    try {
      // This would typically query your analytics database
      return {
        totalSearches: 0,
        uniqueQueries: 0,
        popularQueries: [],
        noResultsQueries: [],
        averageResultsPerQuery: 0
      };
    } catch (error) {
      console.error('Search stats error:', error);
      return null;
    }
  }

  // Health check
  async healthCheck() {
    try {
      // Test search functionality
      const testQuery = 'travel';
      const results = await this.searchPosts(testQuery, { limit: 1 });
      
      return {
        status: 'healthy',
        message: 'Search service is working properly',
        testResults: results
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

// Create singleton instance
const searchService = new SearchService();

module.exports = searchService;
