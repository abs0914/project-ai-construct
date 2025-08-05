const EventEmitter = require('events');
const net = require('net');
const dgram = require('dgram');
const axios = require('axios');

/**
 * V380 Network Discovery Service
 * Discovers V380 cameras across local and remote networks (ZeroTier)
 */
class V380NetworkDiscovery extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      discoveryPort: options.discoveryPort || 8600,
      broadcastPort: options.broadcastPort || 8601,
      scanTimeout: options.scanTimeout || 10000,
      retryAttempts: options.retryAttempts || 3,
      networkServerUrl: options.networkServerUrl || 'http://localhost:3003',
      ...options
    };
    
    this.discoveredCameras = new Map();
    this.activeScans = new Map();
    this.isRunning = false;
  }

  /**
   * Start the discovery service
   */
  async start() {
    if (this.isRunning) {
      console.log('V380 Network Discovery already running');
      return;
    }

    try {
      console.log('Starting V380 Network Discovery...');
      
      // Initialize UDP socket for discovery
      this.discoverySocket = dgram.createSocket('udp4');
      this.discoverySocket.bind(this.config.discoveryPort);
      
      this.discoverySocket.on('message', (msg, rinfo) => {
        this.handleDiscoveryResponse(msg, rinfo);
      });
      
      this.discoverySocket.on('error', (error) => {
        console.error('Discovery socket error:', error);
      });
      
      this.isRunning = true;
      this.emit('started');
      
      console.log('✅ V380 Network Discovery started');
      
    } catch (error) {
      console.error('❌ Failed to start V380 Network Discovery:', error);
      throw error;
    }
  }

  /**
   * Stop the discovery service
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping V380 Network Discovery...');
    
    // Stop all active scans
    for (const [scanId, scan] of this.activeScans) {
      clearTimeout(scan.timeout);
    }
    this.activeScans.clear();
    
    // Close discovery socket
    if (this.discoverySocket) {
      this.discoverySocket.close();
      this.discoverySocket = null;
    }
    
    this.isRunning = false;
    this.emit('stopped');
    
    console.log('✅ V380 Network Discovery stopped');
  }

  /**
   * Discover V380 cameras on local network
   */
  async discoverLocalCameras() {
    console.log('🔍 Discovering V380 cameras on local network...');
    
    const scanId = `local_${Date.now()}`;
    const discoveredCameras = [];
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.activeScans.delete(scanId);
        console.log(`Found ${discoveredCameras.length} V380 cameras on local network`);
        resolve(discoveredCameras);
      }, this.config.scanTimeout);
      
      this.activeScans.set(scanId, {
        type: 'local',
        timeout,
        cameras: discoveredCameras,
        resolve,
        reject
      });
      
      // Send V380 discovery broadcast
      this.sendV380DiscoveryBroadcast('255.255.255.255');
      
      // Also try common camera IP ranges
      const commonRanges = [
        '192.168.1.0/24',
        '192.168.0.0/24',
        '10.0.0.0/24'
      ];
      
      for (const range of commonRanges) {
        this.scanIPRange(range, scanId);
      }
    });
  }

  /**
   * Discover V380 cameras on ZeroTier networks
   */
  async discoverZeroTierCameras() {
    console.log('🔍 Discovering V380 cameras on ZeroTier networks...');
    
    try {
      // Get ZeroTier networks from network server
      const networksResponse = await axios.get(
        `${this.config.networkServerUrl}/api/network/zerotier/networks`
      );
      
      if (!networksResponse.data.success) {
        throw new Error('Failed to get ZeroTier networks');
      }
      
      const allCameras = [];
      
      for (const network of networksResponse.data.networks) {
        console.log(`Scanning ZeroTier network: ${network.name} (${network.id})`);
        
        const networkCameras = await this.scanZeroTierNetwork(network);
        allCameras.push(...networkCameras);
      }
      
      console.log(`Found ${allCameras.length} V380 cameras on ZeroTier networks`);
      return allCameras;
      
    } catch (error) {
      console.error('Failed to discover ZeroTier cameras:', error);
      return [];
    }
  }

  /**
   * Scan a specific ZeroTier network for V380 cameras
   */
  async scanZeroTierNetwork(network) {
    const scanId = `zerotier_${network.id}_${Date.now()}`;
    const discoveredCameras = [];
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.activeScans.delete(scanId);
        resolve(discoveredCameras);
      }, this.config.scanTimeout);
      
      this.activeScans.set(scanId, {
        type: 'zerotier',
        networkId: network.id,
        timeout,
        cameras: discoveredCameras,
        resolve
      });
      
      // Get network members and scan their IPs
      if (network.members && network.members.length > 0) {
        for (const member of network.members) {
          if (member.config && member.config.ipAssignments) {
            for (const ip of member.config.ipAssignments) {
              this.scanSingleIP(ip, scanId, {
                networkId: network.id,
                networkName: network.name,
                memberId: member.nodeId
              });
            }
          }
        }
      }
      
      // Also scan the network's IP assignment pools
      if (network.config && network.config.ipAssignmentPools) {
        for (const pool of network.config.ipAssignmentPools) {
          this.scanIPPool(pool, scanId, {
            networkId: network.id,
            networkName: network.name
          });
        }
      }
    });
  }

  /**
   * Send V380 discovery broadcast
   */
  sendV380DiscoveryBroadcast(targetIP) {
    if (!this.discoverySocket) return;
    
    // V380 discovery packet format
    const discoveryPacket = Buffer.from([
      0x56, 0x33, 0x38, 0x30, // "V380" header
      0x01,                   // Discovery request
      0x00, 0x00, 0x00, 0x00, // Length (0 for discovery)
      0x00, 0x00              // Checksum
    ]);
    
    this.discoverySocket.send(
      discoveryPacket,
      this.config.broadcastPort,
      targetIP,
      (error) => {
        if (error) {
          console.error(`Failed to send discovery to ${targetIP}:`, error);
        }
      }
    );
  }

  /**
   * Scan IP range for V380 cameras
   */
  async scanIPRange(cidr, scanId) {
    const [network, prefixLength] = cidr.split('/');
    const networkParts = network.split('.').map(Number);
    const hostBits = 32 - parseInt(prefixLength);
    const numHosts = Math.pow(2, hostBits) - 2; // Exclude network and broadcast
    
    // Limit scan to reasonable number of IPs
    const maxIPs = Math.min(numHosts, 254);
    
    for (let i = 1; i <= maxIPs; i++) {
      const ip = this.calculateIPFromOffset(networkParts, i, hostBits);
      this.scanSingleIP(ip, scanId);
    }
  }

  /**
   * Scan IP assignment pool
   */
  async scanIPPool(pool, scanId, networkInfo) {
    const startIP = pool.ipRangeStart;
    const endIP = pool.ipRangeEnd;
    
    const startParts = startIP.split('.').map(Number);
    const endParts = endIP.split('.').map(Number);
    
    // Simple sequential scan (could be optimized)
    const startNum = (startParts[0] << 24) + (startParts[1] << 16) + (startParts[2] << 8) + startParts[3];
    const endNum = (endParts[0] << 24) + (endParts[1] << 16) + (endParts[2] << 8) + endParts[3];
    
    for (let ipNum = startNum; ipNum <= endNum; ipNum++) {
      const ip = [
        (ipNum >>> 24) & 0xFF,
        (ipNum >>> 16) & 0xFF,
        (ipNum >>> 8) & 0xFF,
        ipNum & 0xFF
      ].join('.');
      
      this.scanSingleIP(ip, scanId, networkInfo);
    }
  }

  /**
   * Scan a single IP for V380 camera
   */
  async scanSingleIP(ip, scanId, networkInfo = {}) {
    // Test RTSP port (554) first
    const isRTSPOpen = await this.testPort(ip, 554, 2000);
    if (!isRTSPOpen) return;
    
    // Test V380 specific ports
    const v380Ports = [8080, 80, 8000];
    let v380Port = null;
    
    for (const port of v380Ports) {
      const isOpen = await this.testPort(ip, port, 1000);
      if (isOpen) {
        v380Port = port;
        break;
      }
    }
    
    if (v380Port) {
      // Try to get camera info
      const cameraInfo = await this.getCameraInfo(ip, v380Port);
      if (cameraInfo && this.isV380Camera(cameraInfo)) {
        const camera = {
          id: `v380_${ip.replace(/\./g, '_')}`,
          name: cameraInfo.name || `V380 Camera ${ip}`,
          ip: ip,
          rtspPort: 554,
          httpPort: v380Port,
          model: cameraInfo.model || 'V380 Pro',
          firmware: cameraInfo.firmware || 'Unknown',
          discoveryTime: new Date(),
          networkInfo: networkInfo,
          connectionMethods: this.determineConnectionMethods(ip, networkInfo)
        };
        
        this.addDiscoveredCamera(camera, scanId);
      }
    }
  }

  /**
   * Test if a port is open on an IP
   */
  testPort(ip, port, timeout = 3000) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, timeout);
      
      socket.connect(port, ip, () => {
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
   * Get camera information via HTTP
   */
  async getCameraInfo(ip, port) {
    try {
      const response = await axios.get(`http://${ip}:${port}/device_info`, {
        timeout: 3000,
        headers: {
          'User-Agent': 'SiteGuard-V380Discovery/1.0'
        }
      });
      
      return response.data;
    } catch (error) {
      // Try alternative endpoints
      const endpoints = ['/info', '/status', '/api/device'];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`http://${ip}:${port}${endpoint}`, {
            timeout: 2000
          });
          return response.data;
        } catch (e) {
          // Continue to next endpoint
        }
      }
      
      return null;
    }
  }

  /**
   * Check if device is a V380 camera
   */
  isV380Camera(deviceInfo) {
    if (!deviceInfo) return false;
    
    const indicators = [
      'v380', 'V380', 'YK-23', 'yk-23',
      'ipcam', 'IPCam', 'IPCAM'
    ];
    
    const infoString = JSON.stringify(deviceInfo).toLowerCase();
    return indicators.some(indicator => infoString.includes(indicator.toLowerCase()));
  }

  /**
   * Determine available connection methods for a camera
   */
  determineConnectionMethods(ip, networkInfo) {
    const methods = [];
    
    // Check if it's a local IP
    if (this.isLocalIP(ip)) {
      methods.push({
        type: 'direct',
        ip: ip,
        priority: 1
      });
    }
    
    // Check if it's on ZeroTier network
    if (networkInfo.networkId) {
      methods.push({
        type: 'zerotier',
        ip: ip,
        networkId: networkInfo.networkId,
        networkName: networkInfo.networkName,
        priority: 2
      });
    }
    
    return methods;
  }

  /**
   * Check if IP is in local network range
   */
  isLocalIP(ip) {
    const parts = ip.split('.').map(Number);
    
    // Private IP ranges
    return (
      (parts[0] === 10) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168)
    );
  }

  /**
   * Add discovered camera to results
   */
  addDiscoveredCamera(camera, scanId) {
    const scan = this.activeScans.get(scanId);
    if (scan) {
      scan.cameras.push(camera);
    }
    
    this.discoveredCameras.set(camera.id, camera);
    this.emit('cameraDiscovered', camera);
    
    console.log(`📹 Discovered V380 camera: ${camera.name} (${camera.ip})`);
  }

  /**
   * Handle discovery response from cameras
   */
  handleDiscoveryResponse(msg, rinfo) {
    try {
      // Parse V380 discovery response
      if (msg.length >= 11 && msg.readUInt32BE(0) === 0x56333830) {
        const type = msg.readUInt8(4);
        if (type === 0x02) { // Discovery response
          console.log(`V380 discovery response from ${rinfo.address}:${rinfo.port}`);
          
          // Extract camera information from response
          const cameraInfo = this.parseDiscoveryResponse(msg);
          if (cameraInfo) {
            const camera = {
              id: `v380_${rinfo.address.replace(/\./g, '_')}`,
              name: cameraInfo.name || `V380 Camera ${rinfo.address}`,
              ip: rinfo.address,
              rtspPort: 554,
              httpPort: cameraInfo.httpPort || 8080,
              model: cameraInfo.model || 'V380 Pro',
              firmware: cameraInfo.firmware || 'Unknown',
              discoveryTime: new Date(),
              networkInfo: {},
              connectionMethods: this.determineConnectionMethods(rinfo.address, {})
            };
            
            this.discoveredCameras.set(camera.id, camera);
            this.emit('cameraDiscovered', camera);
          }
        }
      }
    } catch (error) {
      console.error('Error handling discovery response:', error);
    }
  }

  /**
   * Parse V380 discovery response packet
   */
  parseDiscoveryResponse(msg) {
    try {
      // Basic parsing - would need actual V380 protocol specification
      const length = msg.readUInt32BE(5);
      if (length > 0 && msg.length >= 11 + length) {
        const data = msg.slice(9, 9 + length);
        // Parse camera information from data
        return {
          name: 'V380 Camera',
          model: 'V380 Pro',
          httpPort: 8080
        };
      }
    } catch (error) {
      console.error('Error parsing discovery response:', error);
    }
    return null;
  }

  /**
   * Calculate IP from network and offset
   */
  calculateIPFromOffset(networkParts, offset, hostBits) {
    const [a, b, c, d] = networkParts;
    
    if (hostBits <= 8) {
      return `${a}.${b}.${c}.${d + offset}`;
    } else if (hostBits <= 16) {
      const newC = c + Math.floor(offset / 256);
      const newD = d + (offset % 256);
      return `${a}.${b}.${newC}.${newD}`;
    } else {
      // Handle larger subnets if needed
      return `${a}.${b}.${c}.${d + offset}`;
    }
  }

  /**
   * Get all discovered cameras
   */
  getDiscoveredCameras() {
    return Array.from(this.discoveredCameras.values());
  }

  /**
   * Clear discovered cameras
   */
  clearDiscoveredCameras() {
    this.discoveredCameras.clear();
    this.emit('camerasCleared');
  }
}

module.exports = V380NetworkDiscovery;
