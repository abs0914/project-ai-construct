const crypto = require('crypto');
const CryptoJS = require('crypto-js');

/**
 * Encryption Utilities
 * Provides comprehensive encryption functions for sensitive data protection
 */
class EncryptionUtils {
  constructor(options = {}) {
    this.algorithm = options.algorithm || 'aes-256-cbc';
    this.keyDerivationIterations = options.keyDerivationIterations || 100000;
    this.saltLength = options.saltLength || 32;
    this.ivLength = options.ivLength || 16;
    this.tagLength = options.tagLength || 16;
    this.masterKey = options.masterKey || process.env.MASTER_ENCRYPTION_KEY;

    if (!this.masterKey) {
      console.warn('No master encryption key provided. Generating temporary key.');
      this.masterKey = this.generateSecureKey();
    }
  }

  /**
   * Generate a secure random key
   */
  generateSecureKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Derive encryption key from master key and salt
   */
  deriveKey(salt, keyLength = 32) {
    return crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      this.keyDerivationIterations,
      keyLength,
      'sha256'
    );
  }

  /**
   * Encrypt sensitive data with AES-256-CBC
   */
  encrypt(data) {
    try {
      // Convert data to string if it's an object
      const plaintext = typeof data === 'string' ? data : JSON.stringify(data);

      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);

      // Derive encryption key
      const key = this.deriveKey(salt);

      // Create cipher with CBC mode (more compatible)
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Combine all components
      const result = {
        encrypted,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        algorithm: 'aes-256-cbc'
      };

      // Return base64 encoded result
      return Buffer.from(JSON.stringify(result)).toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    try {
      // Parse encrypted data
      const data = JSON.parse(Buffer.from(encryptedData, 'base64').toString());
      const { encrypted, salt, iv, algorithm } = data;

      // Convert hex strings back to buffers
      const saltBuffer = Buffer.from(salt, 'hex');
      const ivBuffer = Buffer.from(iv, 'hex');

      // Derive decryption key
      const key = this.deriveKey(saltBuffer);

      // Create decipher with CBC mode
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);

      // Decrypt data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // Try to parse as JSON, return as string if it fails
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt router credentials
   */
  encryptRouterCredentials(credentials) {
    const sensitiveData = {
      username: credentials.username,
      password: credentials.password,
      apiKey: credentials.apiKey,
      encryptedAt: new Date().toISOString()
    };
    
    return this.encrypt(sensitiveData);
  }

  /**
   * Decrypt router credentials
   */
  decryptRouterCredentials(encryptedCredentials) {
    const decrypted = this.decrypt(encryptedCredentials);
    
    // Verify the data structure
    if (!decrypted.username || !decrypted.password) {
      throw new Error('Invalid credentials format');
    }
    
    return {
      username: decrypted.username,
      password: decrypted.password,
      apiKey: decrypted.apiKey,
      encryptedAt: decrypted.encryptedAt
    };
  }

  /**
   * Encrypt API keys and tokens
   */
  encryptAPIKey(apiKey, metadata = {}) {
    const keyData = {
      key: apiKey,
      metadata,
      encryptedAt: new Date().toISOString(),
      keyId: crypto.randomUUID()
    };
    
    return {
      encryptedKey: this.encrypt(keyData),
      keyId: keyData.keyId
    };
  }

  /**
   * Decrypt API keys
   */
  decryptAPIKey(encryptedKey) {
    const decrypted = this.decrypt(encryptedKey);
    
    if (!decrypted.key) {
      throw new Error('Invalid API key format');
    }
    
    return decrypted;
  }

  /**
   * Encrypt database connection strings
   */
  encryptConnectionString(connectionString) {
    const connectionData = {
      connectionString,
      encryptedAt: new Date().toISOString()
    };
    
    return this.encrypt(connectionData);
  }

  /**
   * Decrypt database connection strings
   */
  decryptConnectionString(encryptedConnectionString) {
    const decrypted = this.decrypt(encryptedConnectionString);
    return decrypted.connectionString;
  }

  /**
   * Encrypt configuration data
   */
  encryptConfig(config) {
    const configData = {
      config,
      encryptedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    return this.encrypt(configData);
  }

  /**
   * Decrypt configuration data
   */
  decryptConfig(encryptedConfig) {
    const decrypted = this.decrypt(encryptedConfig);
    return decrypted.config;
  }

  /**
   * Hash sensitive data for comparison (one-way)
   */
  hashSensitiveData(data, salt = null) {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(this.saltLength);
    const hash = crypto.pbkdf2Sync(data, saltBuffer, this.keyDerivationIterations, 64, 'sha256');
    
    return {
      hash: hash.toString('hex'),
      salt: saltBuffer.toString('hex')
    };
  }

  /**
   * Verify hashed sensitive data
   */
  verifySensitiveData(data, hashedData) {
    const { hash: expectedHash, salt } = hashedData;
    const { hash: actualHash } = this.hashSensitiveData(data, salt);
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash, 'hex'),
      Buffer.from(actualHash, 'hex')
    );
  }

  /**
   * Generate secure random tokens
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate cryptographically secure random passwords
   */
  generateSecurePassword(length = 16, options = {}) {
    const {
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      includeSymbols = true,
      excludeSimilar = true
    } = options;
    
    let charset = '';
    
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    if (excludeSimilar) {
      charset = charset.replace(/[0O1lI]/g, '');
    }
    
    if (charset.length === 0) {
      throw new Error('No character set available for password generation');
    }
    
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Encrypt file data
   */
  encryptFile(fileBuffer) {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);

      // Derive encryption key
      const key = this.deriveKey(salt);

      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

      // Encrypt file data
      const encrypted = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final()
      ]);

      // Combine all components
      const result = Buffer.concat([
        salt,
        iv,
        encrypted
      ]);

      return result;
    } catch (error) {
      throw new Error(`File encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt file data
   */
  decryptFile(encryptedBuffer) {
    try {
      // Extract components
      const salt = encryptedBuffer.slice(0, this.saltLength);
      const iv = encryptedBuffer.slice(this.saltLength, this.saltLength + this.ivLength);
      const encrypted = encryptedBuffer.slice(this.saltLength + this.ivLength);

      // Derive decryption key
      const key = this.deriveKey(salt);

      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

      // Decrypt file data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      return decrypted;
    } catch (error) {
      throw new Error(`File decryption failed: ${error.message}`);
    }
  }

  /**
   * Create encrypted backup of sensitive data
   */
  createEncryptedBackup(data) {
    const backupData = {
      data,
      timestamp: new Date().toISOString(),
      version: '1.0',
      checksum: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
    };
    
    return this.encrypt(backupData);
  }

  /**
   * Restore from encrypted backup
   */
  restoreFromEncryptedBackup(encryptedBackup) {
    const backup = this.decrypt(encryptedBackup);
    
    // Verify checksum
    const expectedChecksum = crypto.createHash('sha256').update(JSON.stringify(backup.data)).digest('hex');
    if (backup.checksum !== expectedChecksum) {
      throw new Error('Backup integrity check failed');
    }
    
    return {
      data: backup.data,
      timestamp: backup.timestamp,
      version: backup.version
    };
  }

  /**
   * Securely wipe sensitive data from memory
   */
  secureWipe(data) {
    if (typeof data === 'string') {
      // Overwrite string with random data
      for (let i = 0; i < data.length; i++) {
        data = data.substring(0, i) + String.fromCharCode(crypto.randomInt(0, 256)) + data.substring(i + 1);
      }
    } else if (Buffer.isBuffer(data)) {
      // Overwrite buffer with random data
      crypto.randomFillSync(data);
    } else if (typeof data === 'object') {
      // Recursively wipe object properties
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          this.secureWipe(data[key]);
          delete data[key];
        }
      }
    }
  }

  /**
   * Get encryption statistics
   */
  getEncryptionStats() {
    return {
      algorithm: this.algorithm,
      keyDerivationIterations: this.keyDerivationIterations,
      saltLength: this.saltLength,
      ivLength: this.ivLength,
      tagLength: this.tagLength,
      masterKeyConfigured: !!this.masterKey
    };
  }
}

module.exports = EncryptionUtils;
