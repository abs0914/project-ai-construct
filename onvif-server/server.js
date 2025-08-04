const express = require('express');
const cors = require('cors');
const DeviceManager = require('./device-manager');

/**
 * ONVIF Server
 * Provides REST API for ONVIF device discovery and management
 */
class ONVIFServer {
  constructor(options = {}) {
    this.port = options.port || 3002;
    this.app = express();
    this.server = null;
    
    // Initialize device manager
    this.deviceManager = new DeviceManager({
      discoveryTimeout: options.discoveryTimeout || 10000,
      connectionTimeout: options.connectionTimeout || 15000,
      onDeviceAdded: this.handleDeviceAdded.bind(this),
      onDeviceRemoved: this.handleDeviceRemoved.bind(this),
      onDeviceUpdated: this.handleDeviceUpdated.bind(this),
      onError: this.handleError.bind(this)
    });
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    this.app.use(cors({
      origin: [
        'https://aiconstructpro.com',
        'https://www.aiconstructpro.com',
        'https://preview--project-ai-construct.lovable.app',
        'http://localhost:5173',
        'http://localhost:3000'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));
    this.app.use(express.json());
    
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
    // Discovery endpoints
    this.app.post('/api/onvif/discover', this.handleDiscovery.bind(this));
    this.app.get('/api/onvif/devices', this.handleGetDevices.bind(this));
    this.app.get('/api/onvif/devices/:deviceId', this.handleGetDevice.bind(this));
    
    // Configuration endpoints
    this.app.post('/api/onvif/devices/:deviceId/configure', this.handleConfigureDevice.bind(this));
    this.app.delete('/api/onvif/devices/:deviceId', this.handleRemoveDevice.bind(this));
    this.app.post('/api/onvif/devices/:deviceId/reboot', this.handleRebootDevice.bind(this));
    
    // Stream endpoints
    this.app.get('/api/onvif/devices/:deviceId/stream-uri', this.handleGetStreamUri.bind(this));
    this.app.get('/api/onvif/devices/:deviceId/snapshot-uri', this.handleGetSnapshotUri.bind(this));
    
    // PTZ control endpoints
    this.app.post('/api/onvif/devices/:deviceId/ptz/:action', this.handlePtzControl.bind(this));
    this.app.get('/api/onvif/devices/:deviceId/ptz/status', this.handleGetPtzStatus.bind(this));
    
    // Imaging control endpoints
    this.app.post('/api/onvif/devices/:deviceId/imaging', this.handleUpdateImaging.bind(this));
    
    // Health check endpoints
    this.app.get('/api/onvif/health', this.handleHealthCheck.bind(this));
    this.app.get('/api/onvif/devices/:deviceId/health', this.handleDeviceHealth.bind(this));
    
    // Error handler
    this.app.use(this.errorHandler.bind(this));
  }

  /**
   * Handle device discovery
   */
  async handleDiscovery(req, res) {
    try {
      console.log('Starting ONVIF device discovery...');
      const devices = await this.deviceManager.startDiscovery();
      
      res.json({
        success: true,
        message: `Discovered ${devices.length} devices`,
        devices: devices
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get all devices
   */
  async handleGetDevices(req, res) {
    try {
      const devices = this.deviceManager.getDeviceList();
      res.json({
        success: true,
        devices: devices
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get specific device
   */
  async handleGetDevice(req, res) {
    try {
      const { deviceId } = req.params;
      const device = this.deviceManager.getDevice(deviceId);
      
      if (!device) {
        return res.status(404).json({
          success: false,
          error: 'Device not found'
        });
      }
      
      res.json({
        success: true,
        device: device
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Configure device with credentials
   */
  async handleConfigureDevice(req, res) {
    try {
      const { deviceId } = req.params;
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required'
        });
      }
      
      const device = await this.deviceManager.configureDevice(deviceId, {
        username,
        password
      });
      
      res.json({
        success: true,
        message: 'Device configured successfully',
        device: device
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Remove device
   */
  async handleRemoveDevice(req, res) {
    try {
      const { deviceId } = req.params;
      this.deviceManager.removeDevice(deviceId);
      
      res.json({
        success: true,
        message: 'Device removed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Reboot device
   */
  async handleRebootDevice(req, res) {
    try {
      const { deviceId } = req.params;
      await this.deviceManager.rebootDevice(deviceId);
      
      res.json({
        success: true,
        message: 'Device reboot initiated'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get stream URI
   */
  async handleGetStreamUri(req, res) {
    try {
      const { deviceId } = req.params;
      const { profileToken, protocol = 'RTSP' } = req.query;
      
      if (!profileToken) {
        return res.status(400).json({
          success: false,
          error: 'Profile token is required'
        });
      }
      
      const streamUri = await this.deviceManager.getStreamUri(deviceId, profileToken, protocol);
      
      res.json({
        success: true,
        streamUri: streamUri
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get snapshot URI
   */
  async handleGetSnapshotUri(req, res) {
    try {
      const { deviceId } = req.params;
      const { profileToken } = req.query;
      
      if (!profileToken) {
        return res.status(400).json({
          success: false,
          error: 'Profile token is required'
        });
      }
      
      const snapshotUri = await this.deviceManager.getSnapshotUri(deviceId, profileToken);
      
      res.json({
        success: true,
        snapshotUri: snapshotUri
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle PTZ control
   */
  async handlePtzControl(req, res) {
    try {
      const { deviceId, action } = req.params;
      const { profileToken, velocity } = req.body;
      
      if (!profileToken) {
        return res.status(400).json({
          success: false,
          error: 'Profile token is required'
        });
      }
      
      const result = await this.deviceManager.controlPtz(deviceId, profileToken, action, {
        velocity
      });
      
      res.json({
        success: true,
        result: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get PTZ status
   */
  async handleGetPtzStatus(req, res) {
    try {
      const { deviceId } = req.params;
      const { profileToken } = req.query;
      
      if (!profileToken) {
        return res.status(400).json({
          success: false,
          error: 'Profile token is required'
        });
      }
      
      const status = await this.deviceManager.controlPtz(deviceId, profileToken, 'status');
      
      res.json({
        success: true,
        status: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update imaging settings
   */
  async handleUpdateImaging(req, res) {
    try {
      const { deviceId } = req.params;
      const { videoSourceToken, settings } = req.body;
      
      if (!videoSourceToken || !settings) {
        return res.status(400).json({
          success: false,
          error: 'Video source token and settings are required'
        });
      }
      
      await this.deviceManager.updateImagingSettings(deviceId, videoSourceToken, settings);
      
      res.json({
        success: true,
        message: 'Imaging settings updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Health check for all devices
   */
  async handleHealthCheck(req, res) {
    try {
      const results = await this.deviceManager.healthCheck();
      
      res.json({
        success: true,
        results: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Health check for specific device
   */
  async handleDeviceHealth(req, res) {
    try {
      const { deviceId } = req.params;
      const device = this.deviceManager.getDevice(deviceId);
      
      if (!device) {
        return res.status(404).json({
          success: false,
          error: 'Device not found'
        });
      }
      
      res.json({
        success: true,
        device: {
          id: device.id,
          name: device.name,
          status: device.status,
          lastSeen: device.lastSeen,
          lastError: device.lastError
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Error handler middleware
   */
  errorHandler(error, req, res, next) {
    console.error('API Error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }

  /**
   * Event handlers
   */
  handleDeviceAdded(device) {
    console.log(`Device added: ${device.name} (${device.ip})`);
  }

  handleDeviceRemoved(device) {
    console.log(`Device removed: ${device.name} (${device.ip})`);
  }

  handleDeviceUpdated(device) {
    console.log(`Device updated: ${device.name} (${device.ip})`);
  }

  handleError(message, error) {
    console.error(`ONVIF Error: ${message}`, error);
  }

  /**
   * Start the ONVIF server
   */
  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`ONVIF Server running on port ${this.port}`);
      console.log('Available endpoints:');
      console.log('  POST /api/onvif/discover - Start device discovery');
      console.log('  GET  /api/onvif/devices - List all devices');
      console.log('  POST /api/onvif/devices/:id/configure - Configure device');
      console.log('  GET  /api/onvif/devices/:id/stream-uri - Get stream URI');
      console.log('  POST /api/onvif/devices/:id/ptz/:action - PTZ control');
    });
  }

  /**
   * Stop the ONVIF server
   */
  stop() {
    if (this.server) {
      this.server.close();
    }
    this.deviceManager.stop();
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new ONVIFServer();
  server.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down ONVIF server...');
    server.stop();
    process.exit(0);
  });
}

module.exports = ONVIFServer;
