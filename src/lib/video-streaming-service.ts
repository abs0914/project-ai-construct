import { WebRTCClient, StreamConfig as WebRTCConfig, StreamStats as WebRTCStats } from './webrtc-client';
import { HLSClient, HLSConfig, HLSStats } from './hls-client';
import { MockVideoService, MockStreamStats } from './mock-video-service';
import { V380Service } from './services/v380-service';
import { supabase } from '@/integrations/supabase/client';

export interface StreamingConfig {
  cameraId: string;
  cameraName?: string; // Add camera name for V380 detection
  rtspUrl: string;
  username?: string;
  password?: string;
  port?: number; // Add port for V380 cameras
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
  private v380Service: V380Service;
  private currentProtocol: StreamingProtocol | null = null;
  private config: StreamingConfig;
  private videoElement: HTMLVideoElement | null = null;
  private mediaServerUrl = 'https://aooppgijnjxbsylvwukx.supabase.co/functions/v1/video-streaming';
  private isDevelopmentMode = false; // Test real streaming with correct URLs
  private disableWebRTC = true; // Disable WebRTC, use HLS-only approach
  private currentRelayId?: string;
  
  // Event callbacks
  private onStatsCallback?: (stats: UnifiedStreamStats) => void;
  private onErrorCallback?: (error: Error) => void;
  private onStateChangeCallback?: (state: string) => void;
  private onProtocolSwitchCallback?: (protocol: StreamingProtocol) => void;

  constructor(config: StreamingConfig) {
    this.config = config;
    this.v380Service = new V380Service();
  }

  async startStream(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;

    try {
      // Add debugging to see camera details
      console.log('🔍 Camera ID being checked:', this.config.cameraId);
      console.log('🔍 Camera name being checked:', this.config.cameraName);
      
      // For V380 cameras, use V380 service for live streams
      // Check for V380 patterns (case insensitive) in both ID and name
      const isV380Camera = this.config.cameraId.toLowerCase().includes('v380') || 
                          this.config.cameraId.toLowerCase().includes('remote-v380') ||
                          (this.config.cameraName && this.config.cameraName.toLowerCase().includes('v380'));
      
      if (isV380Camera) {
        console.log('✅ V380 camera detected via', this.config.cameraName ? 'name' : 'ID', ', starting live V380 stream');
        await this.startV380LiveStream();
        return;
      } else {
        console.log('❌ Non-V380 camera detected, trying media server');
      }

      // For other cameras, try media server first
      try {
        await this.startMediaServerStream();
        const protocol = await this.selectOptimalProtocol();
        await this.connectWithProtocol(protocol);
      } catch (mediaServerError) {
        console.warn('Media server stream failed, using demo stream:', mediaServerError);
        await this.connectWithProtocol('mock');
      }
      
    } catch (error) {
      this.handleError(new Error(`Failed to start stream: ${error.message}`));
      throw error;
    }
  }

  private async startMediaServerStream(): Promise<{ webrtcUrl: string; hlsUrl: string }> {
    try {
      console.log('🎥 Starting stream via direct media server API...');
      
      // Use direct media server API following the correct flow
      const response = await fetch(`https://api.aiconstructpro.com/api/streams/${this.config.cameraId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rtspUrl: this.config.rtspUrl,
          username: this.config.username,
          password: this.config.password
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start stream: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Stream started successfully:', data);
      
      // Wait for HLS segments to be generated (as recommended)
      console.log('⏳ Waiting for HLS segments to be generated...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Ensure URLs use the correct domain
      const hlsUrl = data.urls.hls.replace('localhost:8000', 'api.aiconstructpro.com');
      const webrtcUrl = data.urls.webrtc.replace('localhost:8000', 'api.aiconstructpro.com');
      
      console.log('🎬 Stream URLs ready:', { hlsUrl, webrtcUrl });
      
      return {
        hlsUrl,
        webrtcUrl
      };
    } catch (error) {
      console.error('❌ Media server stream start failed:', error);
      throw error;
    }
  }

  private async selectOptimalProtocol(): Promise<StreamingProtocol> {
    if (this.config.preferredProtocol && this.config.preferredProtocol !== 'auto') {
      return this.config.preferredProtocol;
    }

    // Force HLS-only approach for reliability
    if (this.disableWebRTC) {
      const supportsHLS = HLSClient.isSupported() || (this.videoElement && 
        HLSClient.canPlayNatively(this.videoElement, ''));
      
      if (supportsHLS) {
        console.log('Using HLS-only streaming approach');
        return 'hls';
      } else {
        console.warn('HLS not supported, using mock');
        return 'mock';
      }
    }

    // Legacy auto-select logic (currently disabled)
    const supportsWebRTC = this.isWebRTCSupported();
    const supportsHLS = HLSClient.isSupported() || (this.videoElement && 
      HLSClient.canPlayNatively(this.videoElement, ''));

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

    const streamKey = `camera_${this.config.cameraId}`;
    const webrtcConfig: WebRTCConfig = {
      streamKey: streamKey,
      signalingUrl: `wss://api.aiconstructpro.com/webrtc/${streamKey}`,
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

    // Use the correct HLS URL format with streamKey
    const streamKey = `camera_${this.config.cameraId}`;
    const hlsUrl = `https://api.aiconstructpro.com/live/${streamKey}/index.m3u8`;
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

  private async startV380LiveStream(): Promise<void> {
    if (!this.videoElement) throw new Error('Video element not available');

    try {
      // Create V380 camera configuration from the streaming config
      const v380Camera = {
        id: this.config.cameraId,
        name: this.config.cameraName || 'V380 Camera',
        ip: this.config.rtspUrl?.split('://')[1]?.split(':')[0] || 'localhost',
        port: this.config.port || 8800,
        model: 'V380 Pro',
        firmware: '1.0.0',
        credentials: {
          username: this.config.username || 'admin',
          password: this.config.password || 'admin'
        },
        streamSettings: {
          rtspPath: '/stream',
          quality: 'high' as const,
          resolution: '1920x1080',
          frameRate: 30,
          bitrate: 2000000,
          audioEnabled: true
        },
        protocolSettings: {
          version: '2.0',
          encryption: false,
          compression: true,
          heartbeatInterval: 30000,
          reconnectInterval: 5000,
          maxRetries: 3
        },
        capabilities: {
          ptz: false,
          nightVision: true,
          motionDetection: true,
          audioSupport: true,
          recordingSupport: true
        },
        status: {
          enabled: true,
          lastSeen: null,
          connectionStatus: 'disconnected' as const
        }
      };

      console.log('🔄 Starting V380 live stream for camera:', this.config.cameraId);
      
      // Start V380 streaming workflow
      const streamResult = await this.v380Service.startV380Stream(
        this.config.cameraId, 
        v380Camera, 
        'hls'
      );
      
      // Store relay ID for cleanup
      this.currentRelayId = streamResult.relayId;
      
      console.log('✅ V380 stream started, connecting to HLS URL:', streamResult.streamUrls.hls);
      
      // Connect to the HLS stream URL
      this.videoElement.src = streamResult.streamUrls.hls;
      this.videoElement.load();
      
      if (this.config.autoplay) {
        await this.videoElement.play();
      }
      
      this.currentProtocol = 'hls';
      this.handleStateChange('connected');
      this.handleProtocolSwitch('hls');
      
      console.log('✅ V380 live stream connected successfully');
      
    } catch (error) {
      console.error('V380 live stream failed:', error);
      // Fall back to mock as last resort
      console.log('Falling back to mock video for V380 camera');
      await this.connectWithProtocol('mock');
    }
  }

  private startDemoStatsCollection(): void {
    setInterval(() => {
      if (this.videoElement && this.currentProtocol) {
        const stats: UnifiedStreamStats = {
          protocol: this.currentProtocol,
          bitrate: 1500, // Demo bitrate
          fps: 25,
          resolution: { 
            width: this.videoElement.videoWidth || 1280, 
            height: this.videoElement.videoHeight || 720 
          },
          latency: 150,
          connectionState: this.videoElement.readyState >= 3 ? 'connected' : 'connecting'
        };
        
        if (this.onStatsCallback) {
          this.onStatsCallback(stats);
        }
      }
    }, 1000);
  }

  private handleStateChange(state: string): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }
  }

  private handleProtocolSwitch(protocol: StreamingProtocol): void {
    if (this.onProtocolSwitchCallback) {
      this.onProtocolSwitchCallback(protocol);
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
    try {
      // Stop V380 stream if we have a relay ID
      if (this.currentRelayId) {
        try {
          await this.v380Service.stopV380Stream(this.config.cameraId, this.currentRelayId);
          this.currentRelayId = undefined;
          console.log('✅ V380 stream stopped successfully');
        } catch (error) {
          console.warn('V380 stream stop error:', error);
        }
      }
      
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
    } catch (error) {
      console.warn('Error stopping stream:', error);
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
