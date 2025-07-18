const express = require('express');
const SecurityService = require('./security-service');
const AuthMiddleware = require('./auth-middleware');
const { createClient } = require('@supabase/supabase-js');

/**
 * Security Server
 * Provides authentication, authorization, and security services for SiteGuard
 */
class SecurityServer {
  constructor(options = {}) {
    this.port = options.port || 3004;
    this.app = express();
    this.server = null;
    
    // Initialize security service
    this.securityService = new SecurityService({
      jwtSecret: options.jwtSecret || process.env.JWT_SECRET,
      encryptionKey: options.encryptionKey || process.env.ENCRYPTION_KEY
    });
    
    // Initialize auth middleware
    this.authMiddleware = new AuthMiddleware(this.securityService);
    
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
      process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'
    );
    
    this.setupMiddleware();
    this.setupRoutes();
    
    // Start cleanup interval
    setInterval(() => {
      this.securityService.cleanup();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security headers
    this.app.use(this.authMiddleware.securityHeaders());
    
    // CORS
    this.app.use(this.authMiddleware.corsMiddleware());
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Rate limiting
    this.app.use(this.authMiddleware.rateLimiter());
    
    // Audit logging
    this.app.use(this.authMiddleware.auditLog());
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Authentication endpoints
    this.app.post('/api/auth/register', 
      this.authMiddleware.loginRateLimiter(),
      this.authMiddleware.validateRequest({
        body: {
          email: { required: true, type: 'email' },
          password: { required: true, type: 'string', minLength: 8 },
          firstName: { required: true, type: 'string' },
          lastName: { required: true, type: 'string' }
        }
      }),
      this.handleRegister.bind(this)
    );
    
    this.app.post('/api/auth/login',
      this.authMiddleware.loginRateLimiter(),
      this.authMiddleware.validateRequest({
        body: {
          email: { required: true, type: 'email' },
          password: { required: true, type: 'string' }
        }
      }),
      this.handleLogin.bind(this)
    );
    
    this.app.post('/api/auth/logout',
      this.authMiddleware.authenticateToken(),
      this.handleLogout.bind(this)
    );
    
    this.app.post('/api/auth/refresh',
      this.handleRefreshToken.bind(this)
    );
    
    this.app.post('/api/auth/forgot-password',
      this.authMiddleware.loginRateLimiter(),
      this.handleForgotPassword.bind(this)
    );
    
    this.app.post('/api/auth/reset-password',
      this.handleResetPassword.bind(this)
    );
    
    // 2FA endpoints
    this.app.post('/api/auth/2fa/setup',
      this.authMiddleware.authenticateToken(),
      this.handleSetup2FA.bind(this)
    );
    
    this.app.post('/api/auth/2fa/verify',
      this.authMiddleware.authenticateToken(),
      this.handleVerify2FA.bind(this)
    );
    
    this.app.post('/api/auth/2fa/disable',
      this.authMiddleware.authenticateToken(),
      this.handleDisable2FA.bind(this)
    );
    
    // Session management
    this.app.get('/api/auth/sessions',
      this.authMiddleware.authenticateToken(),
      this.handleGetSessions.bind(this)
    );
    
    this.app.delete('/api/auth/sessions/:sessionId',
      this.authMiddleware.authenticateToken(),
      this.handleRevokeSession.bind(this)
    );
    
    this.app.delete('/api/auth/sessions',
      this.authMiddleware.authenticateToken(),
      this.handleRevokeAllSessions.bind(this)
    );
    
    // User profile
    this.app.get('/api/auth/profile',
      this.authMiddleware.authenticateToken(),
      this.handleGetProfile.bind(this)
    );
    
    this.app.put('/api/auth/profile',
      this.authMiddleware.authenticateToken(),
      this.handleUpdateProfile.bind(this)
    );
    
    this.app.post('/api/auth/change-password',
      this.authMiddleware.authenticateToken(),
      this.handleChangePassword.bind(this)
    );
    
    // API key management
    this.app.post('/api/auth/api-keys',
      this.authMiddleware.authenticateToken(),
      this.authMiddleware.requireRole('admin'),
      this.handleCreateAPIKey.bind(this)
    );
    
    this.app.get('/api/auth/api-keys',
      this.authMiddleware.authenticateToken(),
      this.authMiddleware.requireRole('admin'),
      this.handleGetAPIKeys.bind(this)
    );
    
    this.app.delete('/api/auth/api-keys/:keyId',
      this.authMiddleware.authenticateToken(),
      this.authMiddleware.requireRole('admin'),
      this.handleRevokeAPIKey.bind(this)
    );
    
    // Security status
    this.app.get('/api/auth/security-status',
      this.authMiddleware.authenticateToken(),
      this.authMiddleware.requireRole('admin'),
      this.handleSecurityStatus.bind(this)
    );
    
    // Health check
    this.app.get('/api/auth/health', this.handleHealthCheck.bind(this));
    
    // Error handler
    this.app.use(this.authMiddleware.errorHandler());
  }

  /**
   * Handle user registration
   */
  async handleRegister(req, res) {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      // Validate password strength
      const passwordValidation = this.securityService.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Password does not meet requirements',
          issues: passwordValidation.issues
        });
      }
      
      // Hash password
      const hashedPassword = await this.securityService.hashPassword(password);
      
      // Create user in Supabase
      const { data: user, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });
      
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      
      res.json({
        success: true,
        message: 'Registration successful. Please check your email for verification.',
        user: {
          id: user.user?.id,
          email: user.user?.email
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }
  }

  /**
   * Handle user login
   */
  async handleLogin(req, res) {
    try {
      const { email, password, totpToken } = req.body;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;
      
      // Authenticate with Supabase
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
      
      const user = data.user;
      
      // Check if 2FA is enabled (this would be stored in user metadata)
      const requires2FA = user.user_metadata?.requires_2fa || false;
      
      if (requires2FA) {
        if (!totpToken) {
          return res.status(200).json({
            success: true,
            requires2FA: true,
            message: 'Please provide TOTP token'
          });
        }
        
        // Verify TOTP token
        const totpSecret = user.user_metadata?.totp_secret;
        if (!totpSecret || !this.securityService.verifyTOTP(totpToken, totpSecret)) {
          return res.status(401).json({
            success: false,
            error: 'Invalid TOTP token'
          });
        }
      }
      
      // Create session
      const sessionId = this.securityService.createSession(user.id, userAgent, ipAddress);
      
      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'viewer',
        sessionId
      };
      
      const accessToken = this.securityService.generateAccessToken(tokenPayload);
      const refreshToken = this.securityService.generateRefreshToken(tokenPayload);
      
      res.json({
        success: true,
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.user_metadata?.first_name,
          lastName: user.user_metadata?.last_name,
          role: user.user_metadata?.role || 'viewer'
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed'
      });
    }
  }

  /**
   * Handle user logout
   */
  async handleLogout(req, res) {
    try {
      const { sessionId } = req.user;
      
      // Revoke session
      if (sessionId) {
        this.securityService.revokeSession(sessionId);
      }
      
      // Sign out from Supabase
      await this.supabase.auth.signOut();
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  }

  /**
   * Handle token refresh
   */
  async handleRefreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token required'
        });
      }

      const tokens = await this.securityService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        ...tokens
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle forgot password
   */
  async handleForgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Send password reset email via Supabase
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: 'Password reset failed'
      });
    }
  }

  /**
   * Handle password reset
   */
  async handleResetPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          success: false,
          error: 'Token and password are required'
        });
      }

      // Validate password strength
      const passwordValidation = this.securityService.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Password does not meet requirements',
          issues: passwordValidation.issues
        });
      }

      // Update password via Supabase
      const { error } = await this.supabase.auth.updateUser({
        password: password
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.json({
        success: true,
        message: 'Password reset successful'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: 'Password reset failed'
      });
    }
  }

  /**
   * Handle verify 2FA
   */
  async handleVerify2FA(req, res) {
    try {
      const { token, secret } = req.body;
      const { userId } = req.user;

      if (!token || !secret) {
        return res.status(400).json({
          success: false,
          error: 'Token and secret are required'
        });
      }

      // Verify TOTP token
      const isValid = this.securityService.verifyTOTP(token, secret);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid TOTP token'
        });
      }

      // Update user metadata to enable 2FA
      const { error } = await this.supabase.auth.updateUser({
        data: {
          requires_2fa: true,
          totp_secret: secret
        }
      });

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to enable 2FA'
        });
      }

      res.json({
        success: true,
        message: '2FA enabled successfully'
      });
    } catch (error) {
      console.error('2FA verification error:', error);
      res.status(500).json({
        success: false,
        error: '2FA verification failed'
      });
    }
  }

  /**
   * Handle disable 2FA
   */
  async handleDisable2FA(req, res) {
    try {
      const { password } = req.body;
      const { userId, email } = req.user;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required'
        });
      }

      // Verify current password
      const { error: signInError } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password'
        });
      }

      // Update user metadata to disable 2FA
      const { error } = await this.supabase.auth.updateUser({
        data: {
          requires_2fa: false,
          totp_secret: null
        }
      });

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to disable 2FA'
        });
      }

      res.json({
        success: true,
        message: '2FA disabled successfully'
      });
    } catch (error) {
      console.error('2FA disable error:', error);
      res.status(500).json({
        success: false,
        error: '2FA disable failed'
      });
    }
  }

  /**
   * Handle get sessions
   */
  async handleGetSessions(req, res) {
    try {
      const { userId } = req.user;

      const sessions = this.securityService.getUserSessions(userId);

      res.json({
        success: true,
        sessions: sessions
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sessions'
      });
    }
  }

  /**
   * Handle revoke session
   */
  async handleRevokeSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { userId } = req.user;

      // Verify session belongs to user
      const session = this.securityService.getSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      const revoked = this.securityService.revokeSession(sessionId);

      if (revoked) {
        res.json({
          success: true,
          message: 'Session revoked successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke session'
      });
    }
  }

  /**
   * Handle revoke all sessions
   */
  async handleRevokeAllSessions(req, res) {
    try {
      const { userId } = req.user;

      const revokedCount = this.securityService.revokeAllUserSessions(userId);

      res.json({
        success: true,
        message: `${revokedCount} sessions revoked successfully`
      });
    } catch (error) {
      console.error('Revoke all sessions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke sessions'
      });
    }
  }

  /**
   * Handle get profile
   */
  async handleGetProfile(req, res) {
    try {
      const { userId } = req.user;

      // Get user from Supabase
      const { data: user, error } = await this.supabase.auth.getUser();

      if (error || !user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        user: {
          id: user.user.id,
          email: user.user.email,
          firstName: user.user.user_metadata?.first_name,
          lastName: user.user.user_metadata?.last_name,
          role: user.user.user_metadata?.role || 'viewer',
          requires2FA: user.user.user_metadata?.requires_2fa || false,
          createdAt: user.user.created_at,
          lastSignIn: user.user.last_sign_in_at
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile'
      });
    }
  }

  /**
   * Handle update profile
   */
  async handleUpdateProfile(req, res) {
    try {
      const { firstName, lastName } = req.body;

      // Update user metadata
      const { error } = await this.supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName
        }
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Profile update failed'
      });
    }
  }

  /**
   * Handle change password
   */
  async handleChangePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const { email } = req.user;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current and new passwords are required'
        });
      }

      // Validate new password strength
      const passwordValidation = this.securityService.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'New password does not meet requirements',
          issues: passwordValidation.issues
        });
      }

      // Verify current password
      const { error: signInError } = await this.supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });

      if (signInError) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Update password
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Password change failed'
      });
    }
  }

  /**
   * Handle create API key
   */
  async handleCreateAPIKey(req, res) {
    try {
      const { name, permissions } = req.body;
      const { userId } = req.user;

      // Generate API key
      const apiKey = this.securityService.generateAPIKey();
      const hashedKey = await this.securityService.hashAPIKey(apiKey);

      // In a real implementation, you would store this in the database
      // For now, we'll just return the key

      res.json({
        success: true,
        message: 'API key created successfully',
        apiKey: apiKey,
        name: name,
        permissions: permissions || []
      });
    } catch (error) {
      console.error('Create API key error:', error);
      res.status(500).json({
        success: false,
        error: 'API key creation failed'
      });
    }
  }

  /**
   * Handle get API keys
   */
  async handleGetAPIKeys(req, res) {
    try {
      // In a real implementation, you would fetch from database
      res.json({
        success: true,
        apiKeys: []
      });
    } catch (error) {
      console.error('Get API keys error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get API keys'
      });
    }
  }

  /**
   * Handle revoke API key
   */
  async handleRevokeAPIKey(req, res) {
    try {
      const { keyId } = req.params;

      // In a real implementation, you would revoke in database
      res.json({
        success: true,
        message: 'API key revoked successfully'
      });
    } catch (error) {
      console.error('Revoke API key error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke API key'
      });
    }
  }

  /**
   * Handle 2FA setup
   */
  async handleSetup2FA(req, res) {
    try {
      const { userId, email } = req.user;
      
      // Generate TOTP secret
      const { secret, qrCodeUrl } = this.securityService.generateTOTPSecret(email);
      
      // Generate QR code
      const qrCodeDataUrl = await this.securityService.generateQRCode(qrCodeUrl);
      
      res.json({
        success: true,
        secret,
        qrCode: qrCodeDataUrl,
        message: 'Scan the QR code with your authenticator app'
      });
    } catch (error) {
      console.error('2FA setup error:', error);
      res.status(500).json({
        success: false,
        error: '2FA setup failed'
      });
    }
  }

  /**
   * Handle security status
   */
  async handleSecurityStatus(req, res) {
    try {
      const stats = this.securityService.getSecurityStats();
      
      res.json({
        success: true,
        status: {
          ...stats,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get security status'
      });
    }
  }

  /**
   * Health check endpoint
   */
  async handleHealthCheck(req, res) {
    try {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          securityService: true,
          supabase: !!this.supabase
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  }

  /**
   * Start the security server
   */
  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`Security Server running on port ${this.port}`);
      console.log('Available endpoints:');
      console.log('  POST /api/auth/register - User registration');
      console.log('  POST /api/auth/login - User login');
      console.log('  POST /api/auth/logout - User logout');
      console.log('  POST /api/auth/refresh - Refresh token');
      console.log('  POST /api/auth/2fa/setup - Setup 2FA');
      console.log('  GET  /api/auth/security-status - Security status');
    });
  }

  /**
   * Stop the security server
   */
  async stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new SecurityServer();
  
  server.start();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down security server...');
    await server.stop();
    process.exit(0);
  });
}

module.exports = SecurityServer;
