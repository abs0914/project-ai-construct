import 'webrtc-adapter';

export interface StreamConfig {
  streamKey: string;
  signalingUrl: string;
  iceServers?: RTCIceServer[];
}

export interface StreamStats {
  bitrate: number;
  fps: number;
  resolution: { width: number; height: number };
  latency: number;
}

export class WebRTCClient {
  private peerConnection: RTCPeerConnection | null = null;
  private websocket: WebSocket | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private config: StreamConfig;
  private onStatsCallback?: (stats: StreamStats) => void;
  private onErrorCallback?: (error: Error) => void;
  private onConnectionStateCallback?: (state: RTCPeerConnectionState) => void;
  private statsInterval?: NodeJS.Timeout;

  constructor(config: StreamConfig) {
    this.config = config;
  }

  async connect(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;
    
    try {
      await this.setupPeerConnection();
      await this.setupWebSocket();
    } catch (error) {
      this.handleError(new Error(`Connection failed: ${error.message}`));
      throw error;
    }
  }

  private async setupPeerConnection(): Promise<void> {
    const configuration: RTCConfiguration = {
      iceServers: this.config.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    // Handle incoming streams
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote stream');
      if (this.videoElement && event.streams[0]) {
        this.videoElement.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.websocket) {
        this.websocket.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate
        }));
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('WebRTC connection state:', state);
      
      if (this.onConnectionStateCallback && state) {
        this.onConnectionStateCallback(state);
      }

      if (state === 'connected') {
        this.startStatsCollection();
      } else if (state === 'disconnected' || state === 'failed') {
        this.stopStatsCollection();
      }
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.peerConnection?.iceConnectionState);
    };
  }

  private async setupWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.websocket = new WebSocket(this.config.signalingUrl);

      this.websocket.onopen = () => {
        console.log('WebSocket connected');
        this.createOffer();
        resolve();
      };

      this.websocket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          await this.handleSignalingMessage(data);
        } catch (error) {
          console.error('Error handling signaling message:', error);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(new Error('WebSocket connection failed'));
      };

      this.websocket.onclose = () => {
        console.log('WebSocket disconnected');
        this.handleDisconnection();
      };
    });
  }

  private async createOffer(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true
      });

      await this.peerConnection.setLocalDescription(offer);

      if (this.websocket) {
        this.websocket.send(JSON.stringify({
          type: 'offer',
          offer: offer
        }));
      }
    } catch (error) {
      this.handleError(new Error(`Failed to create offer: ${error.message}`));
    }
  }

  private async handleSignalingMessage(data: any): Promise<void> {
    if (!this.peerConnection) return;

    switch (data.type) {
      case 'answer':
        await this.peerConnection.setRemoteDescription(data.answer);
        break;
      
      case 'ice-candidate':
        if (data.candidate) {
          await this.peerConnection.addIceCandidate(data.candidate);
        }
        break;
      
      default:
        console.log('Unknown signaling message type:', data.type);
    }
  }

  private startStatsCollection(): void {
    if (!this.peerConnection) return;

    this.statsInterval = setInterval(async () => {
      try {
        const stats = await this.peerConnection!.getStats();
        const streamStats = this.parseStats(stats);
        
        if (this.onStatsCallback && streamStats) {
          this.onStatsCallback(streamStats);
        }
      } catch (error) {
        console.error('Error collecting stats:', error);
      }
    }, 1000);
  }

  private stopStatsCollection(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = undefined;
    }
  }

  private parseStats(stats: RTCStatsReport): StreamStats | null {
    let bitrate = 0;
    let fps = 0;
    let resolution = { width: 0, height: 0 };
    let latency = 0;

    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
        bitrate = report.bytesReceived * 8 / 1000; // Convert to kbps
        fps = report.framesPerSecond || 0;
      }
      
      if (report.type === 'track' && report.kind === 'video') {
        resolution.width = report.frameWidth || 0;
        resolution.height = report.frameHeight || 0;
      }

      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        latency = report.currentRoundTripTime * 1000 || 0; // Convert to ms
      }
    });

    return { bitrate, fps, resolution, latency };
  }

  private handleDisconnection(): void {
    this.stopStatsCollection();
    
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  private handleError(error: Error): void {
    console.error('WebRTC Client Error:', error);
    
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  // Public methods for event handling
  onStats(callback: (stats: StreamStats) => void): void {
    this.onStatsCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  onConnectionState(callback: (state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateCallback = callback;
  }

  // Disconnect and cleanup
  disconnect(): void {
    this.stopStatsCollection();

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  // Get current connection state
  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null;
  }

  // Check if connected
  isConnected(): boolean {
    return this.peerConnection?.connectionState === 'connected';
  }
}
