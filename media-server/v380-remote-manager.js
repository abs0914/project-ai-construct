const EventEmitter = require('events');
const net = require('net');
const axios = require('axios');
const V380CaptureService = require('./v380-capture-service');
const V380StreamRelay = require('./v380-stream-relay');

/**
 * V380 Remote Manager
 * Manages V380 cameras across remote networks using GL.iNET routers and ZeroTier VPN
 */
class V380RemoteManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      networkServerUrl: options.networkServerUrl || 'http://localhost:3003',
      zerotierTimeout: options.zerotierTimeout || 30000,
      routerTimeout: options.routerTimeout || 15000,
      connectionRetries: options.connectionRetries || 3,
      ...options
    };
    
    this.captureService = new V380CaptureService();
    this.streamRelay = new V380StreamRelay();
    
    // Track remote networks and cameras
    this.remoteNetworks = new Map(); // ZeroTier network ID -> network info
    this.remoteCameras = new Map();  // Camera ID -> camera info with network details
    this.routerClients = new Map();  // Router ID -> GL.iNET client info
    this.connectionCache = new Map(); // Cache successful connections
    
    this.isRunning = false;
  }

  /**
   * Start the V380 remote manager
   */
  async start() {
    if (this.isRunning) {
      console.log('V380 Remote Manager already running');
      return;
    }

    try {
      console.log('Starting V380 Remote Manager...');
      
      // Start local V380 services
      await this.captureService.start();
      await this.streamRelay.start();
      
      // Discover available networks
      await this.discoverNetworks();
      
      // Start network monitoring
      this.startNetworkMonitoring();
      
      this.isRunning = true;
      this.emit('started');
      
      console.log('✅ V380 Remote Manager started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start V380 Remote Manager:', error);
      throw error;
    }
  }

  /**
   * Stop the V380 remote manager
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping V380 Remote Manager...');
    
    try {
      // Stop network monitoring
      this.stopNetworkMonitoring();
      
      // Stop all remote camera streams
      for (const [cameraId] of this.remoteCameras) {
        await this.stopRemoteCamera(cameraId);
      }
      
      // Stop local services
      await this.captureService.stop();
      await this.streamRelay.stop();
      
      this.isRunning = false;
      this.emit('stopped');
      
      console.log('✅ V380 Remote Manager stopped');
      
    } catch (error) {
      console.error('❌ Error stopping V380 Remote Manager:', error);
      throw error;
    }
  }

  /**
   * Discover available ZeroTier networks and GL.iNET routers
   */
  async discoverNetworks() {
    try {
      console.log('🔍 Discovering remote networks...');
      
      // Get ZeroTier networks
      const networksResponse = await axios.get(
        `${this.config.networkServerUrl}/api/network/zerotier/networks`,
        { timeout: this.config.zerotierTimeout }
      );
      
      if (networksResponse.data.success) {
        for (const network of networksResponse.data.networks) {
          this.remoteNetworks.set(network.id, {
            id: network.id,
            name: network.name,
            description: network.description,
            members: network.members || [],
            ipRange: this.extractIPRange(network),
            status: 'available'
          });
        }
        console.log(`Found ${this.remoteNetworks.size} ZeroTier networks`);
      }
      
      // Get GL.iNET routers
      const routersResponse = await axios.get(
        `${this.config.networkServerUrl}/api/network/routers`,
        { timeout: this.config.routerTimeout }
      );
      
      if (routersResponse.data.success) {
        for (const router of routersResponse.data.routers) {
          this.routerClients.set(router.id, {
            id: router.id,
            name: router.name,
            location: router.location,
            ip: router.ip,
            zerotierIp: router.zerotier_ip_address,
            status: router.status,
            networkId: router.zerotier_network_id
          });
        }
        console.log(`Found ${this.routerClients.size} GL.iNET routers`);
      }
      
    } catch (error) {
      console.error('Failed to discover networks:', error);
      throw new Error(`Network discovery failed: ${error.message}`);
    }
  }

  /**
   * Add a remote V380 camera
   */
  async addRemoteCamera(cameraId, config) {
    try {
      console.log(`Adding remote V380 camera: ${cameraId}`);
      
      // Validate configuration
      this.validateRemoteCameraConfig(config);
      
      // Determine best connection path
      const connectionPath = await this.findBestConnectionPath(config);
      
      const cameraInfo = {
        id: cameraId,
        config: config,
        connectionPath: connectionPath,
        status: 'disconnected',
        lastSeen: null,
        retryCount: 0,
        streamActive: false
      };
      
      this.remoteCameras.set(cameraId, cameraInfo);
      this.emit('cameraAdded', cameraId, cameraInfo);
      
      console.log(`✅ Remote V380 camera added: ${cameraId}`);
      return cameraInfo;
      
    } catch (error) {
      console.error(`Failed to add remote camera ${cameraId}:`, error);
      throw error;
    }
  }

  /**
   * Start streaming from a remote V380 camera
   */
  async startRemoteCamera(cameraId, outputFormat = 'hls') {
    const camera = this.remoteCameras.get(cameraId);
    if (!camera) {
      throw new Error(`Remote camera ${cameraId} not found`);
    }

    try {
      console.log(`Starting remote V380 camera: ${cameraId}`);
      
      // Test connection path
      const isReachable = await this.testCameraConnection(camera);
      if (!isReachable) {
        throw new Error(`Camera ${cameraId} is not reachable`);
      }
      
      // Generate connection URL based on path
      const connectionUrl = this.generateConnectionUrl(camera);
      
      // Start capture through the connection path
      await this.captureService.startCapture(cameraId, {
        inputSource: connectionUrl,
        networkPath: camera.connectionPath,
        remoteConfig: camera.config
      });
      
      // Start stream relay
      const relayId = await this.streamRelay.startRelay(cameraId, connectionUrl, outputFormat);
      
      // Update camera status
      camera.status = 'streaming';
      camera.streamActive = true;
      camera.lastSeen = new Date();
      camera.relayId = relayId;
      
      this.emit('cameraStarted', cameraId, camera);
      
      console.log(`✅ Remote V380 camera streaming: ${cameraId}`);
      return {
        cameraId,
        relayId,
        streamUrls: this.streamRelay.getStreamUrls(cameraId),
        connectionPath: camera.connectionPath
      };
      
    } catch (error) {
      console.error(`Failed to start remote camera ${cameraId}:`, error);
      camera.status = 'error';
      camera.retryCount++;
      throw error;
    }
  }

  /**
   * Stop streaming from a remote V380 camera
   */
  async stopRemoteCamera(cameraId) {
    const camera = this.remoteCameras.get(cameraId);
    if (!camera) {
      throw new Error(`Remote camera ${cameraId} not found`);
    }

    try {
      console.log(`Stopping remote V380 camera: ${cameraId}`);
      
      // Stop capture
      await this.captureService.stopCapture(cameraId);
      
      // Stop relay
      if (camera.relayId) {
        await this.streamRelay.stopRelay(camera.relayId);
      }
      
      // Update camera status
      camera.status = 'disconnected';
      camera.streamActive = false;
      camera.relayId = null;
      
      this.emit('cameraStopped', cameraId, camera);
      
      console.log(`✅ Remote V380 camera stopped: ${cameraId}`);
      
    } catch (error) {
      console.error(`Failed to stop remote camera ${cameraId}:`, error);
      throw error;
    }
  }

  /**
   * Find the best connection path for a camera
   */
  async findBestConnectionPath(config) {
    const paths = [];
    
    // Direct connection (if on same network)
    if (config.directIp) {
      paths.push({
        type: 'direct',
        ip: config.directIp,
        port: config.port || 554,
        priority: 1
      });
    }
    
    // ZeroTier connection
    if (config.zerotierIp || config.routerId) {
      const router = config.routerId ? this.routerClients.get(config.routerId) : null;
      const zerotierIp = config.zerotierIp || (router ? router.zerotierIp : null);
      
      if (zerotierIp) {
        paths.push({
          type: 'zerotier',
          ip: zerotierIp,
          port: config.port || 554,
          routerId: config.routerId,
          networkId: router ? router.networkId : config.networkId,
          priority: 2
        });
      }
    }
    
    // Router forwarding
    if (config.routerId) {
      const router = this.routerClients.get(config.routerId);
      if (router && router.ip) {
        paths.push({
          type: 'router_forward',
          routerIp: router.ip,
          cameraIp: config.localIp,
          port: config.port || 554,
          routerId: config.routerId,
          priority: 3
        });
      }
    }
    
    // Sort by priority and test connectivity
    paths.sort((a, b) => a.priority - b.priority);
    
    for (const path of paths) {
      const isReachable = await this.testConnectionPath(path);
      if (isReachable) {
        console.log(`Selected connection path: ${path.type} (${path.ip || path.routerIp})`);
        return path;
      }
    }
    
    throw new Error('No reachable connection path found');
  }

  /**
   * Test connection to a camera through a specific path
   */
  async testConnectionPath(path) {
    return new Promise((resolve) => {
      const timeout = 5000;
      let targetIp, targetPort;
      
      switch (path.type) {
        case 'direct':
        case 'zerotier':
          targetIp = path.ip;
          targetPort = path.port;
          break;
        case 'router_forward':
          targetIp = path.routerIp;
          targetPort = path.port;
          break;
        default:
          resolve(false);
          return;
      }
      
      const socket = new net.Socket();
      
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, timeout);
      
      socket.connect(targetPort, targetIp, () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
    });
  }

  /**
   * Generate connection URL based on camera and path
   */
  generateConnectionUrl(camera) {
    const { config, connectionPath } = camera;
    const credentials = config.credentials || {};
    const auth = credentials.username && credentials.password 
      ? `${credentials.username}:${credentials.password}@` 
      : '';
    
    let targetIp, targetPort;
    
    switch (connectionPath.type) {
      case 'direct':
      case 'zerotier':
        targetIp = connectionPath.ip;
        targetPort = connectionPath.port;
        break;
      case 'router_forward':
        targetIp = connectionPath.routerIp;
        targetPort = connectionPath.port;
        break;
      default:
        throw new Error(`Unsupported connection path type: ${connectionPath.type}`);
    }
    
    const rtspPath = config.streamSettings?.rtspPath || '/stream1';
    return `rtsp://${auth}${targetIp}:${targetPort}${rtspPath}`;
  }

  /**
   * Test camera connection
   */
  async testCameraConnection(camera) {
    return await this.testConnectionPath(camera.connectionPath);
  }

  /**
   * Validate remote camera configuration
   */
  validateRemoteCameraConfig(config) {
    if (!config.name) {
      throw new Error('Camera name is required');
    }
    
    if (!config.directIp && !config.zerotierIp && !config.routerId) {
      throw new Error('At least one connection method must be specified (directIp, zerotierIp, or routerId)');
    }
    
    if (config.routerId && !this.routerClients.has(config.routerId)) {
      throw new Error(`Router ${config.routerId} not found`);
    }
  }

  /**
   * Extract IP range from ZeroTier network
   */
  extractIPRange(network) {
    if (network.config && network.config.ipAssignmentPools) {
      const pool = network.config.ipAssignmentPools[0];
      return `${pool.ipRangeStart} - ${pool.ipRangeEnd}`;
    }
    return 'Unknown';
  }

  /**
   * Start network monitoring
   */
  startNetworkMonitoring() {
    this.networkMonitorInterval = setInterval(async () => {
      try {
        await this.checkNetworkHealth();
      } catch (error) {
        console.error('Network monitoring error:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop network monitoring
   */
  stopNetworkMonitoring() {
    if (this.networkMonitorInterval) {
      clearInterval(this.networkMonitorInterval);
      this.networkMonitorInterval = null;
    }
  }

  /**
   * Check network health and camera connectivity
   */
  async checkNetworkHealth() {
    for (const [cameraId, camera] of this.remoteCameras) {
      if (camera.streamActive) {
        const isReachable = await this.testCameraConnection(camera);
        if (!isReachable) {
          console.warn(`Camera ${cameraId} became unreachable`);
          camera.status = 'unreachable';
          this.emit('cameraUnreachable', cameraId, camera);
          
          // Attempt to reconnect
          try {
            await this.reconnectCamera(cameraId);
          } catch (error) {
            console.error(`Failed to reconnect camera ${cameraId}:`, error);
          }
        } else {
          camera.lastSeen = new Date();
          if (camera.status === 'unreachable') {
            camera.status = 'streaming';
            this.emit('cameraReconnected', cameraId, camera);
          }
        }
      }
    }
  }

  /**
   * Attempt to reconnect a camera
   */
  async reconnectCamera(cameraId) {
    const camera = this.remoteCameras.get(cameraId);
    if (!camera) return;
    
    console.log(`Attempting to reconnect camera: ${cameraId}`);
    
    // Stop current stream
    await this.stopRemoteCamera(cameraId);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Find new connection path
    camera.connectionPath = await this.findBestConnectionPath(camera.config);
    
    // Restart stream
    await this.startRemoteCamera(cameraId);
  }

  /**
   * Get status of all remote cameras
   */
  getRemoteCameraStatus() {
    const status = {
      totalCameras: this.remoteCameras.size,
      activeCameras: 0,
      unreachableCameras: 0,
      cameras: {}
    };
    
    for (const [cameraId, camera] of this.remoteCameras) {
      status.cameras[cameraId] = {
        id: cameraId,
        name: camera.config.name,
        status: camera.status,
        streamActive: camera.streamActive,
        connectionType: camera.connectionPath?.type,
        lastSeen: camera.lastSeen,
        retryCount: camera.retryCount
      };
      
      if (camera.streamActive) status.activeCameras++;
      if (camera.status === 'unreachable') status.unreachableCameras++;
    }
    
    return status;
  }
}

module.exports = V380RemoteManager;
