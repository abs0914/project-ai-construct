const axios = require('axios');
const crypto = require('crypto');

/**
 * GL-iNet Router API Client
 * Provides comprehensive management of GL-iNet routers including
 * status monitoring, configuration, and network management
 */
class GLiNetClient {
  constructor(options = {}) {
    this.host = options.host;
    this.username = options.username || 'root';
    this.password = options.password;
    this.timeout = options.timeout || 10000;
    this.sessionId = null;
    this.baseUrl = `http://${this.host}`;
    
    // API endpoints
    this.endpoints = {
      login: '/cgi-bin/api/router/login',
      logout: '/cgi-bin/api/router/logout',
      status: '/cgi-bin/api/router/status',
      network: '/cgi-bin/api/router/network',
      wireless: '/cgi-bin/api/router/wireless',
      firewall: '/cgi-bin/api/router/firewall',
      vpn: '/cgi-bin/api/router/vpn',
      system: '/cgi-bin/api/router/system',
      clients: '/cgi-bin/api/router/clients',
      bandwidth: '/cgi-bin/api/router/bandwidth'
    };

    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SiteGuard-NetworkManager/1.0'
      }
    });
  }

  /**
   * Authenticate with the router
   */
  async login() {
    try {
      console.log(`Authenticating with GL-iNet router at ${this.host}`);
      
      const response = await this.client.post(this.endpoints.login, {
        username: this.username,
        password: this.password
      });

      if (response.data && response.data.success) {
        this.sessionId = response.data.sid;
        console.log('GL-iNet authentication successful');
        return true;
      } else {
        throw new Error('Authentication failed: Invalid credentials');
      }
    } catch (error) {
      console.error('GL-iNet login failed:', error.message);
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Logout and cleanup session
   */
  async logout() {
    if (this.sessionId) {
      try {
        await this.client.post(this.endpoints.logout, {
          sid: this.sessionId
        });
        this.sessionId = null;
        console.log('GL-iNet logout successful');
      } catch (error) {
        console.warn('Logout warning:', error.message);
      }
    }
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(endpoint, data = {}) {
    if (!this.sessionId) {
      await this.login();
    }

    try {
      const response = await this.client.post(endpoint, {
        sid: this.sessionId,
        ...data
      });

      if (response.data && response.data.success === false) {
        if (response.data.error === 'invalid_session') {
          // Session expired, re-authenticate
          this.sessionId = null;
          await this.login();
          return this.makeRequest(endpoint, data);
        }
        throw new Error(response.data.message || 'API request failed');
      }

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Authentication required
        this.sessionId = null;
        await this.login();
        return this.makeRequest(endpoint, data);
      }
      throw error;
    }
  }

  /**
   * Get router status and system information
   */
  async getStatus() {
    try {
      const data = await this.makeRequest(this.endpoints.status);
      
      return {
        uptime: data.uptime,
        load: data.load,
        memory: data.memory,
        storage: data.storage,
        temperature: data.temperature,
        firmware: data.firmware,
        model: data.model,
        serialNumber: data.serial,
        macAddress: data.mac,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Failed to get router status:', error);
      throw error;
    }
  }

  /**
   * Get network interface information
   */
  async getNetworkInfo() {
    try {
      const data = await this.makeRequest(this.endpoints.network);
      
      return {
        wan: {
          interface: data.wan?.interface,
          ip: data.wan?.ip,
          gateway: data.wan?.gateway,
          dns: data.wan?.dns,
          status: data.wan?.status,
          uptime: data.wan?.uptime
        },
        lan: {
          interface: data.lan?.interface,
          ip: data.lan?.ip,
          netmask: data.lan?.netmask,
          dhcp: data.lan?.dhcp
        },
        interfaces: data.interfaces || []
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      throw error;
    }
  }

  /**
   * Get wireless information
   */
  async getWirelessInfo() {
    try {
      const data = await this.makeRequest(this.endpoints.wireless);
      
      return {
        enabled: data.enabled,
        ssid: data.ssid,
        channel: data.channel,
        mode: data.mode,
        security: data.security,
        clients: data.clients || [],
        signal: data.signal,
        bandwidth: data.bandwidth
      };
    } catch (error) {
      console.error('Failed to get wireless info:', error);
      throw error;
    }
  }

  /**
   * Get connected clients
   */
  async getClients() {
    try {
      const data = await this.makeRequest(this.endpoints.clients);
      
      return (data.clients || []).map(client => ({
        mac: client.mac,
        ip: client.ip,
        hostname: client.hostname,
        interface: client.interface,
        connected: client.connected,
        rxBytes: client.rx_bytes,
        txBytes: client.tx_bytes,
        signal: client.signal,
        lastSeen: client.last_seen
      }));
    } catch (error) {
      console.error('Failed to get clients:', error);
      throw error;
    }
  }

  /**
   * Get bandwidth usage statistics
   */
  async getBandwidthStats() {
    try {
      const data = await this.makeRequest(this.endpoints.bandwidth);
      
      return {
        wan: {
          rxBytes: data.wan?.rx_bytes || 0,
          txBytes: data.wan?.tx_bytes || 0,
          rxRate: data.wan?.rx_rate || 0,
          txRate: data.wan?.tx_rate || 0
        },
        lan: {
          rxBytes: data.lan?.rx_bytes || 0,
          txBytes: data.lan?.tx_bytes || 0,
          rxRate: data.lan?.rx_rate || 0,
          txRate: data.lan?.tx_rate || 0
        },
        wireless: {
          rxBytes: data.wireless?.rx_bytes || 0,
          txBytes: data.wireless?.tx_bytes || 0,
          rxRate: data.wireless?.rx_rate || 0,
          txRate: data.wireless?.tx_rate || 0
        }
      };
    } catch (error) {
      console.error('Failed to get bandwidth stats:', error);
      throw error;
    }
  }

  /**
   * Configure port forwarding
   */
  async configurePortForwarding(rules) {
    try {
      const data = await this.makeRequest(this.endpoints.firewall, {
        action: 'port_forward',
        rules: rules
      });
      
      return data.success;
    } catch (error) {
      console.error('Failed to configure port forwarding:', error);
      throw error;
    }
  }

  /**
   * Get VPN status
   */
  async getVPNStatus() {
    try {
      const data = await this.makeRequest(this.endpoints.vpn);
      
      return {
        enabled: data.enabled,
        connected: data.connected,
        type: data.type,
        server: data.server,
        localIP: data.local_ip,
        remoteIP: data.remote_ip,
        uptime: data.uptime,
        rxBytes: data.rx_bytes,
        txBytes: data.tx_bytes
      };
    } catch (error) {
      console.error('Failed to get VPN status:', error);
      throw error;
    }
  }

  /**
   * Configure VPN connection
   */
  async configureVPN(config) {
    try {
      const data = await this.makeRequest(this.endpoints.vpn, {
        action: 'configure',
        config: config
      });
      
      return data.success;
    } catch (error) {
      console.error('Failed to configure VPN:', error);
      throw error;
    }
  }

  /**
   * Reboot router
   */
  async reboot() {
    try {
      await this.makeRequest(this.endpoints.system, {
        action: 'reboot'
      });
      
      // Clear session as router will restart
      this.sessionId = null;
      return true;
    } catch (error) {
      console.error('Failed to reboot router:', error);
      throw error;
    }
  }

  /**
   * Update firmware
   */
  async updateFirmware(firmwareUrl) {
    try {
      const data = await this.makeRequest(this.endpoints.system, {
        action: 'firmware_update',
        url: firmwareUrl
      });
      
      return data.success;
    } catch (error) {
      console.error('Failed to update firmware:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive router information
   */
  async getRouterInfo() {
    try {
      const [status, network, wireless, clients, bandwidth, vpn] = await Promise.allSettled([
        this.getStatus(),
        this.getNetworkInfo(),
        this.getWirelessInfo(),
        this.getClients(),
        this.getBandwidthStats(),
        this.getVPNStatus()
      ]);

      return {
        status: status.status === 'fulfilled' ? status.value : null,
        network: network.status === 'fulfilled' ? network.value : null,
        wireless: wireless.status === 'fulfilled' ? wireless.value : null,
        clients: clients.status === 'fulfilled' ? clients.value : [],
        bandwidth: bandwidth.status === 'fulfilled' ? bandwidth.value : null,
        vpn: vpn.status === 'fulfilled' ? vpn.value : null,
        lastUpdate: new Date()
      };
    } catch (error) {
      console.error('Failed to get router info:', error);
      throw error;
    }
  }

  /**
   * Test connectivity to router
   */
  async testConnectivity() {
    try {
      const response = await this.client.get('/');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    await this.logout();
  }
}

module.exports = GLiNetClient;
