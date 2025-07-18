const axios = require('axios');

/**
 * ZeroTier Central API Client
 * Provides comprehensive management of ZeroTier networks and members
 */
class ZeroTierClient {
  constructor(options = {}) {
    this.apiToken = options.apiToken;
    this.baseUrl = 'https://api.zerotier.com/api/v1';
    this.timeout = options.timeout || 15000;

    if (!this.apiToken) {
      throw new Error('ZeroTier API token is required');
    }

    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'SiteGuard-NetworkManager/1.0'
      }
    });
  }

  /**
   * Get user status and account information
   */
  async getStatus() {
    try {
      const response = await this.client.get('/status');
      return {
        user: response.data.user,
        loginMethods: response.data.loginMethods,
        subscriptions: response.data.subscriptions,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Failed to get ZeroTier status:', error);
      throw new Error(`ZeroTier API error: ${error.message}`);
    }
  }

  /**
   * List all networks
   */
  async getNetworks() {
    try {
      const response = await this.client.get('/network');
      return response.data.map(network => ({
        id: network.id,
        name: network.config?.name || 'Unnamed Network',
        description: network.description,
        private: network.config?.private || false,
        enableBroadcast: network.config?.enableBroadcast || false,
        allowPassiveBridging: network.config?.allowPassiveBridging || false,
        allowManaged: network.config?.allowManaged || true,
        allowGlobal: network.config?.allowGlobal || false,
        allowDefault: network.config?.allowDefault || false,
        allowDNS: network.config?.allowDNS || false,
        ipAssignmentPools: network.config?.ipAssignmentPools || [],
        routes: network.config?.routes || [],
        dns: network.config?.dns || {},
        memberCount: network.totalMemberCount || 0,
        authorizedMemberCount: network.authorizedMemberCount || 0,
        activeMemberCount: network.activeMemberCount || 0,
        creationTime: network.creationTime,
        lastModified: network.lastModified
      }));
    } catch (error) {
      console.error('Failed to get networks:', error);
      throw new Error(`Failed to get networks: ${error.message}`);
    }
  }

  /**
   * Get specific network details
   */
  async getNetwork(networkId) {
    try {
      const response = await this.client.get(`/network/${networkId}`);
      const network = response.data;
      
      return {
        id: network.id,
        name: network.config?.name || 'Unnamed Network',
        description: network.description,
        config: network.config,
        memberCount: network.totalMemberCount || 0,
        authorizedMemberCount: network.authorizedMemberCount || 0,
        activeMemberCount: network.activeMemberCount || 0,
        creationTime: network.creationTime,
        lastModified: network.lastModified,
        capabilities: network.capabilitiesByName || {},
        tags: network.tagsByName || {},
        rules: network.rulesSource || ''
      };
    } catch (error) {
      console.error(`Failed to get network ${networkId}:`, error);
      throw new Error(`Failed to get network: ${error.message}`);
    }
  }

  /**
   * Create a new network
   */
  async createNetwork(config) {
    try {
      const networkConfig = {
        name: config.name || 'SiteGuard Network',
        description: config.description || 'Created by SiteGuard',
        config: {
          private: config.private !== false,
          enableBroadcast: config.enableBroadcast || true,
          allowPassiveBridging: config.allowPassiveBridging || false,
          allowManaged: config.allowManaged !== false,
          allowGlobal: config.allowGlobal || false,
          allowDefault: config.allowDefault || false,
          allowDNS: config.allowDNS || false,
          ipAssignmentPools: config.ipAssignmentPools || [
            {
              ipRangeStart: '10.147.17.1',
              ipRangeEnd: '10.147.17.254'
            }
          ],
          routes: config.routes || [
            {
              target: '10.147.17.0/24',
              via: null
            }
          ],
          dns: config.dns || {
            domain: '',
            servers: []
          }
        }
      };

      const response = await this.client.post('/network', networkConfig);
      return response.data;
    } catch (error) {
      console.error('Failed to create network:', error);
      throw new Error(`Failed to create network: ${error.message}`);
    }
  }

  /**
   * Update network configuration
   */
  async updateNetwork(networkId, config) {
    try {
      const response = await this.client.post(`/network/${networkId}`, config);
      return response.data;
    } catch (error) {
      console.error(`Failed to update network ${networkId}:`, error);
      throw new Error(`Failed to update network: ${error.message}`);
    }
  }

  /**
   * Delete a network
   */
  async deleteNetwork(networkId) {
    try {
      await this.client.delete(`/network/${networkId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete network ${networkId}:`, error);
      throw new Error(`Failed to delete network: ${error.message}`);
    }
  }

  /**
   * Get network members
   */
  async getNetworkMembers(networkId) {
    try {
      const response = await this.client.get(`/network/${networkId}/member`);
      return response.data.map(member => ({
        id: member.nodeId,
        networkId: member.networkId,
        name: member.name || 'Unnamed Member',
        description: member.description || '',
        authorized: member.config?.authorized || false,
        activeBridge: member.config?.activeBridge || false,
        noAutoAssignIps: member.config?.noAutoAssignIps || false,
        ipAssignments: member.config?.ipAssignments || [],
        capabilities: member.config?.capabilities || [],
        tags: member.config?.tags || [],
        creationTime: member.creationTime,
        lastAuthorizedTime: member.lastAuthorizedTime,
        lastDeauthorizedTime: member.lastDeauthorizedTime,
        vMajor: member.vMajor,
        vMinor: member.vMinor,
        vRev: member.vRev,
        version: member.version,
        offlineNotifyDelay: member.offlineNotifyDelay,
        physicalAddress: member.physicalAddress,
        physicalLocation: member.physicalLocation,
        clientVersion: member.clientVersion,
        protocolVersion: member.protocolVersion,
        supportsRulesEngine: member.supportsRulesEngine
      }));
    } catch (error) {
      console.error(`Failed to get network members for ${networkId}:`, error);
      throw new Error(`Failed to get network members: ${error.message}`);
    }
  }

  /**
   * Get specific network member
   */
  async getNetworkMember(networkId, memberId) {
    try {
      const response = await this.client.get(`/network/${networkId}/member/${memberId}`);
      const member = response.data;
      
      return {
        id: member.nodeId,
        networkId: member.networkId,
        name: member.name || 'Unnamed Member',
        description: member.description || '',
        config: member.config,
        creationTime: member.creationTime,
        lastAuthorizedTime: member.lastAuthorizedTime,
        lastDeauthorizedTime: member.lastDeauthorizedTime,
        version: member.version,
        physicalAddress: member.physicalAddress,
        clientVersion: member.clientVersion,
        online: member.online || false
      };
    } catch (error) {
      console.error(`Failed to get member ${memberId}:`, error);
      throw new Error(`Failed to get member: ${error.message}`);
    }
  }

  /**
   * Authorize a network member
   */
  async authorizeMember(networkId, memberId, config = {}) {
    try {
      const memberConfig = {
        config: {
          authorized: true,
          activeBridge: config.activeBridge || false,
          noAutoAssignIps: config.noAutoAssignIps || false,
          ipAssignments: config.ipAssignments || [],
          capabilities: config.capabilities || [],
          tags: config.tags || []
        },
        name: config.name || 'SiteGuard Device',
        description: config.description || 'Authorized by SiteGuard'
      };

      const response = await this.client.post(`/network/${networkId}/member/${memberId}`, memberConfig);
      return response.data;
    } catch (error) {
      console.error(`Failed to authorize member ${memberId}:`, error);
      throw new Error(`Failed to authorize member: ${error.message}`);
    }
  }

  /**
   * Deauthorize a network member
   */
  async deauthorizeMember(networkId, memberId) {
    try {
      const memberConfig = {
        config: {
          authorized: false
        }
      };

      const response = await this.client.post(`/network/${networkId}/member/${memberId}`, memberConfig);
      return response.data;
    } catch (error) {
      console.error(`Failed to deauthorize member ${memberId}:`, error);
      throw new Error(`Failed to deauthorize member: ${error.message}`);
    }
  }

  /**
   * Delete a network member
   */
  async deleteMember(networkId, memberId) {
    try {
      await this.client.delete(`/network/${networkId}/member/${memberId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete member ${memberId}:`, error);
      throw new Error(`Failed to delete member: ${error.message}`);
    }
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(networkId) {
    try {
      const [network, members] = await Promise.all([
        this.getNetwork(networkId),
        this.getNetworkMembers(networkId)
      ]);

      const authorizedMembers = members.filter(m => m.authorized);
      const onlineMembers = members.filter(m => m.online);

      return {
        networkId: networkId,
        name: network.name,
        totalMembers: members.length,
        authorizedMembers: authorizedMembers.length,
        onlineMembers: onlineMembers.length,
        ipAssignmentPools: network.config?.ipAssignmentPools || [],
        routes: network.config?.routes || [],
        lastUpdate: new Date()
      };
    } catch (error) {
      console.error(`Failed to get network stats for ${networkId}:`, error);
      throw new Error(`Failed to get network stats: ${error.message}`);
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection() {
    try {
      await this.getStatus();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate network join URL
   */
  generateJoinUrl(networkId) {
    return `https://my.zerotier.com/network/${networkId}`;
  }

  /**
   * Generate network configuration for router
   */
  generateRouterConfig(networkId, authToken) {
    return {
      networkId: networkId,
      authToken: authToken,
      allowManaged: true,
      allowGlobal: false,
      allowDefault: false
    };
  }
}

module.exports = ZeroTierClient;
