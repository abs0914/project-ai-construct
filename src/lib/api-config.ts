/**
 * API Configuration for SiteGuard Frontend
 * Configures connection to Contabo VPS backend services
 */

export const API_CONFIG = {
  // Base API URL pointing to Contabo VPS
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.aiconstructpro.com',
  
  // Individual service URLs
  mediaServer: import.meta.env.VITE_MEDIA_SERVER_URL || 'https://api.aiconstructpro.com/api/media',
  onvifServer: import.meta.env.VITE_ONVIF_SERVER_URL || 'https://api.aiconstructpro.com/api/onvif',
  networkServer: import.meta.env.VITE_NETWORK_SERVER_URL || 'https://api.aiconstructpro.com/api/network',
  securityServer: import.meta.env.VITE_SECURITY_SERVER_URL || 'https://api.aiconstructpro.com/api/security',
  
  // WebSocket URL for real-time communication
  websocketURL: import.meta.env.VITE_WEBSOCKET_URL || 'wss://api.aiconstructpro.com',
  
  // Request timeout settings
  timeout: 10000,
  
  // CORS settings
  withCredentials: true,
};

/**
 * Get stream URL for a specific camera
 */
export const getStreamUrl = (cameraId: string, format: 'hls' | 'webrtc' = 'hls') => {
  if (format === 'hls') {
    return `http://api.aiconstructpro.com:8000/live/${cameraId}/index.m3u8`;
  } else {
    return `ws://api.aiconstructpro.com:8001/webrtc/${cameraId}`;
  }
};

/**
 * Get recording URL for a specific recording
 */
export const getRecordingUrl = (recordingId: string) => {
  return `${API_CONFIG.mediaServer}/recordings/${recordingId}`;
};

/**
 * Get thumbnail URL for a camera
 */
export const getThumbnailUrl = (cameraId: string) => {
  return `${API_CONFIG.onvifServer}/cameras/${cameraId}/snapshot`;
};
