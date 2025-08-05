const EventEmitter = require('events');
const net = require('net');
const axios = require('axios');

/**
 * V380 VPN Router
 * Intelligent routing for V380 streams through VPN tunnels
 */
class V380VPNRouter extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      networkServerUrl: options.networkServerUrl || 'http://localhost:3003',
      routingTimeout: options.routingTimeout || 10000,
      healthCheckInterval: options.healthCheckInterval || 30000,
      maxRetries: options.maxRetries || 3,
      ...options
    };
    
    // Routing tables
    this.routingTable = new Map(); // Camera ID -> routing info
    this.tunnelStatus = new Map();  // Tunnel ID -> status
    this.routerStatus = new Map();  // Router ID -> status
    this.connectionCache = new Map(); // Cache successful connections
    
    this.isRunning = false;
    this.healthCheckTimer = null;
  }

  /**
   * Start the VPN router
   */
  async start() {
    if (this.isRunning) {
      console.log('V380 VPN Router already running');
      return;
    }

    try {
      console.log('Starting V380 VPN Router...');
      
      // Initialize routing tables
      await this.initializeRoutingTables();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.isRunning = true;
      this.emit('started');
      
      console.log('✅ V380 VPN Router started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start V380 VPN Router:', error);
      throw error;
    }
  }

  /**
   * Stop the VPN router
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping V380 VPN Router...');
    
    // Stop health monitoring
    this.stopHealthMonitoring();
    
    // Clear routing tables
    this.routingTable.clear();
    this.tunnelStatus.clear();
    this.routerStatus.clear();
    this.connectionCache.clear();
    
    this.isRunning = false;
    this.emit('stopped');
    
    console.log('✅ V380 VPN Router stopped');
  }

  /**
   * Initialize routing tables from network server
   */
  async initializeRoutingTables() {
    try {
      console.log('🔄 Initializing routing tables...');
      
      // Get ZeroTier networks
      const networksResponse = await axios.get(
        `${this.config.networkServerUrl}/api/network/zerotier/networks`
      );
      
      if (networksResponse.data.success) {
        for (const network of networksResponse.data.networks) {
          this.tunnelStatus.set(network.id, {
            id: network.id,
            name: network.name,
            status: 'active',
            members: network.members || [],
            lastCheck: new Date()
          });
        }
      }
      
      // Get GL.iNET routers
      const routersResponse = await axios.get(
        `${this.config.networkServerUrl}/api/network/routers`
      );
      
      if (routersResponse.data.success) {
        for (const router of routersResponse.data.routers) {
          this.routerStatus.set(router.id, {
            id: router.id,
            name: router.name,
            location: router.location,
            localIp: router.ip,
            zerotierIp: router.zerotier_ip_address,
            networkId: router.zerotier_network_id,
            status: router.status,
            lastCheck: new Date()
          });
        }
      }
      
      console.log(`Initialized routing for ${this.tunnelStatus.size} tunnels and ${this.routerStatus.size} routers`);
      
    } catch (error) {
      console.error('Failed to initialize routing tables:', error);
      throw error;
    }
  }

  /**
   * Find optimal route for a camera
   */
  async findOptimalRoute(cameraConfig) {
    console.log(`🔍 Finding optimal route for camera: ${cameraConfig.name}`);
    
    const routes = await this.generatePossibleRoutes(cameraConfig);
    
    // Test routes in order of priority
    for (const route of routes) {
      const isViable = await this.testRoute(route);
      if (isViable) {
        console.log(`✅ Selected route: ${route.type} via ${route.gateway || route.ip}`);
        return route;
      }
    }
    
    throw new Error('No viable route found for camera');
  }

  /**
   * Generate possible routes for a camera
   */
  async generatePossibleRoutes(cameraConfig) {
    const routes = [];
    
    // Direct connection (highest priority)
    if (cameraConfig.directIp) {
      routes.push({
        type: 'direct',
        ip: cameraConfig.directIp,
        port: cameraConfig.port || 554,
        priority: 1,
        latency: 0,
        reliability: 0.95
      });
    }
    
    // ZeroTier connection
    if (cameraConfig.zerotierIp || cameraConfig.routerId) {
      const zerotierRoute = await this.generateZeroTierRoute(cameraConfig);
      if (zerotierRoute) {
        routes.push(zerotierRoute);
      }
    }
    
    // Router forwarding
    if (cameraConfig.routerId) {
      const forwardingRoute = await this.generateForwardingRoute(cameraConfig);
      if (forwardingRoute) {
        routes.push(forwardingRoute);
      }
    }
    
    // Port forwarding through router
    if (cameraConfig.routerId && cameraConfig.localIp) {
      const portForwardRoute = await this.generatePortForwardRoute(cameraConfig);
      if (portForwardRoute) {
        routes.push(portForwardRoute);
      }
    }
    
    // Sort by priority and reliability
    routes.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.reliability - a.reliability;
    });
    
    return routes;
  }

  /**
   * Generate ZeroTier route
   */
  async generateZeroTierRoute(cameraConfig) {
    const router = cameraConfig.routerId ? this.routerStatus.get(cameraConfig.routerId) : null;
    const zerotierIp = cameraConfig.zerotierIp || (router ? router.zerotierIp : null);
    const networkId = cameraConfig.networkId || (router ? router.networkId : null);
    
    if (!zerotierIp || !networkId) {
      return null;
    }
    
    const tunnel = this.tunnelStatus.get(networkId);
    if (!tunnel || tunnel.status !== 'active') {
      return null;
    }
    
    return {
      type: 'zerotier',
      ip: zerotierIp,
      port: cameraConfig.port || 554,
      networkId: networkId,
      tunnelName: tunnel.name,
      priority: 2,
      latency: 50, // Estimated ZeroTier latency
      reliability: 0.90
    };
  }

  /**
   * Generate forwarding route through router
   */
  async generateForwardingRoute(cameraConfig) {
    const router = this.routerStatus.get(cameraConfig.routerId);
    if (!router || router.status !== 'connected') {
      return null;
    }
    
    return {
      type: 'router_forward',
      gateway: router.localIp,
      targetIp: cameraConfig.localIp,
      port: cameraConfig.port || 554,
      routerId: cameraConfig.routerId,
      routerName: router.name,
      priority: 3,
      latency: 100, // Estimated forwarding latency
      reliability: 0.85
    };
  }

  /**
   * Generate port forward route
   */
  async generatePortForwardRoute(cameraConfig) {
    const router = this.routerStatus.get(cameraConfig.routerId);
    if (!router || router.status !== 'connected') {
      return null;
    }
    
    // Check if port forwarding is configured
    const forwardedPort = await this.getForwardedPort(cameraConfig.routerId, cameraConfig.localIp, cameraConfig.port || 554);
    if (!forwardedPort) {
      return null;
    }
    
    return {
      type: 'port_forward',
      ip: router.localIp,
      port: forwardedPort,
      targetIp: cameraConfig.localIp,
      targetPort: cameraConfig.port || 554,
      routerId: cameraConfig.routerId,
      priority: 4,
      latency: 80,
      reliability: 0.80
    };
  }

  /**
   * Test if a route is viable
   */
  async testRoute(route) {
    const cacheKey = `${route.type}_${route.ip || route.gateway}_${route.port}`;
    
    // Check cache first
    const cached = this.connectionCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 60000) { // 1 minute cache
      return cached.viable;
    }
    
    let isViable = false;
    
    try {
      switch (route.type) {
        case 'direct':
        case 'zerotier':
          isViable = await this.testDirectConnection(route.ip, route.port);
          break;
        case 'router_forward':
          isViable = await this.testRouterForwarding(route);
          break;
        case 'port_forward':
          isViable = await this.testPortForwarding(route);
          break;
      }
      
      // Cache result
      this.connectionCache.set(cacheKey, {
        viable: isViable,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error(`Route test failed for ${route.type}:`, error);
      isViable = false;
    }
    
    return isViable;
  }

  /**
   * Test direct connection
   */
  testDirectConnection(ip, port, timeout = 5000) {
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
   * Test router forwarding
   */
  async testRouterForwarding(route) {
    try {
      // Test if we can reach the router
      const routerReachable = await this.testDirectConnection(route.gateway, 80, 3000);
      if (!routerReachable) {
        return false;
      }
      
      // Test if router can reach the target
      const response = await axios.post(
        `http://${route.gateway}/cgi-bin/api/router/test_connectivity`,
        {
          target_ip: route.targetIp,
          target_port: route.port
        },
        { timeout: 5000 }
      );
      
      return response.data && response.data.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test port forwarding
   */
  async testPortForwarding(route) {
    return await this.testDirectConnection(route.ip, route.port);
  }

  /**
   * Get forwarded port for a camera
   */
  async getForwardedPort(routerId, targetIp, targetPort) {
    try {
      const router = this.routerStatus.get(routerId);
      if (!router) return null;
      
      const response = await axios.get(
        `http://${router.localIp}/cgi-bin/api/router/port_forwards`,
        { timeout: 5000 }
      );
      
      if (response.data && response.data.forwards) {
        const forward = response.data.forwards.find(f => 
          f.internal_ip === targetIp && f.internal_port === targetPort
        );
        return forward ? forward.external_port : null;
      }
      
    } catch (error) {
      console.error('Failed to get forwarded port:', error);
    }
    
    return null;
  }

  /**
   * Add camera to routing table
   */
  addCameraRoute(cameraId, route) {
    this.routingTable.set(cameraId, {
      cameraId,
      route,
      status: 'active',
      createdAt: new Date(),
      lastUsed: new Date(),
      failureCount: 0
    });
    
    this.emit('routeAdded', cameraId, route);
    console.log(`📍 Added route for camera ${cameraId}: ${route.type}`);
  }

  /**
   * Remove camera from routing table
   */
  removeCameraRoute(cameraId) {
    const routeInfo = this.routingTable.get(cameraId);
    if (routeInfo) {
      this.routingTable.delete(cameraId);
      this.emit('routeRemoved', cameraId, routeInfo.route);
      console.log(`🗑️ Removed route for camera ${cameraId}`);
    }
  }

  /**
   * Get route for camera
   */
  getCameraRoute(cameraId) {
    return this.routingTable.get(cameraId);
  }

  /**
   * Update route status
   */
  updateRouteStatus(cameraId, status, error = null) {
    const routeInfo = this.routingTable.get(cameraId);
    if (routeInfo) {
      routeInfo.status = status;
      routeInfo.lastUsed = new Date();
      
      if (status === 'failed') {
        routeInfo.failureCount++;
        routeInfo.lastError = error;
      } else if (status === 'active') {
        routeInfo.failureCount = 0;
        routeInfo.lastError = null;
      }
      
      this.emit('routeStatusChanged', cameraId, status, routeInfo);
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Perform health check on all routes
   */
  async performHealthCheck() {
    console.log('🏥 Performing VPN router health check...');
    
    // Check tunnel status
    for (const [tunnelId, tunnel] of this.tunnelStatus) {
      try {
        const response = await axios.get(
          `${this.config.networkServerUrl}/api/network/zerotier/networks/${tunnelId}/status`
        );
        
        if (response.data.success) {
          tunnel.status = response.data.status;
          tunnel.lastCheck = new Date();
        }
      } catch (error) {
        tunnel.status = 'error';
        tunnel.lastError = error.message;
      }
    }
    
    // Check router status
    for (const [routerId, router] of this.routerStatus) {
      try {
        const response = await axios.get(
          `${this.config.networkServerUrl}/api/network/routers/${routerId}/status`
        );
        
        if (response.data.success) {
          router.status = response.data.status;
          router.lastCheck = new Date();
        }
      } catch (error) {
        router.status = 'error';
        router.lastError = error.message;
      }
    }
    
    // Check active camera routes
    for (const [cameraId, routeInfo] of this.routingTable) {
      if (routeInfo.status === 'active') {
        const isViable = await this.testRoute(routeInfo.route);
        if (!isViable) {
          this.updateRouteStatus(cameraId, 'failed', 'Health check failed');
          this.emit('routeHealthFailed', cameraId, routeInfo);
        }
      }
    }
  }

  /**
   * Get routing statistics
   */
  getRoutingStats() {
    const stats = {
      totalRoutes: this.routingTable.size,
      activeRoutes: 0,
      failedRoutes: 0,
      tunnels: this.tunnelStatus.size,
      routers: this.routerStatus.size,
      routeTypes: {},
      lastHealthCheck: new Date()
    };
    
    for (const [cameraId, routeInfo] of this.routingTable) {
      if (routeInfo.status === 'active') {
        stats.activeRoutes++;
      } else if (routeInfo.status === 'failed') {
        stats.failedRoutes++;
      }
      
      const routeType = routeInfo.route.type;
      stats.routeTypes[routeType] = (stats.routeTypes[routeType] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Generate connection URL for camera using optimal route
   */
  generateConnectionUrl(cameraId, cameraConfig) {
    const routeInfo = this.routingTable.get(cameraId);
    if (!routeInfo || routeInfo.status !== 'active') {
      throw new Error(`No active route for camera ${cameraId}`);
    }
    
    const route = routeInfo.route;
    const credentials = cameraConfig.credentials || {};
    const auth = credentials.username && credentials.password 
      ? `${credentials.username}:${credentials.password}@` 
      : '';
    
    let targetIp, targetPort;
    
    switch (route.type) {
      case 'direct':
      case 'zerotier':
        targetIp = route.ip;
        targetPort = route.port;
        break;
      case 'router_forward':
        targetIp = route.gateway;
        targetPort = route.port;
        break;
      case 'port_forward':
        targetIp = route.ip;
        targetPort = route.port;
        break;
      default:
        throw new Error(`Unsupported route type: ${route.type}`);
    }
    
    const rtspPath = cameraConfig.streamSettings?.rtspPath || '/stream1';
    return `rtsp://${auth}${targetIp}:${targetPort}${rtspPath}`;
  }
}

module.exports = V380VPNRouter;
