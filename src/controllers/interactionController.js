const PostInteraction = require('../models/PostInteraction');
const Comment = require('../models/Comment');
const { API_RESPONSES, HTTP_STATUS, ERROR_CODES } = require('../utils/constants');

// Interaction controller
class InteractionController {
  // Like/unlike a post
  async likePost(req, res) {
    try {
      const { slug } = req.params;
      const { type = 'like' } = req.body;
      const userId = req.user?.id || null;
      const sessionId = req.sessionId || 'anonymous';
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Get post ID from slug (you'll need to implement this)
      const post = await this.getPostBySlug(slug);
      if (!post) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Post not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      // Check if user has already liked this post
      const existingInteraction = await PostInteraction.findOne({
        postId: post._id,
        type: 'like',
        $or: [
          { userId: userId },
          { sessionId: sessionId }
        ]
      });
      
      if (existingInteraction) {
        // Unlike the post
        await PostInteraction.findByIdAndDelete(existingInteraction._id);
        
        // Get updated like count
        const likeCount = await PostInteraction.countDocuments({
          postId: post._id,
          type: 'like'
        });
        
        return res.json({
          success: true,
          data: {
            liked: false,
            likeCount,
            message: 'Post unliked successfully'
          }
        });
      } else {
        // Like the post
        const interaction = new PostInteraction({
          postId: post._id,
          type: 'like',
          userId: userId,
          sessionId: sessionId,
          ip: ip,
          userAgent: userAgent,
          metadata: {
            referrer: req.get('Referer'),
            source: 'website'
          }
        });
        
        await interaction.save();
        
        // Get updated like count
        const likeCount = await PostInteraction.countDocuments({
          postId: post._id,
          type: 'like'
        });
        
        return res.json({
          success: true,
          data: {
            liked: true,
            likeCount,
            message: 'Post liked successfully'
          }
        });
      }
    } catch (error) {
      console.error('Like post error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to like post',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Share a post
  async sharePost(req, res) {
    try {
      const { slug } = req.params;
      const { platform, url } = req.body;
      const userId = req.user?.id || null;
      const sessionId = req.sessionId || 'anonymous';
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Get post ID from slug
      const post = await this.getPostBySlug(slug);
      if (!post) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Post not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      // Create share interaction
      const interaction = new PostInteraction({
        postId: post._id,
        type: 'share',
        userId: userId,
        sessionId: sessionId,
        ip: ip,
        userAgent: userAgent,
        metadata: {
          referrer: req.get('Referer'),
          source: platform || 'website',
          sharedUrl: url
        }
      });
      
      await interaction.save();
      
      // Get updated share count
      const shareCount = await PostInteraction.countDocuments({
        postId: post._id,
        type: 'share'
      });
      
      res.json({
        success: true,
        data: {
          shared: true,
          shareCount,
          platform: platform || 'website',
          message: 'Post shared successfully'
        }
      });
    } catch (error) {
      console.error('Share post error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to share post',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get post comments
  async getPostComments(req, res) {
    try {
      const { slug } = req.params;
      const {
        page = 1,
        limit = 20,
        includeReplies = true,
        sortBy = 'createdAt',
        sortOrder = 'asc'
      } = req.query;
      
      // Get post ID from slug
      const post = await this.getPostBySlug(slug);
      if (!post) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Post not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      // Get comments
      const comments = await Comment.getPostComments(post._id, {
        status: 'approved',
        includeReplies: includeReplies === 'true',
        sortBy,
        sortOrder,
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
      });
      
      // Get total comment count
      const total = await Comment.countDocuments({
        postId: post._id,
        status: 'approved'
      });
      
      res.json({
        success: true,
        data: comments,
        meta: {
          postId: post._id,
          postSlug: slug,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
            hasNext: (parseInt(page) * parseInt(limit)) < total,
            hasPrev: page > 1
          },
          filters: {
            includeReplies: includeReplies === 'true',
            sortBy,
            sortOrder
          },
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get post comments error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch comments',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Add comment to post
  async addComment(req, res) {
    try {
      const { slug } = req.params;
      const { author, content, parentId } = req.body;
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Get post ID from slug
      const post = await this.getPostBySlug(slug);
      if (!post) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Post not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      // Check if parent comment exists (for replies)
      if (parentId) {
        const parentComment = await Comment.findById(parentId);
        if (!parentComment || parentComment.postId.toString() !== post._id.toString()) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: 'Invalid parent comment',
            code: ERROR_CODES.VALIDATION_ERROR
          });
        }
      }
      
      // Create comment
      const comment = new Comment({
        postId: post._id,
        author: {
          name: author.name,
          email: author.email,
          website: author.website
        },
        content: content,
        parentId: parentId || null,
        ip: ip,
        userAgent: userAgent,
        metadata: {
          referrer: req.get('Referer'),
          spamScore: req.spamScore || 0
        }
      });
      
      // Auto-moderate comment
      const moderationResult = comment.autoModerate ? 
        comment.autoModerate(content) : 
        { status: 'pending', reason: 'Awaiting moderation' };
      
      comment.status = moderationResult.status;
      comment.moderation.autoModerated = true;
      comment.moderation.moderationReason = moderationResult.reason;
      
      await comment.save();
      
      // If comment is approved, send notification
      if (comment.status === 'approved') {
        // Send notification to admin (implement based on your notification system)
        await this.sendCommentNotification(comment, post);
      }
      
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: {
          id: comment._id,
          status: comment.status,
          message: comment.status === 'approved' 
            ? 'Comment added successfully' 
            : 'Comment submitted for moderation'
        }
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to add comment',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get post interaction stats
  async getPostStats(req, res) {
    try {
      const { slug } = req.params;
      
      // Get post ID from slug
      const post = await this.getPostBySlug(slug);
      if (!post) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Post not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      // Get interaction stats
      const stats = await PostInteraction.getPostStats(post._id);
      
      // Get comment count
      const commentCount = await Comment.countDocuments({
        postId: post._id,
        status: 'approved'
      });
      
      res.json({
        success: true,
        data: {
          ...stats,
          comments: commentCount
        },
        meta: {
          postId: post._id,
          postSlug: slug,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get post stats error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch post stats',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get user's interaction history
  async getUserInteractions(req, res) {
    try {
      const userId = req.user?.id;
      const { limit = 20, type } = req.query;
      
      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required',
          code: ERROR_CODES.AUTHENTICATION_ERROR
        });
      }
      
      // Build query
      const query = { userId };
      if (type) {
        query.type = type;
      }
      
      // Get interactions
      const interactions = await PostInteraction.find(query)
        .populate('postId', 'title slug featuredImage publishedAt')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .select('type createdAt metadata');
      
      res.json({
        success: true,
        data: interactions,
        meta: {
          userId,
          limit: parseInt(limit),
          type: type || 'all',
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get user interactions error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch user interactions',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Bookmark a post
  async bookmarkPost(req, res) {
    try {
      const { slug } = req.params;
      const userId = req.user?.id;
      const sessionId = req.sessionId || 'anonymous';
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required for bookmarking',
          code: ERROR_CODES.AUTHENTICATION_ERROR
        });
      }
      
      // Get post ID from slug
      const post = await this.getPostBySlug(slug);
      if (!post) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Post not found',
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      // Check if already bookmarked
      const existingBookmark = await PostInteraction.findOne({
        postId: post._id,
        type: 'bookmark',
        userId: userId
      });
      
      if (existingBookmark) {
        // Remove bookmark
        await PostInteraction.findByIdAndDelete(existingBookmark._id);
        
        return res.json({
          success: true,
          data: {
            bookmarked: false,
            message: 'Post removed from bookmarks'
          }
        });
      } else {
        // Add bookmark
        const bookmark = new PostInteraction({
          postId: post._id,
          type: 'bookmark',
          userId: userId,
          sessionId: sessionId,
          ip: ip,
          userAgent: userAgent,
          metadata: {
            referrer: req.get('Referer'),
            source: 'website'
          }
        });
        
        await bookmark.save();
        
        return res.json({
          success: true,
          data: {
            bookmarked: true,
            message: 'Post bookmarked successfully'
          }
        });
      }
    } catch (error) {
      console.error('Bookmark post error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to bookmark post',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Get user's bookmarks
  async getUserBookmarks(req, res) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20 } = req.query;
      
      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required',
          code: ERROR_CODES.AUTHENTICATION_ERROR
        });
      }
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Get bookmarks
      const bookmarks = await PostInteraction.find({
        userId: userId,
        type: 'bookmark'
      })
        .populate('postId', 'title slug excerpt featuredImage publishedAt')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(offset)
        .select('createdAt');
      
      // Get total count
      const total = await PostInteraction.countDocuments({
        userId: userId,
        type: 'bookmark'
      });
      
      res.json({
        success: true,
        data: bookmarks,
        meta: {
          userId,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
            hasNext: offset + parseInt(limit) < total,
            hasPrev: page > 1
          },
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Get user bookmarks error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch bookmarks',
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  // Helper methods
  async getPostBySlug(slug) {
    // This is a placeholder - implement based on your database
    // You would typically query your Post model here
    return null;
  }

  async sendCommentNotification(comment, post) {
    // This is a placeholder - implement based on your notification system
    // You would typically send an email notification here
    console.log('Comment notification:', { comment: comment._id, post: post.title });
  }
}

// Create singleton instance
const interactionController = new InteractionController();

module.exports = interactionController;
