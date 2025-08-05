const EventEmitter = require('events');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * V380 Stream Relay Service
 * Converts V380 streams to standard formats (RTSP/HLS/WebRTC)
 */
class V380StreamRelay extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      ...config.cameras.v380,
      ...options
    };
    
    this.activeRelays = new Map();
    this.ffmpegProcesses = new Map();
    this.isRunning = false;
    
    // Stream conversion settings
    this.conversionSettings = {
      rtsp: {
        codec: 'libx264',
        preset: 'ultrafast',
        tune: 'zerolatency',
        format: 'rtsp'
      },
      hls: {
        codec: 'libx264',
        preset: 'veryfast',
        segmentTime: 2,
        playlistSize: 5,
        format: 'hls'
      },
      webrtc: {
        codec: 'libvpx-vp8',
        preset: 'realtime',
        format: 'webm'
      }
    };
  }

  /**
   * Start the V380 stream relay service
   */
  async start() {
    if (this.isRunning) {
      console.log('V380 Stream Relay already running');
      return;
    }

    try {
      console.log('Starting V380 Stream Relay...');
      
      // Create output directories
      await this.createOutputDirectories();
      
      // Initialize relay server
      await this.initializeRelayServer();
      
      this.isRunning = true;
      this.emit('started');
      
      console.log('✅ V380 Stream Relay started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start V380 Stream Relay:', error);
      throw error;
    }
  }

  /**
   * Stop the V380 stream relay service
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping V380 Stream Relay...');

    // Stop all active relays
    for (const [relayId, relay] of this.activeRelays) {
      await this.stopRelay(relayId);
    }

    // Close relay server
    if (this.relayServer) {
      this.relayServer.close();
      this.relayServer = null;
    }

    // Clear active relays and processes
    this.activeRelays.clear();
    this.ffmpegProcesses.clear();

    this.isRunning = false;
    this.emit('stopped');

    console.log('✅ V380 Stream Relay stopped');
  }

  /**
   * Create output directories for different stream formats
   */
  async createOutputDirectories() {
    const dirs = [
      path.join(config.storage.mediaRoot, 'v380-streams'),
      path.join(config.storage.mediaRoot, 'v380-streams', 'hls'),
      path.join(config.storage.mediaRoot, 'v380-streams', 'rtsp'),
      path.join(config.storage.mediaRoot, 'v380-streams', 'webrtc')
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    }
  }

  /**
   * Initialize the relay server
   */
  async initializeRelayServer() {
    return new Promise((resolve, reject) => {
      const server = net.createServer((socket) => {
        console.log('🔗 V380 relay client connected:', socket.remoteAddress);
        
        socket.on('data', (data) => {
          this.handleRelayCommand(socket, data);
        });
        
        socket.on('error', (error) => {
          console.error('V380 relay socket error:', error);
        });
        
        socket.on('close', () => {
          console.log('🔌 V380 relay client disconnected');
        });
      });
      
      const port = this.config.pcSoftware.relayPort + 1; // Use next port for relay
      server.listen(port, (error) => {
        if (error) {
          reject(error);
        } else {
          this.relayServer = server;
          console.log(`🔄 V380 Stream Relay listening on port ${port}`);
          resolve();
        }
      });
    });
  }

  /**
   * Handle relay commands from clients
   */
  handleRelayCommand(socket, data) {
    try {
      const command = data.toString().trim();
      console.log('V380 relay command:', command);
      
      const [action, ...params] = command.split(' ');
      
      switch (action) {
        case 'START_RELAY':
          this.handleStartRelay(socket, params);
          break;
        case 'STOP_RELAY':
          this.handleStopRelay(socket, params);
          break;
        case 'GET_STATUS':
          this.handleGetStatus(socket, params);
          break;
        default:
          socket.write('ERROR: Unknown command\n');
      }
      
    } catch (error) {
      console.error('Error handling V380 relay command:', error);
      socket.write(`ERROR: ${error.message}\n`);
    }
  }

  /**
   * Handle start relay command
   */
  async handleStartRelay(socket, params) {
    const [cameraId, inputSource, outputFormat] = params;
    
    if (!cameraId || !inputSource || !outputFormat) {
      socket.write('ERROR: Missing parameters (cameraId, inputSource, outputFormat)\n');
      return;
    }
    
    try {
      const relayId = await this.startRelay(cameraId, inputSource, outputFormat);
      socket.write(`OK: Relay started with ID ${relayId}\n`);
    } catch (error) {
      socket.write(`ERROR: ${error.message}\n`);
    }
  }

  /**
   * Handle stop relay command
   */
  async handleStopRelay(socket, params) {
    const [relayId] = params;
    
    if (!relayId) {
      socket.write('ERROR: Missing relay ID\n');
      return;
    }
    
    try {
      await this.stopRelay(relayId);
      socket.write(`OK: Relay ${relayId} stopped\n`);
    } catch (error) {
      socket.write(`ERROR: ${error.message}\n`);
    }
  }

  /**
   * Handle get status command
   */
  handleGetStatus(socket, params) {
    const status = this.getRelayStatus();
    socket.write(`OK: ${JSON.stringify(status)}\n`);
  }

  /**
   * Start a stream relay
   */
  async startRelay(cameraId, inputSource, outputFormat) {
    const relayId = `${cameraId}_${outputFormat}_${Date.now()}`;
    
    if (this.activeRelays.has(relayId)) {
      throw new Error(`Relay ${relayId} already exists`);
    }

    console.log(`Starting V380 stream relay: ${relayId}`);
    console.log(`Input: ${inputSource}, Output: ${outputFormat}`);
    
    try {
      // Create FFmpeg process for stream conversion
      const ffmpegProcess = await this.createFFmpegProcess(
        relayId,
        inputSource,
        outputFormat,
        cameraId
      );
      
      // Store relay information
      this.activeRelays.set(relayId, {
        cameraId,
        inputSource,
        outputFormat,
        process: ffmpegProcess,
        startTime: Date.now(),
        status: 'active'
      });
      
      this.ffmpegProcesses.set(relayId, ffmpegProcess);
      
      this.emit('relayStarted', relayId);
      console.log(`✅ V380 stream relay started: ${relayId}`);
      
      return relayId;
      
    } catch (error) {
      console.error(`❌ Failed to start V380 stream relay ${relayId}:`, error);
      throw error;
    }
  }

  /**
   * Stop a stream relay
   */
  async stopRelay(relayId) {
    const relay = this.activeRelays.get(relayId);
    if (!relay) {
      throw new Error(`Relay ${relayId} not found`);
    }

    console.log(`Stopping V380 stream relay: ${relayId}`);
    
    try {
      // Kill FFmpeg process
      const ffmpegProcess = this.ffmpegProcesses.get(relayId);
      if (ffmpegProcess) {
        ffmpegProcess.kill('SIGTERM');
        this.ffmpegProcesses.delete(relayId);
      }
      
      // Remove relay
      this.activeRelays.delete(relayId);
      
      this.emit('relayStopped', relayId);
      console.log(`✅ V380 stream relay stopped: ${relayId}`);
      
    } catch (error) {
      console.error(`❌ Failed to stop V380 stream relay ${relayId}:`, error);
      throw error;
    }
  }

  /**
   * Create FFmpeg process for stream conversion
   */
  async createFFmpegProcess(relayId, inputSource, outputFormat, cameraId) {
    const settings = this.conversionSettings[outputFormat];
    if (!settings) {
      throw new Error(`Unsupported output format: ${outputFormat}`);
    }

    const outputPath = this.getOutputPath(relayId, outputFormat, cameraId);
    const ffmpegArgs = this.buildFFmpegArgs(inputSource, outputPath, settings);
    
    console.log('FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
    
    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
    
    // Handle process events
    ffmpegProcess.stdout.on('data', (data) => {
      console.log(`FFmpeg stdout [${relayId}]:`, data.toString());
    });
    
    ffmpegProcess.stderr.on('data', (data) => {
      console.log(`FFmpeg stderr [${relayId}]:`, data.toString());
    });
    
    ffmpegProcess.on('close', (code) => {
      console.log(`FFmpeg process [${relayId}] exited with code ${code}`);
      this.handleProcessExit(relayId, code);
    });
    
    ffmpegProcess.on('error', (error) => {
      console.error(`FFmpeg process [${relayId}] error:`, error);
      this.handleProcessError(relayId, error);
    });
    
    return ffmpegProcess;
  }

  /**
   * Build FFmpeg arguments for stream conversion
   */
  buildFFmpegArgs(inputSource, outputPath, settings) {
    const args = [
      '-i', inputSource,
      '-c:v', settings.codec,
      '-preset', settings.preset
    ];
    
    // Add format-specific arguments
    if (settings.format === 'hls') {
      args.push(
        '-f', 'hls',
        '-hls_time', settings.segmentTime.toString(),
        '-hls_list_size', settings.playlistSize.toString(),
        '-hls_flags', 'delete_segments'
      );
    } else if (settings.format === 'rtsp') {
      args.push(
        '-f', 'rtsp',
        '-tune', settings.tune
      );
    } else if (settings.format === 'webm') {
      args.push(
        '-f', 'webm',
        '-deadline', 'realtime'
      );
    }
    
    // Add output path
    args.push(outputPath);
    
    return args;
  }

  /**
   * Get output path for converted stream
   */
  getOutputPath(relayId, outputFormat, cameraId) {
    const baseDir = path.join(config.storage.mediaRoot, 'v380-streams', outputFormat);
    
    switch (outputFormat) {
      case 'hls':
        return path.join(baseDir, `${cameraId}`, 'index.m3u8');
      case 'rtsp':
        return `rtsp://localhost:${config.ports.rtsp}/${cameraId}`;
      case 'webrtc':
        return path.join(baseDir, `${cameraId}.webm`);
      default:
        return path.join(baseDir, `${relayId}.${outputFormat}`);
    }
  }

  /**
   * Handle FFmpeg process exit
   */
  handleProcessExit(relayId, code) {
    const relay = this.activeRelays.get(relayId);
    if (relay) {
      relay.status = code === 0 ? 'completed' : 'failed';
      this.emit('relayProcessExit', relayId, code);
    }
  }

  /**
   * Handle FFmpeg process error
   */
  handleProcessError(relayId, error) {
    const relay = this.activeRelays.get(relayId);
    if (relay) {
      relay.status = 'error';
      relay.error = error.message;
      this.emit('relayProcessError', relayId, error);
    }
  }

  /**
   * Get relay status
   */
  getRelayStatus(relayId = null) {
    if (relayId) {
      const relay = this.activeRelays.get(relayId);
      if (!relay) {
        return null;
      }
      
      return {
        relayId,
        cameraId: relay.cameraId,
        inputSource: relay.inputSource,
        outputFormat: relay.outputFormat,
        status: relay.status,
        startTime: relay.startTime,
        uptime: Date.now() - relay.startTime,
        error: relay.error
      };
    }
    
    // Return all relays
    const status = {
      isRunning: this.isRunning,
      activeRelays: this.activeRelays.size,
      relays: {}
    };
    
    for (const [id, relay] of this.activeRelays) {
      status.relays[id] = this.getRelayStatus(id);
    }
    
    return status;
  }

  /**
   * Get stream URLs for a camera
   */
  getStreamUrls(cameraId) {
    const baseUrl = process.env.PUBLIC_URL || 'https://api.aiconstructpro.com';
    
    return {
      hls: `${baseUrl}/v380-streams/hls/${cameraId}/index.m3u8`,
      rtsp: `rtsp://api.aiconstructpro.com:${config.ports.rtsp}/${cameraId}`,
      webrtc: `${baseUrl}/v380-streams/webrtc/${cameraId}.webm`
    };
  }
}

module.exports = V380StreamRelay;
