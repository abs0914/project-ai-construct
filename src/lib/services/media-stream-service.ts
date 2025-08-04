/**
 * Media Stream Service
 * Direct integration with media server API for stream management
 */

import { apiClient } from '../api-client';
import { API_CONFIG } from '../api-config';

export interface MediaStream {
  id: string;
  cameraId: string;
  streamKey: string;
  status: 'starting' | 'active' | 'stopped' | 'error';
  rtspUrl?: string;
  hlsUrl?: string;
  webrtcUrl?: string;
  startedAt?: string;
  lastSeen?: string;
  stats?: {
    bitrate?: number;
    fps?: number;
    resolution?: string;
    uptime?: number;
  };
}

export interface StreamStartRequest {
  cameraId: string;
  rtspUrl: string;
  username?: string;
  password?: string;
  quality?: 'low' | 'medium' | 'high';
}

export interface StreamHealth {
  streamKey: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastChecked: string;
  stats?: {
    bitrate: number;
    fps: number;
    uptime: number;
  };
}

class MediaStreamService {
  private baseUrl: string;
  private streams: Map<string, MediaStream> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.baseUrl = API_CONFIG.mediaServer;
  }

  /**
   * Start a new stream
   */
  async startStream(request: StreamStartRequest): Promise<MediaStream> {
    try {
      console.log('Starting stream for camera:', request.cameraId);
      
      const response = await apiClient.post<MediaStream>(
        `/api/streams/${request.cameraId}/start`,
        {
          rtspUrl: request.rtspUrl,
          username: request.username,
          password: request.password,
          quality: request.quality || 'medium'
        }
      );

      const stream = response;
      this.streams.set(stream.streamKey, stream);
      
      console.log('Stream started successfully:', stream);
      return stream;
    } catch (error) {
      console.error('Failed to start stream:', error);
      throw new Error(`Failed to start stream for camera ${request.cameraId}: ${error}`);
    }
  }

  /**
   * Stop a stream
   */
  async stopStream(streamKey: string): Promise<void> {
    try {
      console.log('Stopping stream:', streamKey);
      
      await apiClient.post(`/api/streams/${streamKey}/stop`);
      
      this.streams.delete(streamKey);
      console.log('Stream stopped successfully:', streamKey);
    } catch (error) {
      console.error('Failed to stop stream:', error);
      throw new Error(`Failed to stop stream ${streamKey}: ${error}`);
    }
  }

  /**
   * Get all active streams
   */
  async getStreams(): Promise<MediaStream[]> {
    try {
      const response = await apiClient.get<MediaStream[]>('/api/streams');
      
      // Update local cache
      response.forEach(stream => {
        this.streams.set(stream.streamKey, stream);
      });
      
      return response;
    } catch (error) {
      console.error('Failed to get streams:', error);
      throw new Error(`Failed to get streams: ${error}`);
    }
  }

  /**
   * Get stream health status
   */
  async getStreamHealth(streamKey: string): Promise<StreamHealth> {
    try {
      const response = await apiClient.get<StreamHealth>(`/api/streams/${streamKey}/health`);
      return response;
    } catch (error) {
      console.error('Failed to get stream health:', error);
      throw new Error(`Failed to get stream health for ${streamKey}: ${error}`);
    }
  }

  /**
   * Check media server connectivity
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      await apiClient.get('/api/streams');
      return true;
    } catch (error) {
      console.warn('Media server connectivity check failed:', error);
      return false;
    }
  }

  /**
   * Get stream by camera ID
   */
  getStreamByCameraId(cameraId: string): MediaStream | undefined {
    return Array.from(this.streams.values()).find(stream => stream.cameraId === cameraId);
  }

  /**
   * Get stream by stream key
   */
  getStream(streamKey: string): MediaStream | undefined {
    return this.streams.get(streamKey);
  }

  /**
   * Start periodic health monitoring
   */
  startHealthMonitoring(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const streams = await this.getStreams();
        console.log(`Health check: ${streams.length} active streams`);
      } catch (error) {
        console.warn('Health check failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopHealthMonitoring();
    this.streams.clear();
  }
}

// Export singleton instance
export const mediaStreamService = new MediaStreamService();
export default mediaStreamService;