import { apiClient } from '../api-client';
import { API_CONFIG } from '../api-config';

export interface NetworkDevice {
  id: string;
  name: string;
  ip: string;
  mac: string;
  type: 'router' | 'camera' | 'computer' | 'mobile' | 'unknown';
  status: 'online' | 'offline';
  lastSeen: string;
  manufacturer?: string;
  model?: string;
}

export interface ZeroTierNetwork {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  memberCount: number;
  createdAt: string;
  config: {
    private: boolean;
    enableBroadcast: boolean;
    allowPassiveBridging: boolean;
    allowGlobalIpAssignment: boolean;
  };
}

export interface ZeroTierMember {
  nodeId: string;
  name: string;
  description: string;
  authorized: boolean;
  activeBridge: boolean;
  ipAssignments: string[];
  lastOnline: string;
  physicalAddress: string;
  clientVersion: string;
}

export interface VPNConnection {
  id: string;
  name: string;
  type: 'zerotier' | 'wireguard' | 'openvpn';
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  serverAddress: string;
  localIP?: string;
  connectedAt?: string;
  bytesReceived: number;
  bytesSent: number;
}

/**
 * Network service for network management and monitoring
 * Handles device discovery, VPN management, and network monitoring
 */
export const networkService = {
  /**
   * Get all network devices
   */
  async getNetworkDevices(): Promise<NetworkDevice[]> {
    return apiClient.get<NetworkDevice[]>(`${API_CONFIG.networkServer}/devices`);
  },

  /**
   * Scan for new devices on the network
   */
  async scanNetwork(): Promise<NetworkDevice[]> {
    return apiClient.post<NetworkDevice[]>(`${API_CONFIG.networkServer}/devices/scan`);
  },

  /**
   * Get device details by ID
   */
  async getDeviceDetails(deviceId: string): Promise<NetworkDevice> {
    return apiClient.get<NetworkDevice>(`${API_CONFIG.networkServer}/devices/${deviceId}`);
  },

  /**
   * Update device information
   */
  async updateDevice(deviceId: string, updates: Partial<NetworkDevice>): Promise<NetworkDevice> {
    return apiClient.put<NetworkDevice>(`${API_CONFIG.networkServer}/devices/${deviceId}`, updates);
  },

  /**
   * Delete a device
   */
  async deleteDevice(deviceId: string): Promise<void> {
    return apiClient.delete(`${API_CONFIG.networkServer}/devices/${deviceId}`);
  },

  /**
   * Get ZeroTier networks
   */
  async getZeroTierNetworks(): Promise<ZeroTierNetwork[]> {
    return apiClient.get<ZeroTierNetwork[]>(`${API_CONFIG.networkServer}/zerotier/networks`);
  },

  /**
   * Create a new ZeroTier network
   */
  async createZeroTierNetwork(network: Partial<ZeroTierNetwork>): Promise<ZeroTierNetwork> {
    return apiClient.post<ZeroTierNetwork>(`${API_CONFIG.networkServer}/zerotier/networks`, network);
  },

  /**
   * Join a ZeroTier network
   */
  async joinZeroTierNetwork(networkId: string): Promise<void> {
    return apiClient.post(`${API_CONFIG.networkServer}/zerotier/join`, { networkId });
  },

  /**
   * Leave a ZeroTier network
   */
  async leaveZeroTierNetwork(networkId: string): Promise<void> {
    return apiClient.post(`${API_CONFIG.networkServer}/zerotier/leave`, { networkId });
  },

  /**
   * Get ZeroTier network members
   */
  async getZeroTierMembers(networkId: string): Promise<ZeroTierMember[]> {
    return apiClient.get<ZeroTierMember[]>(`${API_CONFIG.networkServer}/zerotier/networks/${networkId}/members`);
  },

  /**
   * Authorize ZeroTier member
   */
  async authorizeZeroTierMember(networkId: string, memberId: string): Promise<void> {
    return apiClient.post(`${API_CONFIG.networkServer}/zerotier/networks/${networkId}/members/${memberId}/authorize`);
  },

  /**
   * Deauthorize ZeroTier member
   */
  async deauthorizeZeroTierMember(networkId: string, memberId: string): Promise<void> {
    return apiClient.post(`${API_CONFIG.networkServer}/zerotier/networks/${networkId}/members/${memberId}/deauthorize`);
  },

  /**
   * Get VPN connections
   */
  async getVPNConnections(): Promise<VPNConnection[]> {
    return apiClient.get<VPNConnection[]>(`${API_CONFIG.networkServer}/vpn/connections`);
  },

  /**
   * Connect to VPN
   */
  async connectVPN(connectionId: string): Promise<void> {
    return apiClient.post(`${API_CONFIG.networkServer}/vpn/connect/${connectionId}`);
  },

  /**
   * Disconnect from VPN
   */
  async disconnectVPN(connectionId: string): Promise<void> {
    return apiClient.post(`${API_CONFIG.networkServer}/vpn/disconnect/${connectionId}`);
  },

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<any> {
    return apiClient.get(`${API_CONFIG.networkServer}/stats`);
  },

  /**
   * Ping a host
   */
  async pingHost(host: string): Promise<{ success: boolean; time: number; error?: string }> {
    return apiClient.post(`${API_CONFIG.networkServer}/ping`, { host });
  },
};
