/**
 * SiteGuard Services
 * Centralized export for all API services
 */

// Export services
export { authService } from './auth-service';
export { cameraService } from './camera-service';
export { networkService } from './network-service';
export { websocketService } from './websocket-service';

// Export types
export type {
  LoginCredentials,
  User,
  AuthResponse,
} from './auth-service';

export type {
  Camera,
  CameraProfile,
  VideoEncoder,
  AudioEncoder,
  Recording,
} from './camera-service';

export type {
  NetworkDevice,
  ZeroTierNetwork,
  ZeroTierMember,
  VPNConnection,
} from './network-service';

export type {
  WebSocketMessage,
  WebSocketEventHandlers,
} from './websocket-service';

// Export API configuration
export { API_CONFIG, getStreamUrl, getRecordingUrl, getThumbnailUrl } from '../api-config';

// Export main API client
export { apiClient } from '../api-client';
