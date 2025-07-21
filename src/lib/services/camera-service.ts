import { apiClient } from '../api-client';
import { API_CONFIG } from '../api-config';

export interface Camera {
  id: string;
  name: string;
  ip: string;
  port: number;
  username: string;
  manufacturer: string;
  model: string;
  status: 'online' | 'offline' | 'error';
  capabilities: string[];
  profiles: CameraProfile[];
}

export interface CameraProfile {
  token: string;
  name: string;
  videoSource: string;
  audioSource?: string;
  videoEncoder: VideoEncoder;
  audioEncoder?: AudioEncoder;
}

export interface VideoEncoder {
  encoding: string;
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  bitrate: number;
}

export interface AudioEncoder {
  encoding: string;
  bitrate: number;
  sampleRate: number;
}

export interface Recording {
  id: string;
  cameraId: string;
  startTime: string;
  endTime?: string;
  duration: number;
  fileSize: number;
  filePath: string;
  status: 'recording' | 'completed' | 'error';
}

/**
 * Camera service for ONVIF camera management
 * Handles camera discovery, configuration, and control
 */
export const cameraService = {
  /**
   * Discover ONVIF cameras on the network
   */
  async discoverCameras(): Promise<Camera[]> {
    return apiClient.get<Camera[]>(`${API_CONFIG.onvifServer}/discover`);
  },

  /**
   * Get all configured cameras
   */
  async getCameras(): Promise<Camera[]> {
    return apiClient.get<Camera[]>(`${API_CONFIG.onvifServer}/cameras`);
  },

  /**
   * Get camera details by ID
   */
  async getCameraDetails(cameraId: string): Promise<Camera> {
    return apiClient.get<Camera>(`${API_CONFIG.onvifServer}/cameras/${cameraId}`);
  },

  /**
   * Add a new camera
   */
  async addCamera(camera: Partial<Camera>): Promise<Camera> {
    return apiClient.post<Camera>(`${API_CONFIG.onvifServer}/cameras`, camera);
  },

  /**
   * Update camera configuration
   */
  async updateCamera(cameraId: string, updates: Partial<Camera>): Promise<Camera> {
    return apiClient.put<Camera>(`${API_CONFIG.onvifServer}/cameras/${cameraId}`, updates);
  },

  /**
   * Delete a camera
   */
  async deleteCamera(cameraId: string): Promise<void> {
    return apiClient.delete(`${API_CONFIG.onvifServer}/cameras/${cameraId}`);
  },

  /**
   * Get camera snapshot
   */
  async getCameraSnapshot(cameraId: string): Promise<Blob> {
    const response = await fetch(`${API_CONFIG.onvifServer}/cameras/${cameraId}/snapshot`);
    return response.blob();
  },

  /**
   * Start recording for a camera
   */
  async startRecording(cameraId: string, duration?: number): Promise<Recording> {
    return apiClient.post<Recording>(`${API_CONFIG.mediaServer}/recording/start/${cameraId}`, {
      duration,
    });
  },

  /**
   * Stop recording for a camera
   */
  async stopRecording(cameraId: string): Promise<void> {
    return apiClient.post(`${API_CONFIG.mediaServer}/recording/stop/${cameraId}`);
  },

  /**
   * Get recordings for a camera
   */
  async getRecordings(cameraId: string, startDate?: string, endDate?: string): Promise<Recording[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return apiClient.get<Recording[]>(
      `${API_CONFIG.mediaServer}/recordings/${cameraId}?${params.toString()}`
    );
  },

  /**
   * Delete a recording
   */
  async deleteRecording(recordingId: string): Promise<void> {
    return apiClient.delete(`${API_CONFIG.mediaServer}/recordings/${recordingId}`);
  },

  /**
   * Control PTZ (Pan-Tilt-Zoom) camera
   */
  async controlPTZ(cameraId: string, action: string, params?: any): Promise<void> {
    return apiClient.post(`${API_CONFIG.onvifServer}/cameras/${cameraId}/ptz/${action}`, params);
  },

  /**
   * Get camera status
   */
  async getCameraStatus(cameraId: string): Promise<{ status: string; lastSeen: string }> {
    return apiClient.get(`${API_CONFIG.onvifServer}/cameras/${cameraId}/status`);
  },
};
