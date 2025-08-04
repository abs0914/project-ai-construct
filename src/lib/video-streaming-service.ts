import { WebRTCClient, StreamConfig as WebRTCConfig, StreamStats as WebRTCStats } from './webrtc-client';
import { HLSClient, HLSConfig, HLSStats } from './hls-client';
import { MockVideoService, MockStreamStats } from './mock-video-service';
import { supabase } from '@/integrations/supabase/client';

export interface StreamingConfig {
  cameraId: string;
  rtspUrl: string;
  username?: string;
  password?: string;
  preferredProtocol?: 'webrtc' | 'hls' | 'auto';
  autoplay?: boolean;
  muted?: boolean;
}

export interface UnifiedStreamStats {
  protocol: 'webrtc' | 'hls' | 'mock';
  bitrate: number;
  fps: number;
  resolution: { width: number; height: number };
  latency?: number;
  bufferLength?: number;
  droppedFrames?: number;
  connectionState: string;
}

export type StreamingProtocol = 'webrtc' | 'hls' | 'mock';

export class VideoStreamingService {
  private webrtcClient: WebRTCClient | null = null;
  private hlsClient: HLSClient | null = null;
  private mockClient: MockVideoService | null = null;
  private currentProtocol: StreamingProtocol | null = null;
  private config: StreamingConfig;
  private videoElement: HTMLVideoElement | null = null;
  private mediaServerUrl = 'https://aooppgijnjxbsylvwukx.supabase.co/functions/v1/video-streaming';
  private isDevelopmentMode = true; // Temporarily enable mock until media server is accessible
  
  // Event callbacks
  private onStatsCallback?: (stats: UnifiedStreamStats) => void;
  private onErrorCallback?: (error: Error) => void;
  private onStateChangeCallback?: (state: string) => void;
  private onProtocolSwitchCallback?: (protocol: StreamingProtocol) => void;

  constructor(config: StreamingConfig) {
    this.config = config;
  }

  async startStream(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;

    try {
      // In development mode or when backend is unavailable, use mock service
      if (this.isDevelopmentMode) {
        console.log('Development mode detected, using mock video service');
        await this.connectWithProtocol('mock');
        return;
      }

      // Check media server connectivity first
      console.log('Checking media server connectivity...');
      const { mediaStreamService } = await import('./services/media-stream-service');
      const isConnected = await mediaStreamService.checkConnectivity();
      
      if (!isConnected) {
        console.warn('Media server is not accessible, falling back to mock service');
        await this.connectWithProtocol('mock');
        return;
      }

      // Try to start the stream on the media server
      try {
        await this.startMediaServerStream();
        
        // Determine the best protocol to use
        const protocol = await this.selectOptimalProtocol();
        
        // Connect using the selected protocol
        await this.connectWithProtocol(protocol);
      } catch (mediaServerError) {
        console.warn('Media server stream failed, falling back to mock service:', mediaServerError);
        await this.connectWithProtocol('mock');
      }
      
    } catch (error) {
      this.handleError(new Error(`Failed to start stream: ${error.message}`));
      throw error;
    }
  }

  private async startMediaServerStream(): Promise<{ webrtcUrl: string; hlsUrl: string }> {
    try {
      console.log('Starting media server stream...');
      
      // First attempt: Direct API call to media server
      try {
        const { mediaStreamService } = await import('./services/media-stream-service');
        
        const stream = await mediaStreamService.startStream({
          cameraId: this.config.cameraId,
          rtspUrl: this.config.rtspUrl || '',
          username: this.config.username,
          password: this.config.password,
          quality: 'medium'
        });
        
        console.log('Media server stream started via direct API:', stream);
        return {
          hlsUrl: stream.hlsUrl || `http://api.aiconstructpro.com:8000/live/${stream.streamKey}/index.m3u8`,
          webrtcUrl: stream.webrtcUrl || `ws://api.aiconstructpro.com:8001/webrtc/${stream.streamKey}`
        };
      } catch (directApiError) {
        console.warn('Direct API call failed, trying Supabase function:', directApiError);
        
        // Fallback: Supabase edge function
        const { data, error } = await supabase.functions.invoke('video-streaming', {
          body: {
            action: 'start',
            cameraId: this.config.cameraId,
            rtspUrl: this.config.rtspUrl,
            username: this.config.username,
            password: this.config.password,
          },
        });

        if (error || !data?.success) {
          throw new Error(`All stream start methods failed. Direct API: ${directApiError}, Supabase: ${error?.message || data?.error || 'Unknown error'}`);
        }

        console.log('Media server stream started via Supabase function:', data);
        return {
          hlsUrl: data.urls?.hls || '',
          webrtcUrl: data.urls?.webrtc || ''
        };
      }
    } catch (error) {
      console.error('Media server stream start failed:', error);
      throw error;
    }
  }

  private async selectOptimalProtocol(): Promise<StreamingProtocol> {
    if (this.config.preferredProtocol && this.config.preferredProtocol !== 'auto') {
      return this.config.preferredProtocol;
    }

    // Auto-select based on browser capabilities and network conditions
    const supportsWebRTC = this.isWebRTCSupported();
    const supportsHLS = HLSClient.isSupported() || (this.videoElement && 
      HLSClient.canPlayNatively(this.videoElement, ''));

    // Prefer WebRTC for lower latency, fallback to HLS, then mock
    if (supportsWebRTC) {
      return 'webrtc';
    } else if (supportsHLS) {
      return 'hls';
    } else {
      console.warn('No real streaming protocol available, using mock');
      return 'mock';
    }
  }

  private isWebRTCSupported(): boolean {
    return !!(window.RTCPeerConnection && window.WebSocket);
  }

  private async connectWithProtocol(protocol: StreamingProtocol): Promise<void> {
    this.currentProtocol = protocol;

    if (this.onProtocolSwitchCallback) {
      this.onProtocolSwitchCallback(protocol);
    }

    switch (protocol) {
      case 'webrtc':
        await this.connectWebRTC();
        break;
      case 'hls':
        await this.connectHLS();
        break;
      case 'mock':
        await this.connectMock();
        break;
      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  private async connectWebRTC(): Promise<void> {
    if (!this.videoElement) throw new Error('Video element not available');

    const webrtcConfig: WebRTCConfig = {
      streamKey: `camera_${this.config.cameraId}`,
      signalingUrl: `ws://api.aiconstructpro.com:8001/webrtc/camera_${this.config.cameraId}`,
    };

    this.webrtcClient = new WebRTCClient(webrtcConfig);

    // Set up event handlers
    this.webrtcClient.onStats((stats: WebRTCStats) => {
      if (this.onStatsCallback) {
        this.onStatsCallback({
          protocol: 'webrtc',
          ...stats,
          connectionState: this.webrtcClient?.getConnectionState() || 'unknown'
        });
      }
    });

    this.webrtcClient.onError((error: Error) => {
      console.error('WebRTC error, attempting HLS fallback:', error);
      this.fallbackToHLS();
    });

    this.webrtcClient.onConnectionState((state) => {
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(`webrtc-${state}`);
      }

      // If WebRTC fails, fallback to HLS
      if (state === 'failed' || state === 'disconnected') {
        console.log('WebRTC connection failed, falling back to HLS');
        this.fallbackToHLS();
      }
    });

    await this.webrtcClient.connect(this.videoElement);
  }

  private async connectHLS(): Promise<void> {
    if (!this.videoElement) throw new Error('Video element not available');

    const hlsUrl = `http://api.aiconstructpro.com:8000/live/camera_${this.config.cameraId}/index.m3u8`;
    console.log('Attempting HLS connection to:', hlsUrl);

    const hlsConfig: HLSConfig = {
      streamUrl: hlsUrl,
      autoplay: this.config.autoplay ?? true,
      muted: this.config.muted ?? true,
    };

    this.hlsClient = new HLSClient(hlsConfig);

    // Set up event handlers
    this.hlsClient.onStats((stats: HLSStats) => {
      if (this.onStatsCallback) {
        this.onStatsCallback({
          protocol: 'hls',
          ...stats,
          connectionState: this.hlsClient?.isPlaying() ? 'playing' : 'paused'
        });
      }
    });

    this.hlsClient.onError((error: Error) => {
      this.handleError(error);
    });

    this.hlsClient.onStateChange((state) => {
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(`hls-${state}`);
      }
    });

    await this.hlsClient.connect(this.videoElement);
  }

  private async connectMock(): Promise<void> {
    if (!this.videoElement) throw new Error('Video element not available');

    this.mockClient = new MockVideoService({
      cameraId: this.config.cameraId,
      autoplay: this.config.autoplay ?? true,
      muted: this.config.muted ?? true,
    });

    // Set up event handlers
    this.mockClient.onStats((stats: MockStreamStats) => {
      if (this.onStatsCallback) {
        this.onStatsCallback({
          protocol: 'mock',
          ...stats,
          connectionState: this.mockClient?.isConnected() ? 'connected' : 'disconnected'
        });
      }
    });

    this.mockClient.onError((error: Error) => {
      this.handleError(error);
    });

    this.mockClient.onStateChange((state) => {
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(`mock-${state}`);
      }
    });

    await this.mockClient.startStream(this.videoElement);
  }

  private async fallbackToHLS(): Promise<void> {
    if (this.currentProtocol === 'hls') {
      // Already using HLS, fallback to mock
      console.log('HLS failed, falling back to mock service...');
      await this.connectWithProtocol('mock');
      return;
    }

    try {
      console.log('Falling back to HLS...');
      
      // Cleanup WebRTC
      if (this.webrtcClient) {
        this.webrtcClient.disconnect();
        this.webrtcClient = null;
      }

      // Connect with HLS
      await this.connectWithProtocol('hls');
      
    } catch (error) {
      console.log('HLS fallback failed, using mock service...');
      await this.connectWithProtocol('mock');
    }
  }

  // Control methods
  async play(): Promise<void> {
    if (this.currentProtocol === 'hls' && this.hlsClient) {
      return this.hlsClient.play();
    } else if (this.currentProtocol === 'mock' && this.mockClient) {
      return this.mockClient.play();
    } else if (this.videoElement) {
      return this.videoElement.play();
    }
  }

  pause(): void {
    if (this.currentProtocol === 'hls' && this.hlsClient) {
      this.hlsClient.pause();
    } else if (this.currentProtocol === 'mock' && this.mockClient) {
      this.mockClient.pause();
    } else if (this.videoElement) {
      this.videoElement.pause();
    }
  }

  setVolume(volume: number): void {
    if (this.currentProtocol === 'hls' && this.hlsClient) {
      this.hlsClient.setVolume(volume);
    } else if (this.currentProtocol === 'mock' && this.mockClient) {
      this.mockClient.setVolume(volume);
    } else if (this.videoElement) {
      this.videoElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  setMuted(muted: boolean): void {
    if (this.currentProtocol === 'hls' && this.hlsClient) {
      this.hlsClient.setMuted(muted);
    } else if (this.currentProtocol === 'mock' && this.mockClient) {
      this.mockClient.setMuted(muted);
    } else if (this.videoElement) {
      this.videoElement.muted = muted;
    }
  }

  // Quality control (HLS only)
  getAvailableQualities(): Array<{ level: number; width: number; height: number; bitrate: number }> {
    if (this.currentProtocol === 'hls' && this.hlsClient) {
      return this.hlsClient.getAvailableQualities();
    }
    return [];
  }

  setQuality(level: number): void {
    if (this.currentProtocol === 'hls' && this.hlsClient) {
      this.hlsClient.setQuality(level);
    }
  }

  // Event handlers
  onStats(callback: (stats: UnifiedStreamStats) => void): void {
    this.onStatsCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  onStateChange(callback: (state: string) => void): void {
    this.onStateChangeCallback = callback;
  }

  onProtocolSwitch(callback: (protocol: StreamingProtocol) => void): void {
    this.onProtocolSwitchCallback = callback;
  }

  // Utility methods
  getCurrentProtocol(): StreamingProtocol | null {
    return this.currentProtocol;
  }

  isConnected(): boolean {
    if (this.currentProtocol === 'webrtc' && this.webrtcClient) {
      return this.webrtcClient.isConnected();
    } else if (this.currentProtocol === 'hls' && this.hlsClient) {
      return this.hlsClient.isPlaying();
    } else if (this.currentProtocol === 'mock' && this.mockClient) {
      return this.mockClient.isConnected();
    }
    return false;
  }

  // Cleanup
  async stopStream(): Promise<void> {
    // Stop the stream on the media server (only if not in mock mode)
    if (this.currentProtocol !== 'mock') {
      try {
        // Try direct API first
        const { mediaStreamService } = await import('./services/media-stream-service');
        const stream = mediaStreamService.getStreamByCameraId(this.config.cameraId);
        
        if (stream) {
          await mediaStreamService.stopStream(stream.streamKey);
          console.log('Stream stopped via direct API');
        } else {
          // Fallback to Supabase function
          await supabase.functions.invoke('video-streaming', {
            body: {
              action: 'stop',
              cameraId: this.config.cameraId,
            },
          });
          console.log('Stream stopped via Supabase function');
        }
      } catch (error) {
        console.error('Error stopping media server stream:', error);
      }
    }

    // Cleanup clients
    if (this.webrtcClient) {
      this.webrtcClient.disconnect();
      this.webrtcClient = null;
    }

    if (this.hlsClient) {
      this.hlsClient.disconnect();
      this.hlsClient = null;
    }

    if (this.mockClient) {
      await this.mockClient.stopStream();
      this.mockClient = null;
    }

    this.currentProtocol = null;
    this.videoElement = null;
  }

  private handleError(error: Error): void {
    console.error('Video Streaming Service Error:', error);
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }
}
