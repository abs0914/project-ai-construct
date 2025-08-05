const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');

/**
 * V380 Configuration Manager
 * Manages V380 camera configurations, authentication, and protocol settings
 */
class V380ConfigManager extends EventEmitter {
  constructor(configPath = './v380-cameras.json') {
    super();
    
    this.configPath = configPath;
    this.cameras = new Map();
    this.encryptionKey = process.env.V380_ENCRYPTION_KEY || 'default-key-change-in-production';
    
    // Load existing configuration
    this.loadConfiguration();
    
    // Auto-save configuration changes
    this.on('configChanged', () => {
      this.saveConfiguration();
    });
  }

  /**
   * Load camera configurations from file
   */
  loadConfiguration() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(data);
        
        // Load cameras with decrypted passwords
        for (const [cameraId, cameraConfig] of Object.entries(config.cameras || {})) {
          this.cameras.set(cameraId, {
            ...cameraConfig,
            credentials: {
              ...cameraConfig.credentials,
              password: this.decrypt(cameraConfig.credentials.encryptedPassword)
            }
          });
        }
        
        console.log(`Loaded ${this.cameras.size} V380 camera configurations`);
      } else {
        console.log('No existing V380 configuration found, starting with empty config');
        this.createDefaultConfiguration();
      }
    } catch (error) {
      console.error('Error loading V380 configuration:', error);
      this.createDefaultConfiguration();
    }
  }

  /**
   * Save camera configurations to file
   */
  saveConfiguration() {
    try {
      const config = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        cameras: {}
      };
      
      // Save cameras with encrypted passwords
      for (const [cameraId, cameraConfig] of this.cameras) {
        const configToSave = { ...cameraConfig };

        // Handle credentials encryption if they exist
        if (cameraConfig.credentials && cameraConfig.credentials.password) {
          configToSave.credentials = {
            ...cameraConfig.credentials,
            encryptedPassword: this.encrypt(cameraConfig.credentials.password),
            password: undefined // Remove plain text password
          };
        }

        config.cameras[cameraId] = configToSave;
      }
      
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      console.log(`Saved V380 configuration for ${this.cameras.size} cameras`);
      
    } catch (error) {
      console.error('Error saving V380 configuration:', error);
    }
  }

  /**
   * Create default configuration
   */
  createDefaultConfiguration() {
    console.log('Creating default V380 configuration');
    
    // Add sample V380 camera configurations
    this.addCamera('v380-cam-001', {
      name: 'V380 Camera 001',
      ip: '192.168.1.100',
      port: 554,
      model: 'V380 Pro',
      firmware: '1.0.0',
      credentials: {
        username: 'admin',
        password: 'password'
      },
      streamSettings: {
        rtspPath: '/stream1',
        quality: 'high',
        resolution: '1920x1080',
        frameRate: 25,
        bitrate: 2000,
        audioEnabled: true
      },
      protocolSettings: {
        version: '1.0',
        encryption: false,
        compression: true,
        heartbeatInterval: 30000,
        reconnectInterval: 5000,
        maxRetries: 3
      },
      capabilities: {
        ptz: true,
        nightVision: true,
        motionDetection: true,
        audioSupport: true,
        recordingSupport: true
      },
      status: {
        enabled: true,
        lastSeen: null,
        connectionStatus: 'disconnected'
      }
    });
    
    this.saveConfiguration();
  }

  /**
   * Add a new V380 camera configuration
   */
  addCamera(cameraId, config) {
    const cameraConfig = {
      id: cameraId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...config
    };
    
    this.cameras.set(cameraId, cameraConfig);
    this.emit('configChanged');
    this.emit('cameraAdded', cameraId, cameraConfig);
    
    console.log(`Added V380 camera configuration: ${cameraId}`);
    return cameraConfig;
  }

  /**
   * Update an existing V380 camera configuration
   */
  updateCamera(cameraId, updates) {
    const existingConfig = this.cameras.get(cameraId);
    if (!existingConfig) {
      throw new Error(`Camera ${cameraId} not found`);
    }
    
    const updatedConfig = {
      ...existingConfig,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.cameras.set(cameraId, updatedConfig);
    this.emit('configChanged');
    this.emit('cameraUpdated', cameraId, updatedConfig);
    
    console.log(`Updated V380 camera configuration: ${cameraId}`);
    return updatedConfig;
  }

  /**
   * Remove a V380 camera configuration
   */
  removeCamera(cameraId) {
    const config = this.cameras.get(cameraId);
    if (!config) {
      throw new Error(`Camera ${cameraId} not found`);
    }
    
    this.cameras.delete(cameraId);
    this.emit('configChanged');
    this.emit('cameraRemoved', cameraId, config);
    
    console.log(`Removed V380 camera configuration: ${cameraId}`);
    return config;
  }

  /**
   * Get a specific camera configuration
   */
  getCamera(cameraId) {
    return this.cameras.get(cameraId);
  }

  /**
   * Get all camera configurations
   */
  getAllCameras() {
    return Array.from(this.cameras.entries()).map(([id, config]) => ({
      id,
      ...config
    }));
  }

  /**
   * Get cameras by status
   */
  getCamerasByStatus(status) {
    return this.getAllCameras().filter(camera => 
      camera.status.connectionStatus === status
    );
  }

  /**
   * Update camera status
   */
  updateCameraStatus(cameraId, status) {
    const camera = this.cameras.get(cameraId);
    if (!camera) {
      throw new Error(`Camera ${cameraId} not found`);
    }
    
    camera.status = {
      ...camera.status,
      ...status,
      lastSeen: new Date().toISOString()
    };
    
    this.cameras.set(cameraId, camera);
    this.emit('statusUpdated', cameraId, camera.status);
    
    return camera.status;
  }

  /**
   * Generate RTSP URL for a camera
   */
  getRTSPUrl(cameraId) {
    const camera = this.cameras.get(cameraId);
    if (!camera) {
      throw new Error(`Camera ${cameraId} not found`);
    }
    
    const { ip, port, credentials, streamSettings } = camera;
    const auth = `${credentials.username}:${credentials.password}`;
    
    return `rtsp://${auth}@${ip}:${port}${streamSettings.rtspPath}`;
  }

  /**
   * Get V380 PC software connection settings
   */
  getPCSoftwareSettings(cameraId) {
    const camera = this.cameras.get(cameraId);
    if (!camera) {
      throw new Error(`Camera ${cameraId} not found`);
    }
    
    return {
      cameraId,
      ip: camera.ip,
      port: camera.port,
      credentials: camera.credentials,
      protocolSettings: camera.protocolSettings,
      streamSettings: camera.streamSettings
    };
  }

  /**
   * Validate camera configuration
   */
  validateCameraConfig(config) {
    const required = ['name', 'ip', 'credentials'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(config.ip)) {
      throw new Error('Invalid IP address format');
    }
    
    // Validate credentials
    if (!config.credentials.username || !config.credentials.password) {
      throw new Error('Username and password are required');
    }
    
    return true;
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    try {
      // Use createCipheriv instead of deprecated createCipher
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Prepend IV to encrypted data
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      return text; // Return plain text if encryption fails
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedText) {
    try {
      // Handle both old and new encryption formats
      if (!encryptedText.includes(':')) {
        // Old format - return as is since we can't decrypt without proper IV
        console.warn('Old encryption format detected, returning encrypted text');
        return encryptedText;
      }

      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

      const [ivHex, encrypted] = encryptedText.split(':');
      const iv = Buffer.from(ivHex, 'hex');

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedText; // Return encrypted text if decryption fails
    }
  }

  /**
   * Export configuration for backup
   */
  exportConfiguration() {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      cameras: this.getAllCameras()
    };
  }

  /**
   * Import configuration from backup
   */
  importConfiguration(configData) {
    try {
      if (!configData.cameras || !Array.isArray(configData.cameras)) {
        throw new Error('Invalid configuration format');
      }
      
      // Clear existing configuration
      this.cameras.clear();
      
      // Import cameras
      for (const camera of configData.cameras) {
        this.validateCameraConfig(camera);
        this.cameras.set(camera.id, camera);
      }
      
      this.emit('configChanged');
      this.emit('configImported', configData.cameras.length);
      
      console.log(`Imported ${configData.cameras.length} V380 camera configurations`);
      return true;
      
    } catch (error) {
      console.error('Error importing V380 configuration:', error);
      throw error;
    }
  }

  /**
   * Get configuration statistics
   */
  getStatistics() {
    const cameras = this.getAllCameras();
    const statusCounts = {};
    
    cameras.forEach(camera => {
      const status = camera.status.connectionStatus;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return {
      totalCameras: cameras.length,
      statusCounts,
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = V380ConfigManager;
