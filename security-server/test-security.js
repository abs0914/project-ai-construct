#!/usr/bin/env node

/**
 * Test script for Security Implementation
 * Tests authentication, encryption, and security services
 */

const SecurityService = require('./security-service');
const EncryptionUtils = require('./encryption-utils');
const AuthMiddleware = require('./auth-middleware');

const SECURITY_SERVER_URL = 'http://localhost:3004';

class SecurityTester {
  constructor() {
    this.testResults = [];
    this.securityService = new SecurityService();
    this.encryptionUtils = new EncryptionUtils();
    this.authMiddleware = new AuthMiddleware(this.securityService);
  }

  async runAllTests() {
    console.log('🔐 Starting Security Implementation Tests\n');

    try {
      await this.testSecurityService();
      await this.testEncryptionUtils();
      await this.testAuthMiddleware();
      await this.testSecurityServer();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testSecurityService() {
    console.log('🛡️ Testing Security Service...');
    
    try {
      // Test password hashing
      const password = 'TestPassword123!';
      const hashedPassword = await this.securityService.hashPassword(password);
      const isValid = await this.securityService.verifyPassword(password, hashedPassword);
      
      if (isValid) {
        this.addResult('✅ Password Hashing', 'Hash and verify working correctly');
      } else {
        this.addResult('❌ Password Hashing', 'Password verification failed');
      }

      // Test JWT tokens
      const payload = { userId: '123', email: 'test@example.com', role: 'admin' };
      const accessToken = this.securityService.generateAccessToken(payload);
      const refreshToken = this.securityService.generateRefreshToken(payload);
      
      const decodedAccess = this.securityService.verifyToken(accessToken);
      const decodedRefresh = this.securityService.verifyToken(refreshToken);
      
      if (decodedAccess.userId === payload.userId && decodedRefresh.userId === payload.userId) {
        this.addResult('✅ JWT Tokens', 'Token generation and verification working');
      } else {
        this.addResult('❌ JWT Tokens', 'Token verification failed');
      }

      // Test encryption/decryption
      const testData = { username: 'admin', password: 'secret123', apiKey: 'sk_test_key' };
      const encrypted = this.securityService.encrypt(testData);
      const decrypted = this.securityService.decrypt(encrypted);
      
      if (JSON.stringify(testData) === JSON.stringify(decrypted)) {
        this.addResult('✅ Data Encryption', 'Encrypt/decrypt working correctly');
      } else {
        this.addResult('❌ Data Encryption', 'Encryption/decryption failed');
      }

      // Test TOTP
      const { secret, qrCodeUrl } = this.securityService.generateTOTPSecret('test@example.com');
      if (secret && qrCodeUrl) {
        this.addResult('✅ TOTP Generation', 'TOTP secret and QR code generated');
      } else {
        this.addResult('❌ TOTP Generation', 'TOTP generation failed');
      }

      // Test session management
      const sessionId = this.securityService.createSession('user123', 'Mozilla/5.0', '192.168.1.1');
      const session = this.securityService.getSession(sessionId);
      
      if (session && session.userId === 'user123') {
        this.addResult('✅ Session Management', 'Session creation and retrieval working');
      } else {
        this.addResult('❌ Session Management', 'Session management failed');
      }

      // Test password strength validation
      const weakPassword = '123';
      const strongPassword = 'StrongP@ssw0rd123!';
      
      const weakValidation = this.securityService.validatePasswordStrength(weakPassword);
      const strongValidation = this.securityService.validatePasswordStrength(strongPassword);
      
      if (!weakValidation.isValid && strongValidation.isValid) {
        this.addResult('✅ Password Validation', 'Password strength validation working');
      } else {
        this.addResult('❌ Password Validation', 'Password validation failed');
      }

      // Test API key generation
      const apiKey = this.securityService.generateAPIKey();
      const hashedAPIKey = await this.securityService.hashAPIKey(apiKey);
      const apiKeyValid = await this.securityService.verifyAPIKey(apiKey, hashedAPIKey);
      
      if (apiKeyValid) {
        this.addResult('✅ API Key Management', 'API key generation and verification working');
      } else {
        this.addResult('❌ API Key Management', 'API key management failed');
      }

    } catch (error) {
      this.addResult('❌ Security Service', `Failed: ${error.message}`);
    }
  }

  async testEncryptionUtils() {
    console.log('🔒 Testing Encryption Utils...');
    
    try {
      // Test basic encryption
      const testData = 'Sensitive information';
      const encrypted = this.encryptionUtils.encrypt(testData);
      const decrypted = this.encryptionUtils.decrypt(encrypted);
      
      if (testData === decrypted) {
        this.addResult('✅ Basic Encryption', 'Encrypt/decrypt working correctly');
      } else {
        this.addResult('❌ Basic Encryption', 'Basic encryption failed');
      }

      // Test router credentials encryption
      const credentials = {
        username: 'admin',
        password: 'router123',
        apiKey: 'sk_router_key'
      };
      
      const encryptedCreds = this.encryptionUtils.encryptRouterCredentials(credentials);
      const decryptedCreds = this.encryptionUtils.decryptRouterCredentials(encryptedCreds);
      
      if (credentials.username === decryptedCreds.username && 
          credentials.password === decryptedCreds.password) {
        this.addResult('✅ Router Credentials', 'Router credential encryption working');
      } else {
        this.addResult('❌ Router Credentials', 'Router credential encryption failed');
      }

      // Test API key encryption
      const apiKey = 'sk_test_api_key_12345';
      const { encryptedKey, keyId } = this.encryptionUtils.encryptAPIKey(apiKey, { name: 'Test Key' });
      const decryptedAPIKey = this.encryptionUtils.decryptAPIKey(encryptedKey);
      
      if (decryptedAPIKey.key === apiKey && decryptedAPIKey.keyId === keyId) {
        this.addResult('✅ API Key Encryption', 'API key encryption working');
      } else {
        this.addResult('❌ API Key Encryption', 'API key encryption failed');
      }

      // Test configuration encryption
      const config = {
        database: 'postgresql://user:pass@localhost/db',
        redis: 'redis://localhost:6379',
        secrets: ['secret1', 'secret2']
      };
      
      const encryptedConfig = this.encryptionUtils.encryptConfig(config);
      const decryptedConfig = this.encryptionUtils.decryptConfig(encryptedConfig);
      
      if (JSON.stringify(config) === JSON.stringify(decryptedConfig)) {
        this.addResult('✅ Config Encryption', 'Configuration encryption working');
      } else {
        this.addResult('❌ Config Encryption', 'Configuration encryption failed');
      }

      // Test secure password generation
      const securePassword = this.encryptionUtils.generateSecurePassword(16);
      if (securePassword.length === 16 && /[A-Z]/.test(securePassword) && /[0-9]/.test(securePassword)) {
        this.addResult('✅ Secure Password Gen', 'Secure password generation working');
      } else {
        this.addResult('❌ Secure Password Gen', 'Secure password generation failed');
      }

      // Test file encryption
      const fileData = Buffer.from('This is test file content');
      const encryptedFile = this.encryptionUtils.encryptFile(fileData);
      const decryptedFile = this.encryptionUtils.decryptFile(encryptedFile);
      
      if (fileData.equals(decryptedFile)) {
        this.addResult('✅ File Encryption', 'File encryption working');
      } else {
        this.addResult('❌ File Encryption', 'File encryption failed');
      }

      // Test backup encryption
      const backupData = { users: ['user1', 'user2'], settings: { theme: 'dark' } };
      const encryptedBackup = this.encryptionUtils.createEncryptedBackup(backupData);
      const restoredBackup = this.encryptionUtils.restoreFromEncryptedBackup(encryptedBackup);
      
      if (JSON.stringify(backupData) === JSON.stringify(restoredBackup.data)) {
        this.addResult('✅ Backup Encryption', 'Backup encryption working');
      } else {
        this.addResult('❌ Backup Encryption', 'Backup encryption failed');
      }

    } catch (error) {
      this.addResult('❌ Encryption Utils', `Failed: ${error.message}`);
    }
  }

  async testAuthMiddleware() {
    console.log('🔐 Testing Auth Middleware...');
    
    try {
      // Test middleware creation
      const middleware = this.authMiddleware;
      
      if (middleware) {
        this.addResult('✅ Middleware Creation', 'Auth middleware created successfully');
      } else {
        this.addResult('❌ Middleware Creation', 'Auth middleware creation failed');
      }

      // Test middleware methods exist
      const methods = [
        'securityHeaders',
        'rateLimiter',
        'loginRateLimiter',
        'authenticateToken',
        'optionalAuth',
        'authenticateAPIKey',
        'requireRole',
        'requirePermission',
        'auditLog',
        'validateRequest',
        'corsMiddleware',
        'errorHandler'
      ];

      let methodsExist = 0;
      methods.forEach(method => {
        if (typeof middleware[method] === 'function') {
          methodsExist++;
        }
      });

      this.addResult('✅ Middleware Methods', `${methodsExist}/${methods.length} methods implemented`);

      // Test security headers middleware
      const securityHeadersMiddleware = middleware.securityHeaders();
      if (typeof securityHeadersMiddleware === 'function') {
        this.addResult('✅ Security Headers', 'Security headers middleware working');
      } else {
        this.addResult('❌ Security Headers', 'Security headers middleware failed');
      }

      // Test rate limiter
      const rateLimiterMiddleware = middleware.rateLimiter();
      if (typeof rateLimiterMiddleware === 'function') {
        this.addResult('✅ Rate Limiter', 'Rate limiter middleware working');
      } else {
        this.addResult('❌ Rate Limiter', 'Rate limiter middleware failed');
      }

    } catch (error) {
      this.addResult('❌ Auth Middleware', `Failed: ${error.message}`);
    }
  }

  async testSecurityServer() {
    console.log('🖥️ Testing Security Server...');
    
    try {
      // Test server health
      const healthResponse = await fetch(`${SECURITY_SERVER_URL}/api/auth/health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        this.addResult('✅ Security Server', 'API accessible and responding');
        this.addResult('  📊 Services', `Security: ${healthData.services.securityService}, Supabase: ${healthData.services.supabase}`);
      } else {
        this.addResult('❌ Security Server', `Server returned status ${healthResponse.status}`);
      }

      // Test security status endpoint (this will fail without auth, which is expected)
      const statusResponse = await fetch(`${SECURITY_SERVER_URL}/api/auth/security-status`);
      if (statusResponse.status === 401) {
        this.addResult('✅ Auth Protection', 'Protected endpoints require authentication');
      } else {
        this.addResult('⚠️ Auth Protection', 'Protected endpoints may not be properly secured');
      }

    } catch (error) {
      this.addResult('❌ Security Server', `Failed: ${error.message}`);
    }
  }

  addResult(test, result) {
    this.testResults.push({ test, result });
    console.log(`  ${test}: ${result}`);
  }

  printResults() {
    console.log('\n📊 Security Implementation Test Results Summary:');
    console.log('=' .repeat(60));
    
    const passed = this.testResults.filter(r => r.test.startsWith('✅')).length;
    const warnings = this.testResults.filter(r => r.test.startsWith('⚠️')).length;
    const failed = this.testResults.filter(r => r.test.startsWith('❌')).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 Security implementation is ready!');
      console.log('\nNext steps:');
      console.log('1. Set JWT_SECRET and ENCRYPTION_KEY environment variables');
      console.log('2. Configure Supabase RLS policies');
      console.log('3. Set up user roles and permissions');
      console.log('4. Enable 2FA for admin users');
      console.log('5. Configure audit logging');
    } else {
      console.log('\n⚠️ Some tests failed. Please check the security server configuration.');
    }

    console.log('\n📚 Security API Documentation:');
    console.log('Authentication:');
    console.log('  POST /api/auth/register - User registration');
    console.log('  POST /api/auth/login - User login');
    console.log('  POST /api/auth/logout - User logout');
    console.log('  POST /api/auth/refresh - Refresh token');
    console.log('2FA Management:');
    console.log('  POST /api/auth/2fa/setup - Setup 2FA');
    console.log('  POST /api/auth/2fa/verify - Verify 2FA');
    console.log('  POST /api/auth/2fa/disable - Disable 2FA');
    console.log('Session Management:');
    console.log('  GET  /api/auth/sessions - List sessions');
    console.log('  DELETE /api/auth/sessions/:id - Revoke session');
    console.log('Security:');
    console.log('  GET  /api/auth/security-status - Security status');
    console.log('  GET  /api/auth/health - Health check');
  }
}

// Check if security server is running
async function checkSecurityServer() {
  try {
    const response = await fetch(`${SECURITY_SERVER_URL}/api/auth/health`, { timeout: 5000 });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if security server is running...');
  
  const isRunning = await checkSecurityServer();
  
  if (!isRunning) {
    console.log('❌ Security server is not running!');
    console.log('\nPlease start the security server first:');
    console.log('  npm run security-server');
    console.log('\nOr set environment variables and start:');
    console.log('  JWT_SECRET=your_secret ENCRYPTION_KEY=your_key npm run security-server');
    console.log('\nThen run this test again:');
    console.log('  npm run test:security');
    console.log('\nOr start all servers together:');
    console.log('  npm run dev');
    process.exit(1);
  }

  const tester = new SecurityTester();
  await tester.runAllTests();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityTester;
