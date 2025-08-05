const EventEmitter = require('events');
const V380VPNRouter = require('./v380-vpn-router');

/**
 * V380 Connection Fallback Manager
 * Handles connection fallbacks when primary routes fail
 */
class V380ConnectionFallback extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 5000,
      fallbackTimeout: options.fallbackTimeout || 30000,
      healthCheckInterval: options.healthCheckInterval || 60000,
      ...options
    };
    
    this.vpnRouter = new V380VPNRouter(options);
    
    // Fallback state tracking
    this.cameraStates = new Map(); // Camera ID -> state info
    this.fallbackRoutes = new Map(); // Camera ID -> fallback routes
    this.retryTimers = new Map();   // Camera ID -> retry timer
    this.healthTimers = new Map();  // Camera ID -> health timer
    
    this.isRunning = false;
  }

  /**
   * Start the fallback manager
   */
  async start() {
    if (this.isRunning) {
      console.log('V380 Connection Fallback already running');
      return;
    }

    try {
      console.log('Starting V380 Connection Fallback...');
      
      // Start VPN router
      await this.vpnRouter.start();
      
      // Set up VPN router event handlers
      this.setupVPNRouterHandlers();
      
      this.isRunning = true;
      this.emit('started');
      
      console.log('✅ V380 Connection Fallback started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start V380 Connection Fallback:', error);
      throw error;
    }
  }

  /**
   * Stop the fallback manager
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping V380 Connection Fallback...');
    
    // Clear all timers
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.healthTimers.values()) {
      clearInterval(timer);
    }
    
    this.retryTimers.clear();
    this.healthTimers.clear();
    
    // Stop VPN router
    await this.vpnRouter.stop();
    
    // Clear state
    this.cameraStates.clear();
    this.fallbackRoutes.clear();
    
    this.isRunning = false;
    this.emit('stopped');
    
    console.log('✅ V380 Connection Fallback stopped');
  }

  /**
   * Set up VPN router event handlers
   */
  setupVPNRouterHandlers() {
    this.vpnRouter.on('routeHealthFailed', (cameraId, routeInfo) => {
      this.handleRouteFailure(cameraId, routeInfo);
    });
    
    this.vpnRouter.on('routeStatusChanged', (cameraId, status, routeInfo) => {
      this.updateCameraState(cameraId, { routeStatus: status });
    });
  }

  /**
   * Register camera for fallback management
   */
  async registerCamera(cameraId, cameraConfig) {
    console.log(`📝 Registering camera for fallback: ${cameraId}`);
    
    try {
      // Generate all possible routes
      const allRoutes = await this.generateAllRoutes(cameraConfig);
      
      // Find optimal primary route
      const primaryRoute = await this.vpnRouter.findOptimalRoute(cameraConfig);
      
      // Set up fallback routes (excluding primary)
      const fallbackRoutes = allRoutes.filter(route => 
        route.type !== primaryRoute.type || route.ip !== primaryRoute.ip
      );
      
      const cameraState = {
        id: cameraId,
        config: cameraConfig,
        primaryRoute: primaryRoute,
        currentRoute: primaryRoute,
        status: 'registered',
        retryCount: 0,
        lastFailure: null,
        connectionAttempts: 0,
        lastSuccessfulConnection: null
      };
      
      this.cameraStates.set(cameraId, cameraState);
      this.fallbackRoutes.set(cameraId, fallbackRoutes);
      
      // Add primary route to VPN router
      this.vpnRouter.addCameraRoute(cameraId, primaryRoute);
      
      // Start health monitoring for this camera
      this.startCameraHealthMonitoring(cameraId);
      
      console.log(`✅ Camera ${cameraId} registered with ${fallbackRoutes.length} fallback routes`);
      
      return {
        primaryRoute,
        fallbackRoutes: fallbackRoutes.length,
        connectionUrl: this.vpnRouter.generateConnectionUrl(cameraId, cameraConfig)
      };
      
    } catch (error) {
      console.error(`Failed to register camera ${cameraId}:`, error);
      throw error;
    }
  }

  /**
   * Unregister camera from fallback management
   */
  unregisterCamera(cameraId) {
    console.log(`🗑️ Unregistering camera: ${cameraId}`);
    
    // Clear timers
    const retryTimer = this.retryTimers.get(cameraId);
    if (retryTimer) {
      clearTimeout(retryTimer);
      this.retryTimers.delete(cameraId);
    }
    
    const healthTimer = this.healthTimers.get(cameraId);
    if (healthTimer) {
      clearInterval(healthTimer);
      this.healthTimers.delete(cameraId);
    }
    
    // Remove from VPN router
    this.vpnRouter.removeCameraRoute(cameraId);
    
    // Clear state
    this.cameraStates.delete(cameraId);
    this.fallbackRoutes.delete(cameraId);
    
    console.log(`✅ Camera ${cameraId} unregistered`);
  }

  /**
   * Handle route failure and initiate fallback
   */
  async handleRouteFailure(cameraId, routeInfo) {
    const cameraState = this.cameraStates.get(cameraId);
    if (!cameraState) {
      console.warn(`Route failure for unregistered camera: ${cameraId}`);
      return;
    }

    console.log(`🚨 Route failure detected for camera ${cameraId}`);
    
    cameraState.status = 'failed';
    cameraState.lastFailure = new Date();
    cameraState.retryCount++;
    
    this.emit('routeFailure', cameraId, routeInfo);
    
    // Attempt fallback
    await this.attemptFallback(cameraId);
  }

  /**
   * Attempt fallback to alternative route
   */
  async attemptFallback(cameraId) {
    const cameraState = this.cameraStates.get(cameraId);
    const fallbackRoutes = this.fallbackRoutes.get(cameraId);
    
    if (!cameraState || !fallbackRoutes || fallbackRoutes.length === 0) {
      console.error(`No fallback routes available for camera ${cameraId}`);
      this.emit('fallbackFailed', cameraId, 'No fallback routes available');
      return;
    }

    console.log(`🔄 Attempting fallback for camera ${cameraId}...`);
    
    // Try each fallback route
    for (const fallbackRoute of fallbackRoutes) {
      try {
        console.log(`Testing fallback route: ${fallbackRoute.type} (${fallbackRoute.ip || fallbackRoute.gateway})`);
        
        const isViable = await this.vpnRouter.testRoute(fallbackRoute);
        if (isViable) {
          // Switch to fallback route
          await this.switchToFallbackRoute(cameraId, fallbackRoute);
          return;
        }
        
      } catch (error) {
        console.error(`Fallback route test failed:`, error);
      }
    }
    
    // All fallback routes failed
    console.error(`All fallback routes failed for camera ${cameraId}`);
    cameraState.status = 'all_routes_failed';
    this.emit('allRoutesFailed', cameraId);
    
    // Schedule retry of primary route
    this.scheduleRetry(cameraId);
  }

  /**
   * Switch to fallback route
   */
  async switchToFallbackRoute(cameraId, fallbackRoute) {
    const cameraState = this.cameraStates.get(cameraId);
    if (!cameraState) return;

    console.log(`🔀 Switching camera ${cameraId} to fallback route: ${fallbackRoute.type}`);
    
    try {
      // Remove old route
      this.vpnRouter.removeCameraRoute(cameraId);
      
      // Add new route
      this.vpnRouter.addCameraRoute(cameraId, fallbackRoute);
      
      // Update camera state
      cameraState.currentRoute = fallbackRoute;
      cameraState.status = 'fallback_active';
      cameraState.retryCount = 0;
      cameraState.lastSuccessfulConnection = new Date();
      
      this.emit('fallbackSuccess', cameraId, fallbackRoute);
      
      console.log(`✅ Camera ${cameraId} switched to fallback route successfully`);
      
      // Schedule primary route recovery check
      this.schedulePrimaryRouteRecovery(cameraId);
      
    } catch (error) {
      console.error(`Failed to switch to fallback route:`, error);
      cameraState.status = 'fallback_failed';
      this.emit('fallbackFailed', cameraId, error.message);
    }
  }

  /**
   * Schedule retry of failed connection
   */
  scheduleRetry(cameraId) {
    const cameraState = this.cameraStates.get(cameraId);
    if (!cameraState || cameraState.retryCount >= this.config.maxRetries) {
      console.log(`Max retries reached for camera ${cameraId}`);
      return;
    }

    const delay = this.config.retryDelay * Math.pow(2, cameraState.retryCount - 1); // Exponential backoff
    
    console.log(`⏰ Scheduling retry for camera ${cameraId} in ${delay}ms`);
    
    const timer = setTimeout(async () => {
      this.retryTimers.delete(cameraId);
      await this.retryConnection(cameraId);
    }, delay);
    
    this.retryTimers.set(cameraId, timer);
  }

  /**
   * Retry connection for camera
   */
  async retryConnection(cameraId) {
    const cameraState = this.cameraStates.get(cameraId);
    if (!cameraState) return;

    console.log(`🔄 Retrying connection for camera ${cameraId}`);
    
    cameraState.connectionAttempts++;
    
    try {
      // Test primary route first
      const primaryRouteViable = await this.vpnRouter.testRoute(cameraState.primaryRoute);
      
      if (primaryRouteViable) {
        // Primary route recovered
        await this.restorePrimaryRoute(cameraId);
      } else {
        // Try fallback again
        await this.attemptFallback(cameraId);
      }
      
    } catch (error) {
      console.error(`Retry failed for camera ${cameraId}:`, error);
      this.scheduleRetry(cameraId);
    }
  }

  /**
   * Restore primary route
   */
  async restorePrimaryRoute(cameraId) {
    const cameraState = this.cameraStates.get(cameraId);
    if (!cameraState) return;

    console.log(`🔙 Restoring primary route for camera ${cameraId}`);
    
    try {
      // Remove current route
      this.vpnRouter.removeCameraRoute(cameraId);
      
      // Add primary route back
      this.vpnRouter.addCameraRoute(cameraId, cameraState.primaryRoute);
      
      // Update state
      cameraState.currentRoute = cameraState.primaryRoute;
      cameraState.status = 'primary_restored';
      cameraState.retryCount = 0;
      cameraState.lastSuccessfulConnection = new Date();
      
      this.emit('primaryRouteRestored', cameraId);
      
      console.log(`✅ Primary route restored for camera ${cameraId}`);
      
    } catch (error) {
      console.error(`Failed to restore primary route:`, error);
      this.emit('primaryRouteRestoreFailed', cameraId, error.message);
    }
  }

  /**
   * Schedule primary route recovery check
   */
  schedulePrimaryRouteRecovery(cameraId) {
    const timer = setTimeout(async () => {
      await this.checkPrimaryRouteRecovery(cameraId);
    }, 300000); // Check every 5 minutes
    
    // Store timer for cleanup
    const existingTimer = this.healthTimers.get(`${cameraId}_recovery`);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    this.healthTimers.set(`${cameraId}_recovery`, timer);
  }

  /**
   * Check if primary route has recovered
   */
  async checkPrimaryRouteRecovery(cameraId) {
    const cameraState = this.cameraStates.get(cameraId);
    if (!cameraState || cameraState.status !== 'fallback_active') {
      return;
    }

    console.log(`🔍 Checking primary route recovery for camera ${cameraId}`);
    
    const primaryRouteViable = await this.vpnRouter.testRoute(cameraState.primaryRoute);
    
    if (primaryRouteViable) {
      await this.restorePrimaryRoute(cameraId);
    } else {
      // Schedule next check
      this.schedulePrimaryRouteRecovery(cameraId);
    }
  }

  /**
   * Start health monitoring for camera
   */
  startCameraHealthMonitoring(cameraId) {
    const timer = setInterval(async () => {
      await this.performCameraHealthCheck(cameraId);
    }, this.config.healthCheckInterval);
    
    this.healthTimers.set(cameraId, timer);
  }

  /**
   * Perform health check for specific camera
   */
  async performCameraHealthCheck(cameraId) {
    const cameraState = this.cameraStates.get(cameraId);
    if (!cameraState || cameraState.status === 'failed') {
      return;
    }

    try {
      const routeInfo = this.vpnRouter.getCameraRoute(cameraId);
      if (routeInfo) {
        const isHealthy = await this.vpnRouter.testRoute(routeInfo.route);
        
        if (!isHealthy) {
          console.warn(`Health check failed for camera ${cameraId}`);
          await this.handleRouteFailure(cameraId, routeInfo);
        } else {
          // Update last successful connection
          cameraState.lastSuccessfulConnection = new Date();
        }
      }
      
    } catch (error) {
      console.error(`Health check error for camera ${cameraId}:`, error);
    }
  }

  /**
   * Generate all possible routes for a camera
   */
  async generateAllRoutes(cameraConfig) {
    // This would use the same logic as VPN router but return all routes
    const routes = [];
    
    // Direct connection
    if (cameraConfig.directIp) {
      routes.push({
        type: 'direct',
        ip: cameraConfig.directIp,
        port: cameraConfig.port || 554,
        priority: 1
      });
    }
    
    // ZeroTier connection
    if (cameraConfig.zerotierIp) {
      routes.push({
        type: 'zerotier',
        ip: cameraConfig.zerotierIp,
        port: cameraConfig.port || 554,
        priority: 2
      });
    }
    
    // Router forwarding
    if (cameraConfig.routerId && cameraConfig.localIp) {
      routes.push({
        type: 'router_forward',
        gateway: cameraConfig.routerIp,
        targetIp: cameraConfig.localIp,
        port: cameraConfig.port || 554,
        priority: 3
      });
    }
    
    return routes;
  }

  /**
   * Update camera state
   */
  updateCameraState(cameraId, updates) {
    const cameraState = this.cameraStates.get(cameraId);
    if (cameraState) {
      Object.assign(cameraState, updates);
      this.emit('cameraStateChanged', cameraId, cameraState);
    }
  }

  /**
   * Get camera connection status
   */
  getCameraStatus(cameraId) {
    const cameraState = this.cameraStates.get(cameraId);
    if (!cameraState) {
      return null;
    }
    
    return {
      id: cameraId,
      status: cameraState.status,
      currentRoute: cameraState.currentRoute,
      retryCount: cameraState.retryCount,
      connectionAttempts: cameraState.connectionAttempts,
      lastFailure: cameraState.lastFailure,
      lastSuccessfulConnection: cameraState.lastSuccessfulConnection,
      fallbackRoutesAvailable: this.fallbackRoutes.get(cameraId)?.length || 0
    };
  }

  /**
   * Get all camera statuses
   */
  getAllCameraStatuses() {
    const statuses = {};
    for (const cameraId of this.cameraStates.keys()) {
      statuses[cameraId] = this.getCameraStatus(cameraId);
    }
    return statuses;
  }

  /**
   * Force fallback for testing
   */
  async forceFallback(cameraId) {
    console.log(`🧪 Forcing fallback for camera ${cameraId}`);
    const routeInfo = this.vpnRouter.getCameraRoute(cameraId);
    if (routeInfo) {
      await this.handleRouteFailure(cameraId, routeInfo);
    }
  }
}

module.exports = V380ConnectionFallback;
