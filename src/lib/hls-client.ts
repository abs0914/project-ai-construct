import Hls from 'hls.js';

export interface HLSConfig {
  streamUrl: string;
  autoplay?: boolean;
  muted?: boolean;
  maxBufferLength?: number;
  maxBufferSize?: number;
}

export interface HLSStats {
  bitrate: number;
  fps: number;
  resolution: { width: number; height: number };
  bufferLength: number;
  droppedFrames: number;
}

export class HLSClient {
  private hls: Hls | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private config: HLSConfig;
  private onStatsCallback?: (stats: HLSStats) => void;
  private onErrorCallback?: (error: Error) => void;
  private onStateChangeCallback?: (state: string) => void;
  private statsInterval?: NodeJS.Timeout;
  private lastStats: any = {};

  constructor(config: HLSConfig) {
    this.config = config;
  }

  static isSupported(): boolean {
    return Hls.isSupported();
  }

  static canPlayNatively(videoElement: HTMLVideoElement, streamUrl: string): boolean {
    return videoElement.canPlayType('application/vnd.apple.mpegurl') !== '';
  }

  async connect(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;

    try {
      if (HLSClient.canPlayNatively(videoElement, this.config.streamUrl)) {
        await this.setupNativeHLS();
      } else if (HLSClient.isSupported()) {
        await this.setupHLSJS();
      } else {
        throw new Error('HLS is not supported in this browser');
      }

      this.startStatsCollection();
    } catch (error) {
      this.handleError(new Error(`HLS connection failed: ${error.message}`));
      throw error;
    }
  }

  private async setupNativeHLS(): Promise<void> {
    if (!this.videoElement) return;

    console.log('Using native HLS support');
    
    this.videoElement.src = this.config.streamUrl;
    this.videoElement.autoplay = this.config.autoplay ?? true;
    this.videoElement.muted = this.config.muted ?? true;

    // Add event listeners
    this.videoElement.addEventListener('loadstart', () => {
      this.handleStateChange('loading');
    });

    this.videoElement.addEventListener('canplay', () => {
      this.handleStateChange('ready');
    });

    this.videoElement.addEventListener('playing', () => {
      this.handleStateChange('playing');
    });

    this.videoElement.addEventListener('error', (event) => {
      const error = this.videoElement?.error;
      this.handleError(new Error(`Native HLS error: ${error?.message || 'Unknown error'}`));
    });

    try {
      await this.videoElement.load();
    } catch (error) {
      throw new Error(`Failed to load native HLS stream: ${error.message}`);
    }
  }

  private async setupHLSJS(): Promise<void> {
    if (!this.videoElement) return;

    console.log('Using HLS.js');

    const hlsConfig: Partial<typeof Hls.DefaultConfig> = {
      maxBufferLength: this.config.maxBufferLength || 30,
      maxBufferSize: this.config.maxBufferSize || 60 * 1000 * 1000, // 60MB
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 90
    };

    this.hls = new Hls(hlsConfig);

    // Set up event listeners
    this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      console.log('HLS media attached');
      this.handleStateChange('attached');
    });

    this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      console.log('HLS manifest parsed, levels:', data.levels);
      this.handleStateChange('ready');
      
      if (this.config.autoplay) {
        this.videoElement?.play().catch(error => {
          console.warn('Autoplay failed:', error);
        });
      }
    });

    this.hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
      console.log('HLS level switched to:', data.level);
    });

    this.hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
      // Update stats when fragments are loaded
      this.updateFragmentStats(data);
    });

    this.hls.on(Hls.Events.ERROR, (event, data) => {
      console.error('HLS error:', data);
      
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            this.handleError(new Error(`Network error: ${data.details}`));
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            this.handleError(new Error(`Media error: ${data.details}`));
            break;
          default:
            this.handleError(new Error(`Fatal HLS error: ${data.details}`));
            break;
        }
      }
    });

    // Attach media and load source
    this.hls.attachMedia(this.videoElement);
    this.hls.loadSource(this.config.streamUrl);

    // Set video element properties
    this.videoElement.muted = this.config.muted ?? true;
  }

  private updateFragmentStats(data: any): void {
    this.lastStats = {
      ...this.lastStats,
      lastFragmentLoadTime: data.stats.loading.end - data.stats.loading.start,
      fragmentSize: data.frag.bytes,
      level: data.frag.level
    };
  }

  private startStatsCollection(): void {
    this.statsInterval = setInterval(() => {
      const stats = this.collectStats();
      if (this.onStatsCallback && stats) {
        this.onStatsCallback(stats);
      }
    }, 1000);
  }

  private collectStats(): HLSStats | null {
    if (!this.videoElement) return null;

    const video = this.videoElement;
    const stats: HLSStats = {
      bitrate: 0,
      fps: 0,
      resolution: { width: video.videoWidth, height: video.videoHeight },
      bufferLength: 0,
      droppedFrames: 0
    };

    // Get buffer length
    if (video.buffered.length > 0) {
      const currentTime = video.currentTime;
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= currentTime && currentTime <= video.buffered.end(i)) {
          stats.bufferLength = video.buffered.end(i) - currentTime;
          break;
        }
      }
    }

    // Get dropped frames (if supported)
    if ('webkitDroppedFrameCount' in video) {
      stats.droppedFrames = (video as any).webkitDroppedFrameCount;
    }

    // Get bitrate from HLS.js if available
    if (this.hls) {
      const currentLevel = this.hls.currentLevel;
      if (currentLevel >= 0 && this.hls.levels[currentLevel]) {
        stats.bitrate = this.hls.levels[currentLevel].bitrate / 1000; // Convert to kbps
      }
    }

    // Estimate FPS (basic implementation)
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      stats.fps = 30; // Default assumption, could be improved with actual measurement
    }

    return stats;
  }

  private handleStateChange(state: string): void {
    console.log('HLS state changed:', state);
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }
  }

  private handleError(error: Error): void {
    console.error('HLS Client Error:', error);
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  // Public methods for event handling
  onStats(callback: (stats: HLSStats) => void): void {
    this.onStatsCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  onStateChange(callback: (state: string) => void): void {
    this.onStateChangeCallback = callback;
  }

  // Control methods
  play(): Promise<void> {
    if (!this.videoElement) {
      return Promise.reject(new Error('Video element not available'));
    }
    return this.videoElement.play();
  }

  pause(): void {
    this.videoElement?.pause();
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

  // Quality control
  setQuality(level: number): void {
    if (this.hls) {
      this.hls.currentLevel = level;
    }
  }

  getAvailableQualities(): Array<{ level: number; width: number; height: number; bitrate: number }> {
    if (!this.hls) return [];
    
    return this.hls.levels.map((level, index) => ({
      level: index,
      width: level.width,
      height: level.height,
      bitrate: level.bitrate
    }));
  }

  // Cleanup
  disconnect(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = undefined;
    }

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    if (this.videoElement) {
      this.videoElement.src = '';
      this.videoElement.load();
    }
  }

  // Get current state
  isPlaying(): boolean {
    return this.videoElement ? !this.videoElement.paused : false;
  }

  getCurrentTime(): number {
    return this.videoElement?.currentTime || 0;
  }

  getDuration(): number {
    return this.videoElement?.duration || 0;
  }
}
