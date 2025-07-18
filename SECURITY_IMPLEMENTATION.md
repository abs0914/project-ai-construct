# SiteGuard Security Implementation

## Overview

This document describes the comprehensive security implementation for SiteGuard, providing enterprise-grade authentication, authorization, data encryption, and audit logging for construction site monitoring systems.

## Architecture

### Security Components

1. **Security Service** (`security-server/security-service.js`)
   - JWT token management (access & refresh tokens)
   - Password hashing with bcrypt
   - Data encryption/decryption with AES-256
   - TOTP-based 2FA implementation
   - Session management and tracking
   - API key generation and verification

2. **Authentication Middleware** (`security-server/auth-middleware.js`)
   - Security headers (Helmet.js integration)
   - Rate limiting (general & login-specific)
   - JWT authentication verification
   - Role-based authorization
   - Permission-based access control
   - Audit logging and request validation

3. **Encryption Utils** (`security-server/encryption-utils.js`)
   - AES-256-CBC encryption for sensitive data
   - Router credentials encryption
   - API key and token encryption
   - Configuration data encryption
   - File encryption capabilities
   - Secure password generation

4. **Security Server** (`security-server/server.js`)
   - Authentication endpoints (register, login, logout)
   - 2FA management (setup, verify, disable)
   - Session management (list, revoke)
   - Profile management
   - API key management
   - Security status monitoring

5. **Row Level Security** (`security-server/rls-policies.sql`)
   - Supabase RLS policies for data isolation
   - Role-based data access control
   - Site-based access restrictions
   - Audit trigger implementation

## Features

### ✅ Implemented Security Features

#### **Authentication & Authorization**
- **JWT-based Authentication**: Secure access and refresh token system
- **Password Security**: bcrypt hashing with configurable rounds
- **Multi-Factor Authentication**: TOTP-based 2FA with QR code generation
- **Session Management**: Active session tracking and revocation
- **Role-Based Access Control**: Admin, Operator, Viewer roles
- **Permission-Based Authorization**: Granular permission system
- **API Key Authentication**: Secure API access for integrations

#### **Data Protection**
- **AES-256-CBC Encryption**: Industry-standard encryption for sensitive data
- **Router Credentials Encryption**: Secure storage of router passwords
- **API Key Encryption**: Protected storage of third-party API keys
- **Configuration Encryption**: Encrypted application configuration
- **File Encryption**: Secure file storage capabilities
- **Database Encryption**: Encrypted sensitive database fields

#### **Security Middleware**
- **Security Headers**: Comprehensive HTTP security headers
- **Rate Limiting**: Configurable rate limits for API endpoints
- **CORS Protection**: Secure cross-origin resource sharing
- **Request Validation**: Input validation and sanitization
- **Audit Logging**: Comprehensive security event logging
- **Error Handling**: Secure error responses without information leakage

#### **Row Level Security (RLS)**
- **Site-Based Access Control**: Users can only access their assigned sites
- **Role-Based Data Filtering**: Data access based on user roles
- **Organization Isolation**: Multi-tenant data separation
- **Audit Trail**: Automatic logging of all data changes
- **Service Account Support**: Secure system-level operations

### 🔧 Configuration Options

#### **Security Service Configuration**
```javascript
const securityService = new SecurityService({
  jwtSecret: 'your-jwt-secret',
  encryptionKey: 'your-encryption-key',
  jwtExpiresIn: '24h',
  refreshTokenExpiresIn: '7d',
  bcryptRounds: 12
});
```

#### **Authentication Middleware Configuration**
```javascript
const authMiddleware = new AuthMiddleware(securityService, {
  rateLimitWindow: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // 100 requests per window
  loginRateLimitMax: 5 // 5 login attempts per window
});
```

#### **Encryption Configuration**
```javascript
const encryptionUtils = new EncryptionUtils({
  algorithm: 'aes-256-cbc',
  keyDerivationIterations: 100000,
  saltLength: 32,
  ivLength: 16,
  masterKey: 'your-master-encryption-key'
});
```

## Installation & Setup

### Prerequisites

- Node.js 16+
- Supabase account and project
- Environment variables configured

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-secure-jwt-secret-key
ENCRYPTION_KEY=your-secure-encryption-key
MASTER_ENCRYPTION_KEY=your-master-encryption-key

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Frontend Configuration
FRONTEND_URL=http://localhost:5173
```

### Installation

```bash
# Install dependencies
npm install

# Start security server
npm run security-server

# Or start all services
npm run dev
```

### Database Setup

```sql
-- Apply RLS policies
\i security-server/rls-policies.sql

-- Create required tables
CREATE TABLE IF NOT EXISTS public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_organizations (
  user_id uuid REFERENCES auth.users(id),
  organization_id uuid NOT NULL,
  role text DEFAULT 'viewer',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_users (
  site_id uuid REFERENCES public.sites(id),
  user_id uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### Testing

```bash
# Test security implementation
npm run test:security
```

## Usage

### Authentication

#### **User Registration**
```bash
curl -X POST http://localhost:3004/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecureP@ssw0rd123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### **User Login**
```bash
curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecureP@ssw0rd123!"
  }'
```

#### **Token Refresh**
```bash
curl -X POST http://localhost:3004/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token"
  }'
```

### 2FA Management

#### **Setup 2FA**
```bash
curl -X POST http://localhost:3004/api/auth/2fa/setup \
  -H "Authorization: Bearer your-access-token"
```

#### **Verify 2FA**
```bash
curl -X POST http://localhost:3004/api/auth/2fa/verify \
  -H "Authorization: Bearer your-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "123456",
    "secret": "your-totp-secret"
  }'
```

### Data Encryption

#### **Encrypt Router Credentials**
```javascript
const encryptionUtils = new EncryptionUtils();

const credentials = {
  username: 'admin',
  password: 'router123',
  apiKey: 'sk_router_key'
};

const encrypted = encryptionUtils.encryptRouterCredentials(credentials);
const decrypted = encryptionUtils.decryptRouterCredentials(encrypted);
```

#### **Encrypt API Keys**
```javascript
const apiKey = 'sk_test_api_key_12345';
const { encryptedKey, keyId } = encryptionUtils.encryptAPIKey(apiKey, {
  name: 'Test API Key',
  permissions: ['read', 'write']
});

const decryptedAPIKey = encryptionUtils.decryptAPIKey(encryptedKey);
```

## API Reference

### Authentication Endpoints

```http
POST   /api/auth/register              # User registration
POST   /api/auth/login                 # User login
POST   /api/auth/logout                # User logout
POST   /api/auth/refresh               # Refresh access token
POST   /api/auth/forgot-password       # Request password reset
POST   /api/auth/reset-password        # Reset password
```

### 2FA Endpoints

```http
POST   /api/auth/2fa/setup             # Setup 2FA
POST   /api/auth/2fa/verify            # Verify 2FA token
POST   /api/auth/2fa/disable           # Disable 2FA
```

### Session Management

```http
GET    /api/auth/sessions              # List user sessions
DELETE /api/auth/sessions/:id          # Revoke specific session
DELETE /api/auth/sessions              # Revoke all sessions
```

### Profile Management

```http
GET    /api/auth/profile               # Get user profile
PUT    /api/auth/profile               # Update user profile
POST   /api/auth/change-password       # Change password
```

### API Key Management

```http
POST   /api/auth/api-keys              # Create API key
GET    /api/auth/api-keys              # List API keys
DELETE /api/auth/api-keys/:id          # Revoke API key
```

### Security Monitoring

```http
GET    /api/auth/security-status       # Security status
GET    /api/auth/health                # Health check
```

## Security Best Practices

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- No common patterns or dictionary words

### Token Security
- JWT tokens expire after 24 hours
- Refresh tokens expire after 7 days
- Tokens are signed with secure secrets
- Session tracking prevents token reuse

### Data Encryption
- AES-256-CBC encryption for sensitive data
- PBKDF2 key derivation with 100,000 iterations
- Random salt and IV for each encryption
- Secure key storage and rotation

### Rate Limiting
- General API: 100 requests per 15 minutes
- Login attempts: 5 attempts per 15 minutes
- Progressive delays for repeated failures
- IP-based tracking and blocking

### Audit Logging
- All authentication events logged
- Data access and modifications tracked
- Security events monitored
- Log retention and analysis

## Row Level Security Policies

### Site Access Control
```sql
-- Users can only view sites they have access to
CREATE POLICY "site_access_policy" ON public.sites
  FOR SELECT USING (user_has_site_access(id));
```

### Role-Based Data Access
```sql
-- Admins can modify data, viewers can only read
CREATE POLICY "role_based_access" ON public.cameras
  FOR UPDATE USING (user_can_modify() AND user_has_site_access(site_id));
```

### Organization Isolation
```sql
-- Users can only access data from their organization
CREATE POLICY "organization_isolation" ON public.sites
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.user_id()
    )
  );
```

## Monitoring & Alerting

### Security Metrics
- Failed login attempts
- Token refresh rates
- API key usage
- Session durations
- Data access patterns

### Alert Conditions
- Multiple failed login attempts
- Unusual access patterns
- Token manipulation attempts
- Unauthorized data access
- System security events

## Compliance & Standards

### Security Standards
- **OWASP Top 10**: Protection against common vulnerabilities
- **NIST Cybersecurity Framework**: Comprehensive security controls
- **ISO 27001**: Information security management
- **SOC 2 Type II**: Security and availability controls

### Data Protection
- **GDPR Compliance**: Data protection and privacy rights
- **CCPA Compliance**: California consumer privacy protection
- **Data Minimization**: Collect only necessary data
- **Right to Deletion**: Secure data removal capabilities

## Troubleshooting

### Common Issues

1. **JWT Token Expired**
   - Use refresh token to get new access token
   - Check token expiration settings
   - Verify system clock synchronization

2. **2FA Setup Issues**
   - Ensure TOTP app supports SHA-1 algorithm
   - Check time synchronization between devices
   - Verify QR code scanning accuracy

3. **Encryption Errors**
   - Verify encryption keys are properly set
   - Check key derivation parameters
   - Ensure consistent algorithm usage

4. **RLS Policy Errors**
   - Verify user roles and permissions
   - Check site access assignments
   - Review policy conditions

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run security-server

# Test specific components
npm run test:security
```

## Future Enhancements

- [ ] Hardware security module (HSM) integration
- [ ] Advanced threat detection
- [ ] Biometric authentication support
- [ ] Zero-trust network architecture
- [ ] Advanced audit analytics
- [ ] Compliance reporting automation
- [ ] Security incident response automation
- [ ] Advanced encryption algorithms (post-quantum)

## Support

For security-related issues:

1. Check troubleshooting section
2. Run security test suite: `npm run test:security`
3. Review security logs and audit trails
4. Verify configuration and environment variables
5. Test authentication flow manually
