const ONVIFClient = require('./onvif-client');
const WSDiscovery = require('./ws-discovery');
const { v4: uuidv4 } = require('uuid');

/**
 * ONVIF Device Configuration Manager
 * Manages ONVIF camera discovery, configuration, and capabilities
 */
class DeviceManager {
  constructor(options = {}) {
    this.devices = new Map();
    this.discoveryTimeout = options.discoveryTimeout || 10000;
    this.connectionTimeout = options.connectionTimeout || 15000;
    
    // Event callbacks
    this.onDeviceAdded = options.onDeviceAdded || (() => {});
    this.onDeviceRemoved = options.onDeviceRemoved || (() => {});
    this.onDeviceUpdated = options.onDeviceUpdated || (() => {});
    this.onError = options.onError || console.error;
    
    // Discovery service
    this.wsDiscovery = new WSDiscovery({
      timeout: this.discoveryTimeout,
      onDeviceFound: this.handleDiscoveredDevice.bind(this),
      onError: this.onError
    });
  }

  /**
   * Start automatic device discovery
   */
  async startDiscovery() {
    console.log('Starting ONVIF device discovery...');
    
    try {
      const discoveredDevices = await this.wsDiscovery.discover();
      console.log(`Discovery completed. Found ${discoveredDevices.length} devices.`);
      
      // Process each discovered device
      for (const device of discoveredDevices) {
        await this.processDiscoveredDevice(device);
      }
      
      return this.getDeviceList();
      
    } catch (error) {
      this.onError('Discovery failed:', error);
      throw error;
    }
  }

  /**
   * Handle newly discovered device
   */
  async handleDiscoveredDevice(device) {
    console.log(`Processing discovered device: ${device.name} (${device.ip})`);
    await this.processDiscoveredDevice(device);
  }

  /**
   * Process and configure discovered device
   */
  async processDiscoveredDevice(discoveredDevice) {
    try {
      // Check if device already exists
      const existingDevice = this.findDeviceByIp(discoveredDevice.ip);
      if (existingDevice) {
        console.log(`Device ${discoveredDevice.ip} already exists, updating...`);
        await this.updateDevice(existingDevice.id, discoveredDevice);
        return existingDevice;
      }

      // Create new device entry
      const device = {
        id: discoveredDevice.id || uuidv4(),
        name: discoveredDevice.name,
        ip: discoveredDevice.ip,
        port: discoveredDevice.port,
        manufacturer: discoveredDevice.manufacturer,
        model: discoveredDevice.model,
        type: discoveredDevice.type,
        serviceUrl: discoveredDevice.serviceUrl,
        xaddrs: discoveredDevice.xaddrs,
        discoveredAt: discoveredDevice.discoveredAt,
        status: 'discovered',
        configured: false,
        credentials: null,
        onvifClient: null,
        capabilities: discoveredDevice.capabilities,
        profiles: [],
        lastSeen: new Date()
      };

      this.devices.set(device.id, device);
      this.onDeviceAdded(device);
      
      console.log(`Added device: ${device.name} (${device.ip})`);
      return device;
      
    } catch (error) {
      this.onError(`Failed to process device ${discoveredDevice.ip}:`, error);
      return null;
    }
  }

  /**
   * Configure device with credentials and connect
   */
  async configureDevice(deviceId, credentials) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    try {
      console.log(`Configuring device: ${device.name} (${device.ip})`);
      
      // Create ONVIF client
      const onvifClient = new ONVIFClient({
        host: device.ip,
        port: device.port,
        username: credentials.username,
        password: credentials.password,
        timeout: this.connectionTimeout
      });

      // Initialize ONVIF connection
      await onvifClient.initialize();
      
      // Update device with ONVIF information
      const deviceSummary = onvifClient.getDeviceSummary();
      
      device.credentials = credentials;
      device.onvifClient = onvifClient;
      device.configured = true;
      device.status = 'connected';
      device.deviceInfo = deviceSummary.deviceInfo;
      device.capabilities = deviceSummary.capabilities;
      device.profiles = deviceSummary.profiles;
      device.serviceUrls = deviceSummary.serviceUrls;
      device.lastSeen = new Date();

      // Update device name and info from ONVIF
      if (deviceSummary.deviceInfo) {
        device.manufacturer = deviceSummary.deviceInfo.Manufacturer || device.manufacturer;
        device.model = deviceSummary.deviceInfo.Model || device.model;
        device.firmwareVersion = deviceSummary.deviceInfo.FirmwareVersion;
        device.serialNumber = deviceSummary.deviceInfo.SerialNumber;
        device.hardwareId = deviceSummary.deviceInfo.HardwareId;
      }

      this.onDeviceUpdated(device);
      console.log(`Device configured successfully: ${device.name}`);
      
      return device;
      
    } catch (error) {
      device.status = 'error';
      device.lastError = error.message;
      this.onError(`Failed to configure device ${device.name}:`, error);
      throw error;
    }
  }

  /**
   * Get stream URI for device profile
   */
  async getStreamUri(deviceId, profileToken, protocol = 'RTSP') {
    const device = this.devices.get(deviceId);
    if (!device || !device.onvifClient) {
      throw new Error(`Device ${deviceId} not configured`);
    }

    try {
      return await device.onvifClient.getStreamUri(profileToken, protocol);
    } catch (error) {
      this.onError(`Failed to get stream URI for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get snapshot URI for device profile
   */
  async getSnapshotUri(deviceId, profileToken) {
    const device = this.devices.get(deviceId);
    if (!device || !device.onvifClient) {
      throw new Error(`Device ${deviceId} not configured`);
    }

    try {
      return await device.onvifClient.getSnapshotUri(profileToken);
    } catch (error) {
      this.onError(`Failed to get snapshot URI for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Control PTZ movement
   */
  async controlPtz(deviceId, profileToken, action, params = {}) {
    const device = this.devices.get(deviceId);
    if (!device || !device.onvifClient) {
      throw new Error(`Device ${deviceId} not configured`);
    }

    if (!device.capabilities.ptz) {
      throw new Error(`Device ${deviceId} does not support PTZ`);
    }

    try {
      switch (action) {
        case 'move':
          await device.onvifClient.ptzContinuousMove(profileToken, params.velocity);
          break;
        case 'stop':
          await device.onvifClient.ptzStop(profileToken);
          break;
        case 'status':
          return await device.onvifClient.getPtzStatus(profileToken);
        default:
          throw new Error(`Unknown PTZ action: ${action}`);
      }
    } catch (error) {
      this.onError(`PTZ control failed for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Update imaging settings
   */
  async updateImagingSettings(deviceId, videoSourceToken, settings) {
    const device = this.devices.get(deviceId);
    if (!device || !device.onvifClient) {
      throw new Error(`Device ${deviceId} not configured`);
    }

    if (!device.capabilities.imaging) {
      throw new Error(`Device ${deviceId} does not support imaging control`);
    }

    try {
      await device.onvifClient.setImagingSettings(videoSourceToken, settings);
      device.lastSeen = new Date();
    } catch (error) {
      this.onError(`Failed to update imaging settings for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Reboot device
   */
  async rebootDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device || !device.onvifClient) {
      throw new Error(`Device ${deviceId} not configured`);
    }

    try {
      await device.onvifClient.rebootDevice();
      device.status = 'rebooting';
      device.lastSeen = new Date();
      
      // Disconnect client as device will be unavailable
      device.onvifClient.disconnect();
      device.onvifClient = null;
      device.configured = false;
      
      this.onDeviceUpdated(device);
      
    } catch (error) {
      this.onError(`Failed to reboot device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Remove device from management
   */
  removeDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (device) {
      if (device.onvifClient) {
        device.onvifClient.disconnect();
      }
      this.devices.delete(deviceId);
      this.onDeviceRemoved(device);
      console.log(`Removed device: ${device.name} (${device.ip})`);
    }
  }

  /**
   * Update device information
   */
  async updateDevice(deviceId, updates) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    Object.assign(device, updates);
    device.lastSeen = new Date();
    this.onDeviceUpdated(device);
    
    return device;
  }

  /**
   * Find device by IP address
   */
  findDeviceByIp(ip) {
    for (const device of this.devices.values()) {
      if (device.ip === ip) {
        return device;
      }
    }
    return null;
  }

  /**
   * Get device by ID
   */
  getDevice(deviceId) {
    return this.devices.get(deviceId);
  }

  /**
   * Get all devices
   */
  getDeviceList() {
    return Array.from(this.devices.values()).map(device => ({
      id: device.id,
      name: device.name,
      ip: device.ip,
      port: device.port,
      manufacturer: device.manufacturer,
      model: device.model,
      type: device.type,
      status: device.status,
      configured: device.configured,
      capabilities: device.capabilities,
      profiles: device.profiles,
      lastSeen: device.lastSeen,
      lastError: device.lastError
    }));
  }

  /**
   * Get configured devices only
   */
  getConfiguredDevices() {
    return this.getDeviceList().filter(device => device.configured);
  }

  /**
   * Health check for all configured devices
   */
  async healthCheck() {
    const results = [];
    
    for (const device of this.devices.values()) {
      if (device.configured && device.onvifClient) {
        try {
          const systemTime = await device.onvifClient.getSystemDateAndTime();
          device.status = 'connected';
          device.lastSeen = new Date();
          results.push({ deviceId: device.id, status: 'healthy', systemTime });
        } catch (error) {
          device.status = 'error';
          device.lastError = error.message;
          results.push({ deviceId: device.id, status: 'error', error: error.message });
        }
      }
    }
    
    return results;
  }

  /**
   * Stop discovery and cleanup
   */
  stop() {
    this.wsDiscovery.stop();
    
    // Disconnect all ONVIF clients
    for (const device of this.devices.values()) {
      if (device.onvifClient) {
        device.onvifClient.disconnect();
      }
    }
    
    this.devices.clear();
  }
}

module.exports = DeviceManager;
