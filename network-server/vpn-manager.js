const { exec } = require('child_process');
const { promisify } = require('util');
const ping = require('ping');
const GLiNetClient = require('./glinet-client');
const ZeroTierClient = require('./zerotier-client');

const execAsync = promisify(exec);

/**
 * VPN Tunnel Manager
 * Manages VPN connections, monitoring, and failover for SiteGuard
 */
class VPNManager {
  constructor(options = {}) {
    this.zerotierClient = options.zerotierClient;
    this.routers = new Map(); // Router ID -> GLiNetClient
    this.tunnels = new Map(); // Tunnel ID -> Tunnel Info
    this.monitoringInterval = options.monitoringInterval || 30000; // 30 seconds
    this.pingTimeout = options.pingTimeout || 5000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 10000;
    
    // Monitoring state
    this.isMonitoring = false;
    this.monitoringTimer = null;
    
    // Event callbacks
    this.onTunnelUp = options.onTunnelUp || (() => {});
    this.onTunnelDown = options.onTunnelDown || (() => {});
    this.onRouterConnected = options.onRouterConnected || (() => {});
    this.onRouterDisconnected = options.onRouterDisconnected || (() => {});
    this.onError = options.onError || console.error;
  }

  /**
   * Add router to management
   */
  async addRouter(routerId, config) {
    try {
      const router = new GLiNetClient({
        host: config.host,
        username: config.username || 'root',
        password: config.password,
        timeout: config.timeout || 10000
      });

      // Test connectivity
      const isConnected = await router.testConnectivity();
      if (!isConnected) {
        throw new Error(`Cannot connect to router at ${config.host}`);
      }

      // Authenticate
      await router.login();

      // Get router information
      const routerInfo = await router.getRouterInfo();

      const routerData = {
        id: routerId,
        client: router,
        config: config,
        info: routerInfo,
        status: 'connected',
        lastSeen: new Date(),
        retryCount: 0,
        vpnStatus: null
      };

      this.routers.set(routerId, routerData);
      this.onRouterConnected(routerData);
      
      console.log(`Router ${routerId} added successfully`);
      return routerData;
      
    } catch (error) {
      this.onError(`Failed to add router ${routerId}:`, error);
      throw error;
    }
  }

  /**
   * Remove router from management
   */
  async removeRouter(routerId) {
    const router = this.routers.get(routerId);
    if (router) {
      try {
        await router.client.disconnect();
      } catch (error) {
        console.warn(`Error disconnecting router ${routerId}:`, error);
      }
      
      this.routers.delete(routerId);
      this.onRouterDisconnected(router);
      console.log(`Router ${routerId} removed`);
    }
  }

  /**
   * Create ZeroTier tunnel
   */
  async createZeroTierTunnel(tunnelId, config) {
    try {
      if (!this.zerotierClient) {
        throw new Error('ZeroTier client not configured');
      }

      console.log(`Creating ZeroTier tunnel: ${tunnelId}`);

      // Create or get network
      let network;
      if (config.networkId) {
        network = await this.zerotierClient.getNetwork(config.networkId);
      } else {
        network = await this.zerotierClient.createNetwork({
          name: config.networkName || `SiteGuard-${tunnelId}`,
          description: config.description || 'SiteGuard VPN Network',
          private: config.private !== false,
          ipAssignmentPools: config.ipAssignmentPools || [
            {
              ipRangeStart: '10.147.17.1',
              ipRangeEnd: '10.147.17.254'
            }
          ]
        });
      }

      // Configure routers to join network
      const routerConfigs = [];
      for (const routerId of config.routerIds || []) {
        const router = this.routers.get(routerId);
        if (router) {
          try {
            const vpnConfig = {
              type: 'zerotier',
              networkId: network.id,
              enabled: true
            };
            
            await router.client.configureVPN(vpnConfig);
            routerConfigs.push({
              routerId: routerId,
              status: 'configured'
            });
          } catch (error) {
            console.warn(`Failed to configure VPN on router ${routerId}:`, error);
            routerConfigs.push({
              routerId: routerId,
              status: 'error',
              error: error.message
            });
          }
        }
      }

      const tunnel = {
        id: tunnelId,
        type: 'zerotier',
        networkId: network.id,
        networkName: network.name,
        status: 'connecting',
        routers: routerConfigs,
        config: config,
        createdAt: new Date(),
        lastUpdate: new Date()
      };

      this.tunnels.set(tunnelId, tunnel);
      console.log(`ZeroTier tunnel ${tunnelId} created with network ${network.id}`);
      
      return tunnel;
      
    } catch (error) {
      this.onError(`Failed to create ZeroTier tunnel ${tunnelId}:`, error);
      throw error;
    }
  }

  /**
   * Join device to ZeroTier network
   */
  async joinZeroTierNetwork(networkId, deviceId) {
    try {
      if (!this.zerotierClient) {
        throw new Error('ZeroTier client not configured');
      }

      // Authorize the device
      await this.zerotierClient.authorizeMember(networkId, deviceId, {
        name: `SiteGuard-Device-${deviceId.slice(0, 8)}`,
        description: 'SiteGuard managed device'
      });

      console.log(`Device ${deviceId} authorized on network ${networkId}`);
      return true;
      
    } catch (error) {
      this.onError(`Failed to join device ${deviceId} to network ${networkId}:`, error);
      throw error;
    }
  }

  /**
   * Monitor tunnel status
   */
  async monitorTunnel(tunnelId) {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel) {
      return null;
    }

    try {
      if (tunnel.type === 'zerotier') {
        // Check ZeroTier network status
        const networkStats = await this.zerotierClient.getNetworkStats(tunnel.networkId);
        
        // Check router VPN status
        const routerStatuses = [];
        for (const routerConfig of tunnel.routers) {
          const router = this.routers.get(routerConfig.routerId);
          if (router) {
            try {
              const vpnStatus = await router.client.getVPNStatus();
              routerStatuses.push({
                routerId: routerConfig.routerId,
                connected: vpnStatus.connected,
                localIP: vpnStatus.localIP,
                uptime: vpnStatus.uptime
              });
            } catch (error) {
              routerStatuses.push({
                routerId: routerConfig.routerId,
                connected: false,
                error: error.message
              });
            }
          }
        }

        // Update tunnel status
        const connectedRouters = routerStatuses.filter(r => r.connected).length;
        const newStatus = connectedRouters > 0 ? 'connected' : 'disconnected';
        
        if (tunnel.status !== newStatus) {
          tunnel.status = newStatus;
          if (newStatus === 'connected') {
            this.onTunnelUp(tunnel);
          } else {
            this.onTunnelDown(tunnel);
          }
        }

        tunnel.networkStats = networkStats;
        tunnel.routerStatuses = routerStatuses;
        tunnel.lastUpdate = new Date();
        
        return tunnel;
      }
    } catch (error) {
      console.error(`Error monitoring tunnel ${tunnelId}:`, error);
      tunnel.status = 'error';
      tunnel.lastError = error.message;
      tunnel.lastUpdate = new Date();
    }

    return tunnel;
  }

  /**
   * Test network connectivity
   */
  async testConnectivity(target, timeout = 5000) {
    try {
      const result = await ping.promise.probe(target, {
        timeout: timeout / 1000,
        min_reply: 1
      });
      
      return {
        host: target,
        alive: result.alive,
        time: result.time,
        packetLoss: result.packetLoss
      };
    } catch (error) {
      return {
        host: target,
        alive: false,
        error: error.message
      };
    }
  }

  /**
   * Start monitoring all tunnels and routers
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    console.log('Starting VPN monitoring...');

    this.monitoringTimer = setInterval(async () => {
      try {
        // Monitor all routers
        for (const [routerId, router] of this.routers.entries()) {
          await this.monitorRouter(routerId);
        }

        // Monitor all tunnels
        for (const [tunnelId] of this.tunnels.entries()) {
          await this.monitorTunnel(tunnelId);
        }
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, this.monitoringInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    this.isMonitoring = false;
    console.log('VPN monitoring stopped');
  }

  /**
   * Monitor router status
   */
  async monitorRouter(routerId) {
    const router = this.routers.get(routerId);
    if (!router) {
      return;
    }

    try {
      // Test basic connectivity
      const isConnected = await router.client.testConnectivity();
      
      if (isConnected) {
        // Get updated router information
        const routerInfo = await router.client.getRouterInfo();
        router.info = routerInfo;
        router.status = 'connected';
        router.lastSeen = new Date();
        router.retryCount = 0;
      } else {
        throw new Error('Router not reachable');
      }
    } catch (error) {
      router.status = 'disconnected';
      router.lastError = error.message;
      router.retryCount++;

      if (router.retryCount <= this.maxRetries) {
        console.log(`Router ${routerId} disconnected, retry ${router.retryCount}/${this.maxRetries}`);
        
        // Attempt to reconnect
        setTimeout(async () => {
          try {
            await router.client.login();
            console.log(`Router ${routerId} reconnected`);
          } catch (reconnectError) {
            console.error(`Failed to reconnect router ${routerId}:`, reconnectError);
          }
        }, this.retryDelay);
      } else {
        console.error(`Router ${routerId} failed after ${this.maxRetries} retries`);
        this.onRouterDisconnected(router);
      }
    }
  }

  /**
   * Get all router statuses
   */
  getRouterStatuses() {
    const statuses = [];
    for (const [routerId, router] of this.routers.entries()) {
      statuses.push({
        id: routerId,
        host: router.config.host,
        status: router.status,
        lastSeen: router.lastSeen,
        retryCount: router.retryCount,
        info: router.info,
        vpnStatus: router.vpnStatus
      });
    }
    return statuses;
  }

  /**
   * Get all tunnel statuses
   */
  getTunnelStatuses() {
    const statuses = [];
    for (const [tunnelId, tunnel] of this.tunnels.entries()) {
      statuses.push({
        id: tunnelId,
        type: tunnel.type,
        networkId: tunnel.networkId,
        networkName: tunnel.networkName,
        status: tunnel.status,
        routers: tunnel.routerStatuses || [],
        networkStats: tunnel.networkStats,
        createdAt: tunnel.createdAt,
        lastUpdate: tunnel.lastUpdate
      });
    }
    return statuses;
  }

  /**
   * Cleanup and disconnect all connections
   */
  async cleanup() {
    this.stopMonitoring();
    
    // Disconnect all routers
    for (const [routerId] of this.routers.entries()) {
      await this.removeRouter(routerId);
    }
    
    this.routers.clear();
    this.tunnels.clear();
    
    console.log('VPN Manager cleanup completed');
  }
}

module.exports = VPNManager;
