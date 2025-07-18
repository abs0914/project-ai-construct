const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

/**
 * Authentication Middleware
 * Provides security middleware for API protection, rate limiting,
 * and authentication verification
 */
class AuthMiddleware {
  constructor(securityService, options = {}) {
    this.securityService = securityService;
    this.options = {
      rateLimitWindow: options.rateLimitWindow || 15 * 60 * 1000, // 15 minutes
      rateLimitMax: options.rateLimitMax || 100, // 100 requests per window
      loginRateLimitMax: options.loginRateLimitMax || 5, // 5 login attempts per window
      ...options
    };
  }

  /**
   * Security headers middleware
   */
  securityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "ws:", "wss:"],
          mediaSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      crossOriginEmbedderPolicy: false, // Allow embedding for video streams
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  /**
   * General rate limiting middleware
   */
  rateLimiter() {
    return rateLimit({
      windowMs: this.options.rateLimitWindow,
      max: this.options.rateLimitMax,
      message: {
        error: 'Too many requests from this IP, please try again later',
        retryAfter: Math.ceil(this.options.rateLimitWindow / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(this.options.rateLimitWindow / 1000)
        });
      }
    });
  }

  /**
   * Strict rate limiting for login attempts
   */
  loginRateLimiter() {
    return rateLimit({
      windowMs: this.options.rateLimitWindow,
      max: this.options.loginRateLimitMax,
      message: {
        error: 'Too many login attempts from this IP, please try again later',
        retryAfter: Math.ceil(this.options.rateLimitWindow / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true, // Don't count successful logins
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          error: 'Too many login attempts',
          retryAfter: Math.ceil(this.options.rateLimitWindow / 1000)
        });
      }
    });
  }

  /**
   * JWT authentication middleware
   */
  authenticateToken() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
          return res.status(401).json({
            success: false,
            error: 'Access token required'
          });
        }

        // Verify token
        const decoded = this.securityService.verifyToken(token);
        
        if (decoded.type !== 'access') {
          return res.status(401).json({
            success: false,
            error: 'Invalid token type'
          });
        }

        // Add user info to request
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions || []
        };

        // Update session activity if session ID is provided
        if (decoded.sessionId) {
          this.securityService.updateSessionActivity(decoded.sessionId);
        }

        next();
      } catch (error) {
        if (error.message === 'Token expired') {
          return res.status(401).json({
            success: false,
            error: 'Token expired',
            code: 'TOKEN_EXPIRED'
          });
        } else if (error.message === 'Invalid token') {
          return res.status(401).json({
            success: false,
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
          });
        } else {
          return res.status(401).json({
            success: false,
            error: 'Authentication failed'
          });
        }
      }
    };
  }

  /**
   * Optional authentication middleware (doesn't fail if no token)
   */
  optionalAuth() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
          const decoded = this.securityService.verifyToken(token);
          
          if (decoded.type === 'access') {
            req.user = {
              userId: decoded.userId,
              email: decoded.email,
              role: decoded.role,
              permissions: decoded.permissions || []
            };
          }
        }

        next();
      } catch (error) {
        // Continue without authentication
        next();
      }
    };
  }

  /**
   * API key authentication middleware
   */
  authenticateAPIKey() {
    return async (req, res, next) => {
      try {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey) {
          return res.status(401).json({
            success: false,
            error: 'API key required'
          });
        }

        // In a real implementation, you would verify the API key against the database
        // For now, we'll just check if it follows the expected format
        if (!apiKey.startsWith('sk_') || apiKey.length < 35) {
          return res.status(401).json({
            success: false,
            error: 'Invalid API key format'
          });
        }

        // Add API key info to request
        req.apiKey = {
          key: apiKey,
          type: 'api_key'
        };

        next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'API key authentication failed'
        });
      }
    };
  }

  /**
   * Role-based authorization middleware
   */
  requireRole(requiredRole) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      const roleHierarchy = {
        'viewer': 1,
        'operator': 2,
        'admin': 3,
        'super_admin': 4
      };

      const userRoleLevel = roleHierarchy[userRole] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          required: requiredRole,
          current: userRole
        });
      }

      next();
    };
  }

  /**
   * Permission-based authorization middleware
   */
  requirePermission(requiredPermission) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userPermissions = req.user.permissions || [];
      
      if (!userPermissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied',
          required: requiredPermission,
          available: userPermissions
        });
      }

      next();
    };
  }

  /**
   * Audit logging middleware
   */
  auditLog() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Log request
      const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId,
        sessionId: req.user?.sessionId
      };

      // Override res.json to capture response
      const originalJson = res.json;
      res.json = function(data) {
        const responseTime = Date.now() - startTime;
        
        // Log response
        console.log('AUDIT:', {
          ...logData,
          statusCode: res.statusCode,
          responseTime: responseTime,
          success: data?.success !== false
        });

        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Request validation middleware
   */
  validateRequest(schema) {
    return (req, res, next) => {
      try {
        // Basic validation - in production, use a library like Joi or Yup
        if (schema.body) {
          for (const [field, rules] of Object.entries(schema.body)) {
            const value = req.body[field];
            
            if (rules.required && (value === undefined || value === null || value === '')) {
              return res.status(400).json({
                success: false,
                error: `Field '${field}' is required`
              });
            }
            
            if (value !== undefined && rules.type) {
              if (rules.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return res.status(400).json({
                  success: false,
                  error: `Field '${field}' must be a valid email`
                });
              }
              
              if (rules.type === 'string' && typeof value !== 'string') {
                return res.status(400).json({
                  success: false,
                  error: `Field '${field}' must be a string`
                });
              }
              
              if (rules.minLength && value.length < rules.minLength) {
                return res.status(400).json({
                  success: false,
                  error: `Field '${field}' must be at least ${rules.minLength} characters`
                });
              }
            }
          }
        }

        next();
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Request validation failed'
        });
      }
    };
  }

  /**
   * CORS middleware with security considerations
   */
  corsMiddleware() {
    return (req, res, next) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://siteguard.app'
      ];

      const origin = req.headers.origin;
      
      if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }

      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      next();
    };
  }

  /**
   * Error handling middleware
   */
  errorHandler() {
    return (error, req, res, next) => {
      console.error('Security Error:', error);

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        ...(isDevelopment && { details: error.message, stack: error.stack })
      });
    };
  }
}

module.exports = AuthMiddleware;
