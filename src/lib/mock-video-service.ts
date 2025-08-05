/**
 * Mock Video Service for Development
 * Provides fallback video streaming functionality when backend services are unavailable
 */

export interface MockStreamStats {
  protocol: 'mock';
  bitrate: number;
  fps: number;
  resolution: { width: number; height: number };
  connectionState: string;
}

export interface MockVideoConfig {
  cameraId: string;
  autoplay?: boolean;
  muted?: boolean;
}

export class MockVideoService {
  private videoElement: HTMLVideoElement | null = null;
  private config: MockVideoConfig;
  private isPlaying = false;
  private onStatsCallback?: (stats: MockStreamStats) => void;
  private onErrorCallback?: (error: Error) => void;
  private onStateChangeCallback?: (state: string) => void;
  private statsInterval?: NodeJS.Timeout;

  constructor(config: MockVideoConfig) {
    this.config = config;
  }

  async startStream(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;

    try {
      console.log('🎬 Starting mock video service for camera:', this.config.cameraId);

      // Set up mock video source - using a test pattern or placeholder
      await this.setupMockVideo();
      this.startStatsCollection();
      this.handleStateChange('connected');

      console.log('✅ Mock video service started successfully');
    } catch (error) {
      console.error('❌ Mock video service failed:', error);
      this.handleError(new Error(`Mock stream failed: ${error.message}`));
      throw error;
    }
  }

  private async setupMockVideo(): Promise<void> {
    if (!this.videoElement) return;

    // Create a simple canvas-based test pattern
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Canvas context not available');

    // Draw a test pattern
    this.drawTestPattern(ctx, canvas.width, canvas.height);
    
    // Convert canvas to video stream
    const stream = canvas.captureStream(30); // 30 FPS
    this.videoElement.srcObject = stream;
    
    this.videoElement.autoplay = this.config.autoplay ?? true;
    this.videoElement.muted = this.config.muted ?? true;
    
    // Animate the test pattern
    this.animateTestPattern(ctx, canvas.width, canvas.height);
    
    await this.videoElement.play();
    this.isPlaying = true;
  }

  private drawTestPattern(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Create a security camera-like test pattern
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    // Grid pattern
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Camera info overlay
    ctx.fillStyle = '#00ff00';
    ctx.font = '16px monospace';
    ctx.fillText(`Camera: ${this.config.cameraId}`, 20, 30);
    ctx.fillText('MOCK FEED - Development Mode', 20, 50);
    ctx.fillText(`Resolution: ${width}x${height}`, 20, height - 40);
    ctx.fillText(`Status: ONLINE`, 20, height - 20);
    
    // Timestamp
    ctx.fillText(new Date().toLocaleString(), width - 200, 30);
  }

  private animateTestPattern(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    let frame = 0;
    
    const animate = () => {
      if (!this.isPlaying || !this.videoElement) return;
      
      // Redraw background
      this.drawTestPattern(ctx, width, height);
      
      // Add moving elements to simulate activity
      const time = Date.now() / 1000;
      
      // Moving rectangle
      const rectX = (Math.sin(time * 0.5) * 0.5 + 0.5) * (width - 60);
      const rectY = (Math.cos(time * 0.3) * 0.5 + 0.5) * (height - 60);
      
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(rectX, rectY, 60, 40);
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.fillText('MOTION', rectX + 10, rectY + 25);
      
      // Frame counter
      ctx.fillStyle = '#ffeb3b';
      ctx.font = '14px monospace';
      ctx.fillText(`Frame: ${frame++}`, width - 120, height - 60);
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  private startStatsCollection(): void {
    this.statsInterval = setInterval(() => {
      if (this.onStatsCallback) {
        this.onStatsCallback({
          protocol: 'mock',
          bitrate: 1000 + Math.random() * 500, // Simulate varying bitrate
          fps: 30,
          resolution: { width: 640, height: 480 },
          connectionState: 'connected'
        });
      }
    }, 1000);
  }

  // Control methods
  async play(): Promise<void> {
    if (this.videoElement) {
      await this.videoElement.play();
      this.isPlaying = true;
      this.handleStateChange('playing');
    }
  }

  pause(): void {
    if (this.videoElement) {
      this.videoElement.pause();
      this.isPlaying = false;
      this.handleStateChange('paused');
    }
  }

  setVolume(volume: number): void {
    if (this.videoElement) {
      this.videoElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  setMuted(muted: boolean): void {
    if (this.videoElement) {
      this.videoElement.muted = muted;
    }
  }

  // Event handlers
  onStats(callback: (stats: MockStreamStats) => void): void {
    this.onStatsCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  onStateChange(callback: (state: string) => void): void {
    this.onStateChangeCallback = callback;
  }

  // Utility methods
  isConnected(): boolean {
    return this.isPlaying;
  }

  getCurrentProtocol(): 'mock' {
    return 'mock';
  }

  // Cleanup
  async stopStream(): Promise<void> {
    this.isPlaying = false;
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = undefined;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement.src = '';
    }

    this.videoElement = null;
    this.handleStateChange('disconnected');
  }

  private handleStateChange(state: string): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }
  }

  private handleError(error: Error): void {
    console.error('Mock Video Service Error:', error);
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }
}