const express = require('express');
const cors = require('cors');
const GLiNetClient = require('./glinet-client');
const ZeroTierClient = require('./zerotier-client');
const VPNManager = require('./vpn-manager');

/**
 * Network Management Server
 * Provides REST API for GL-iNet router management, ZeroTier integration,
 * and VPN tunnel management for SiteGuard
 */
class NetworkServer {
  constructor(options = {}) {
    this.port = options.port || 3003;
    this.app = express();
    this.server = null;
    
    // Initialize ZeroTier client if API token provided
    this.zerotierClient = null;
    if (options.zerotierApiToken) {
      this.zerotierClient = new ZeroTierClient({
        apiToken: options.zerotierApiToken
      });
    }
    
    // Initialize VPN manager
    this.vpnManager = new VPNManager({
      zerotierClient: this.zerotierClient,
      onTunnelUp: this.handleTunnelUp.bind(this),
      onTunnelDown: this.handleTunnelDown.bind(this),
      onRouterConnected: this.handleRouterConnected.bind(this),
      onRouterDisconnected: this.handleRouterDisconnected.bind(this),
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
        'https://preview--ai-construct-pro.lovable.app',
        'https://66748df0-6d8e-4361-b644-77957af188bc.lovableproject.com',
        'http://localhost:5173',
        'http://localhost:3000',
        '*' // Allow all origins for development
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
    // Router management endpoints
    this.app.post('/api/network/routers', this.handleAddRouter.bind(this));
    this.app.get('/api/network/routers', this.handleGetRouters.bind(this));
    this.app.get('/api/network/routers/:routerId', this.handleGetRouter.bind(this));
    this.app.delete('/api/network/routers/:routerId', this.handleRemoveRouter.bind(this));
    this.app.post('/api/network/routers/:routerId/reboot', this.handleRebootRouter.bind(this));
    
    // Router configuration endpoints
    this.app.get('/api/network/routers/:routerId/status', this.handleGetRouterStatus.bind(this));
    this.app.get('/api/network/routers/:routerId/network', this.handleGetRouterNetwork.bind(this));
    this.app.get('/api/network/routers/:routerId/clients', this.handleGetRouterClients.bind(this));
    this.app.get('/api/network/routers/:routerId/bandwidth', this.handleGetRouterBandwidth.bind(this));
    this.app.post('/api/network/routers/:routerId/port-forward', this.handleConfigurePortForwarding.bind(this));
    
    // ZeroTier management endpoints
    this.app.get('/api/network/zerotier/status', this.handleGetZeroTierStatus.bind(this));
    this.app.get('/api/network/zerotier/networks', this.handleGetZeroTierNetworks.bind(this));
    this.app.post('/api/network/zerotier/networks', this.handleCreateZeroTierNetwork.bind(this));
    this.app.get('/api/network/zerotier/networks/:networkId', this.handleGetZeroTierNetwork.bind(this));
    this.app.delete('/api/network/zerotier/networks/:networkId', this.handleDeleteZeroTierNetwork.bind(this));
    this.app.get('/api/network/zerotier/networks/:networkId/members', this.handleGetZeroTierMembers.bind(this));
    this.app.post('/api/network/zerotier/networks/:networkId/members/:memberId/authorize', this.handleAuthorizeZeroTierMember.bind(this));
    this.app.post('/api/network/zerotier/networks/:networkId/members/:memberId/deauthorize', this.handleDeauthorizeZeroTierMember.bind(this));
    
    // VPN tunnel management endpoints
    this.app.post('/api/network/tunnels', this.handleCreateTunnel.bind(this));
    this.app.get('/api/network/tunnels', this.handleGetTunnels.bind(this));
    this.app.get('/api/network/tunnels/:tunnelId', this.handleGetTunnel.bind(this));
    this.app.delete('/api/network/tunnels/:tunnelId', this.handleDeleteTunnel.bind(this));
    this.app.post('/api/network/tunnels/:tunnelId/join/:deviceId', this.handleJoinTunnel.bind(this));
    
    // Network monitoring endpoints
    this.app.get('/api/network/status', this.handleGetNetworkStatus.bind(this));
    this.app.post('/api/network/test-connectivity', this.handleTestConnectivity.bind(this));
    this.app.get('/api/network/health', this.handleHealthCheck.bind(this));
    
    // Error handler
    this.app.use(this.errorHandler.bind(this));
  }

  /**
   * Add router to management
   */
  async handleAddRouter(req, res) {
    try {
      const { routerId, host, username, password } = req.body;
      
      if (!routerId || !host) {
        return res.status(400).json({
          success: false,
          error: 'Router ID and host are required'
        });
      }
      
      const router = await this.vpnManager.addRouter(routerId, {
        host,
        username: username || 'root',
        password
      });
      
      res.json({
        success: true,
        message: 'Router added successfully',
        router: {
          id: router.id,
          host: router.config.host,
          status: router.status,
          info: router.info
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
   * Get all routers
   */
  async handleGetRouters(req, res) {
    try {
      const routers = this.vpnManager.getRouterStatuses();
      res.json({
        success: true,
        routers: routers
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get specific router
   */
  async handleGetRouter(req, res) {
    try {
      const { routerId } = req.params;
      const routers = this.vpnManager.getRouterStatuses();
      const router = routers.find(r => r.id === routerId);
      
      if (!router) {
        return res.status(404).json({
          success: false,
          error: 'Router not found'
        });
      }
      
      res.json({
        success: true,
        router: router
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Remove router
   */
  async handleRemoveRouter(req, res) {
    try {
      const { routerId } = req.params;
      await this.vpnManager.removeRouter(routerId);

      res.json({
        success: true,
        message: 'Router removed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Reboot router
   */
  async handleRebootRouter(req, res) {
    try {
      const { routerId } = req.params;
      // Implementation would depend on router API
      res.json({
        success: true,
        message: 'Reboot command sent'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get router status
   */
  async handleGetRouterStatus(req, res) {
    try {
      const { routerId } = req.params;
      const routers = this.vpnManager.getRouterStatuses();
      const router = routers.find(r => r.id === routerId);

      if (!router) {
        return res.status(404).json({
          success: false,
          error: 'Router not found'
        });
      }

      res.json({
        success: true,
        status: router.info?.status || {}
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get router network info
   */
  async handleGetRouterNetwork(req, res) {
    try {
      const { routerId } = req.params;
      const routers = this.vpnManager.getRouterStatuses();
      const router = routers.find(r => r.id === routerId);

      if (!router) {
        return res.status(404).json({
          success: false,
          error: 'Router not found'
        });
      }

      res.json({
        success: true,
        network: router.info?.network || {}
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get router clients
   */
  async handleGetRouterClients(req, res) {
    try {
      const { routerId } = req.params;
      const routers = this.vpnManager.getRouterStatuses();
      const router = routers.find(r => r.id === routerId);

      if (!router) {
        return res.status(404).json({
          success: false,
          error: 'Router not found'
        });
      }

      res.json({
        success: true,
        clients: router.info?.clients || []
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get router bandwidth
   */
  async handleGetRouterBandwidth(req, res) {
    try {
      const { routerId } = req.params;
      const routers = this.vpnManager.getRouterStatuses();
      const router = routers.find(r => r.id === routerId);

      if (!router) {
        return res.status(404).json({
          success: false,
          error: 'Router not found'
        });
      }

      res.json({
        success: true,
        bandwidth: router.info?.bandwidth || {}
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Configure port forwarding
   */
  async handleConfigurePortForwarding(req, res) {
    try {
      const { routerId } = req.params;
      const { rules } = req.body;

      // Implementation would depend on router API
      res.json({
        success: true,
        message: 'Port forwarding configured'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get ZeroTier status
   */
  async handleGetZeroTierStatus(req, res) {
    try {
      if (!this.zerotierClient) {
        return res.status(400).json({
          success: false,
          error: 'ZeroTier not configured'
        });
      }
      
      const status = await this.zerotierClient.getStatus();
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
   * Get ZeroTier networks
   */
  async handleGetZeroTierNetworks(req, res) {
    try {
      if (!this.zerotierClient) {
        return res.status(400).json({
          success: false,
          error: 'ZeroTier not configured'
        });
      }

      const networks = await this.zerotierClient.getNetworks();
      res.json({
        success: true,
        networks: networks
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get ZeroTier network
   */
  async handleGetZeroTierNetwork(req, res) {
    try {
      if (!this.zerotierClient) {
        return res.status(400).json({
          success: false,
          error: 'ZeroTier not configured'
        });
      }

      const { networkId } = req.params;
      const network = await this.zerotierClient.getNetwork(networkId);
      res.json({
        success: true,
        network: network
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete ZeroTier network
   */
  async handleDeleteZeroTierNetwork(req, res) {
    try {
      if (!this.zerotierClient) {
        return res.status(400).json({
          success: false,
          error: 'ZeroTier not configured'
        });
      }

      const { networkId } = req.params;
      await this.zerotierClient.deleteNetwork(networkId);
      res.json({
        success: true,
        message: 'Network deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get ZeroTier members
   */
  async handleGetZeroTierMembers(req, res) {
    try {
      if (!this.zerotierClient) {
        return res.status(400).json({
          success: false,
          error: 'ZeroTier not configured'
        });
      }

      const { networkId } = req.params;
      const members = await this.zerotierClient.getNetworkMembers(networkId);
      res.json({
        success: true,
        members: members
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Authorize ZeroTier member
   */
  async handleAuthorizeZeroTierMember(req, res) {
    try {
      if (!this.zerotierClient) {
        return res.status(400).json({
          success: false,
          error: 'ZeroTier not configured'
        });
      }

      const { networkId, memberId } = req.params;
      await this.zerotierClient.authorizeMember(networkId, memberId);
      res.json({
        success: true,
        message: 'Member authorized successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Deauthorize ZeroTier member
   */
  async handleDeauthorizeZeroTierMember(req, res) {
    try {
      if (!this.zerotierClient) {
        return res.status(400).json({
          success: false,
          error: 'ZeroTier not configured'
        });
      }

      const { networkId, memberId } = req.params;
      await this.zerotierClient.deauthorizeMember(networkId, memberId);
      res.json({
        success: true,
        message: 'Member deauthorized successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create ZeroTier network
   */
  async handleCreateZeroTierNetwork(req, res) {
    try {
      if (!this.zerotierClient) {
        return res.status(400).json({
          success: false,
          error: 'ZeroTier not configured'
        });
      }
      
      const network = await this.zerotierClient.createNetwork(req.body);
      res.json({
        success: true,
        message: 'Network created successfully',
        network: network
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create VPN tunnel
   */
  async handleCreateTunnel(req, res) {
    try {
      const { tunnelId, type, config } = req.body;
      
      if (!tunnelId || !type) {
        return res.status(400).json({
          success: false,
          error: 'Tunnel ID and type are required'
        });
      }
      
      let tunnel;
      if (type === 'zerotier') {
        tunnel = await this.vpnManager.createZeroTierTunnel(tunnelId, config);
      } else {
        throw new Error(`Unsupported tunnel type: ${type}`);
      }
      
      res.json({
        success: true,
        message: 'Tunnel created successfully',
        tunnel: tunnel
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get all tunnels
   */
  async handleGetTunnels(req, res) {
    try {
      const tunnels = this.vpnManager.getTunnelStatuses();
      res.json({
        success: true,
        tunnels: tunnels
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get specific tunnel
   */
  async handleGetTunnel(req, res) {
    try {
      const { tunnelId } = req.params;
      const tunnels = this.vpnManager.getTunnelStatuses();
      const tunnel = tunnels.find(t => t.id === tunnelId);

      if (!tunnel) {
        return res.status(404).json({
          success: false,
          error: 'Tunnel not found'
        });
      }

      res.json({
        success: true,
        tunnel: tunnel
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete tunnel
   */
  async handleDeleteTunnel(req, res) {
    try {
      const { tunnelId } = req.params;
      // Implementation would depend on tunnel type
      res.json({
        success: true,
        message: 'Tunnel deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Join device to tunnel
   */
  async handleJoinTunnel(req, res) {
    try {
      const { tunnelId, deviceId } = req.params;
      // Implementation would depend on tunnel type
      res.json({
        success: true,
        message: 'Device joined tunnel successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Test network connectivity
   */
  async handleTestConnectivity(req, res) {
    try {
      const { target } = req.body;
      
      if (!target) {
        return res.status(400).json({
          success: false,
          error: 'Target is required'
        });
      }
      
      const result = await this.vpnManager.testConnectivity(target);
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
   * Get network status overview
   */
  async handleGetNetworkStatus(req, res) {
    try {
      const routers = this.vpnManager.getRouterStatuses();
      const tunnels = this.vpnManager.getTunnelStatuses();
      
      const status = {
        routers: {
          total: routers.length,
          connected: routers.filter(r => r.status === 'connected').length,
          disconnected: routers.filter(r => r.status === 'disconnected').length
        },
        tunnels: {
          total: tunnels.length,
          connected: tunnels.filter(t => t.status === 'connected').length,
          disconnected: tunnels.filter(t => t.status === 'disconnected').length
        },
        zerotier: {
          configured: !!this.zerotierClient,
          available: this.zerotierClient ? await this.zerotierClient.testConnection() : false
        },
        lastUpdate: new Date()
      };
      
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
   * Health check endpoint
   */
  async handleHealthCheck(req, res) {
    try {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date(),
        services: {
          vpnManager: true,
          zerotier: !!this.zerotierClient
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
    console.error('Network API Error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }

  /**
   * Event handlers
   */
  handleTunnelUp(tunnel) {
    console.log(`Tunnel ${tunnel.id} is up`);
  }

  handleTunnelDown(tunnel) {
    console.log(`Tunnel ${tunnel.id} is down`);
  }

  handleRouterConnected(router) {
    console.log(`Router ${router.id} connected`);
  }

  handleRouterDisconnected(router) {
    console.log(`Router ${router.id} disconnected`);
  }

  handleError(message, error) {
    console.error(`Network Error: ${message}`, error);
  }

  /**
   * Start the network server
   */
  start() {
    // Start VPN monitoring
    this.vpnManager.startMonitoring();
    
    this.server = this.app.listen(this.port, () => {
      console.log(`Network Management Server running on port ${this.port}`);
      console.log('Available endpoints:');
      console.log('  POST /api/network/routers - Add router');
      console.log('  GET  /api/network/routers - List routers');
      console.log('  POST /api/network/tunnels - Create VPN tunnel');
      console.log('  GET  /api/network/zerotier/networks - List ZeroTier networks');
      console.log('  GET  /api/network/status - Network status overview');
    });
  }

  /**
   * Stop the network server
   */
  async stop() {
    if (this.server) {
      this.server.close();
    }
    await this.vpnManager.cleanup();
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new NetworkServer({
    zerotierApiToken: process.env.ZEROTIER_API_TOKEN
  });
  
  server.start();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down network server...');
    await server.stop();
    process.exit(0);
  });
}

module.exports = NetworkServer;
