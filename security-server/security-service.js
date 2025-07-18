const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Security Service
 * Provides comprehensive security functions including authentication,
 * encryption, and multi-factor authentication for SiteGuard
 */
class SecurityService {
  constructor(options = {}) {
    this.jwtSecret = options.jwtSecret || process.env.JWT_SECRET || this.generateSecureKey();
    this.encryptionKey = options.encryptionKey || process.env.ENCRYPTION_KEY || this.generateSecureKey();
    this.jwtExpiresIn = options.jwtExpiresIn || '24h';
    this.refreshTokenExpiresIn = options.refreshTokenExpiresIn || '7d';
    this.bcryptRounds = options.bcryptRounds || 12;
    
    // Store active sessions and refresh tokens
    this.activeSessions = new Map();
    this.refreshTokens = new Map();
    
    console.log('Security Service initialized');
  }

  /**
   * Generate a secure random key
   */
  generateSecureKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(this.bcryptRounds);
      const hashedPassword = await bcrypt.hash(password, salt);
      return hashedPassword;
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw new Error(`Password verification failed: ${error.message}`);
    }
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(payload) {
    try {
      const tokenPayload = {
        ...payload,
        type: 'access',
        iat: Math.floor(Date.now() / 1000)
      };
      
      return jwt.sign(tokenPayload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
        issuer: 'siteguard',
        audience: 'siteguard-users'
      });
    } catch (error) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(payload) {
    try {
      const tokenPayload = {
        userId: payload.userId,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000)
      };
      
      const refreshToken = jwt.sign(tokenPayload, this.jwtSecret, {
        expiresIn: this.refreshTokenExpiresIn,
        issuer: 'siteguard',
        audience: 'siteguard-users'
      });
      
      // Store refresh token
      this.refreshTokens.set(refreshToken, {
        userId: payload.userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      
      return refreshToken;
    } catch (error) {
      throw new Error(`Refresh token generation failed: ${error.message}`);
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'siteguard',
        audience: 'siteguard-users'
      });
      
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error(`Token verification failed: ${error.message}`);
      }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = this.verifyToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token type');
      }
      
      // Check if refresh token exists in store
      const tokenData = this.refreshTokens.get(refreshToken);
      if (!tokenData) {
        throw new Error('Refresh token not found');
      }
      
      // Check if refresh token is expired
      if (new Date() > tokenData.expiresAt) {
        this.refreshTokens.delete(refreshToken);
        throw new Error('Refresh token expired');
      }
      
      // Generate new access token
      const newAccessToken = this.generateAccessToken({
        userId: decoded.userId
      });
      
      return {
        accessToken: newAccessToken,
        refreshToken: refreshToken // Keep the same refresh token
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Revoke refresh token
   */
  revokeRefreshToken(refreshToken) {
    return this.refreshTokens.delete(refreshToken);
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data) {
    try {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate TOTP secret for 2FA
   */
  generateTOTPSecret(userEmail) {
    try {
      const secret = speakeasy.generateSecret({
        name: `SiteGuard (${userEmail})`,
        issuer: 'SiteGuard',
        length: 32
      });
      
      return {
        secret: secret.base32,
        qrCodeUrl: secret.otpauth_url
      };
    } catch (error) {
      throw new Error(`TOTP secret generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code for TOTP setup
   */
  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      return qrCodeDataUrl;
    } catch (error) {
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  /**
   * Verify TOTP token
   */
  verifyTOTP(token, secret) {
    try {
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps (60 seconds) of drift
      });
      
      return verified;
    } catch (error) {
      throw new Error(`TOTP verification failed: ${error.message}`);
    }
  }

  /**
   * Create user session
   */
  createSession(userId, userAgent, ipAddress) {
    const sessionId = crypto.randomUUID();
    const session = {
      sessionId,
      userId,
      userAgent,
      ipAddress,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true
    };
    
    this.activeSessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Get user session
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Update session activity
   */
  updateSessionActivity(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      return true;
    }
    return false;
  }

  /**
   * Revoke user session
   */
  revokeSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.activeSessions.delete(sessionId);
      return true;
    }
    return false;
  }

  /**
   * Get all active sessions for user
   */
  getUserSessions(userId) {
    const userSessions = [];
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId && session.isActive) {
        userSessions.push({
          sessionId,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity
        });
      }
    }
    return userSessions;
  }

  /**
   * Revoke all sessions for user
   */
  revokeAllUserSessions(userId) {
    let revokedCount = 0;
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        this.revokeSession(sessionId);
        revokedCount++;
      }
    }
    return revokedCount;
  }

  /**
   * Generate secure API key
   */
  generateAPIKey(prefix = 'sk') {
    const randomBytes = crypto.randomBytes(32);
    const apiKey = `${prefix}_${randomBytes.toString('hex')}`;
    return apiKey;
  }

  /**
   * Hash API key for storage
   */
  async hashAPIKey(apiKey) {
    return await this.hashPassword(apiKey);
  }

  /**
   * Verify API key
   */
  async verifyAPIKey(apiKey, hashedAPIKey) {
    return await this.verifyPassword(apiKey, hashedAPIKey);
  }

  /**
   * Generate secure random string
   */
  generateSecureRandom(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const issues = [];
    
    if (password.length < minLength) {
      issues.push(`Password must be at least ${minLength} characters long`);
    }
    
    if (!hasUpperCase) {
      issues.push('Password must contain at least one uppercase letter');
    }
    
    if (!hasLowerCase) {
      issues.push('Password must contain at least one lowercase letter');
    }
    
    if (!hasNumbers) {
      issues.push('Password must contain at least one number');
    }
    
    if (!hasSpecialChar) {
      issues.push('Password must contain at least one special character');
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues,
      strength: this.calculatePasswordStrength(password)
    };
  }

  /**
   * Calculate password strength score
   */
  calculatePasswordStrength(password) {
    let score = 0;
    
    // Length bonus
    score += Math.min(password.length * 2, 20);
    
    // Character variety bonus
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/\d/.test(password)) score += 5;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
    
    // Penalty for common patterns
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
    if (/123|abc|qwe/i.test(password)) score -= 10; // Sequential patterns
    
    // Normalize to 0-100 scale
    score = Math.max(0, Math.min(100, score));
    
    if (score < 30) return 'weak';
    if (score < 60) return 'medium';
    if (score < 80) return 'strong';
    return 'very-strong';
  }

  /**
   * Clean up expired sessions and tokens
   */
  cleanup() {
    const now = new Date();
    
    // Clean up expired refresh tokens
    for (const [token, data] of this.refreshTokens.entries()) {
      if (now > data.expiresAt) {
        this.refreshTokens.delete(token);
      }
    }
    
    // Clean up inactive sessions (older than 24 hours)
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > sessionTimeout) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    return {
      activeSessions: this.activeSessions.size,
      activeRefreshTokens: this.refreshTokens.size,
      jwtSecret: this.jwtSecret ? 'configured' : 'not configured',
      encryptionKey: this.encryptionKey ? 'configured' : 'not configured'
    };
  }
}

module.exports = SecurityService;
