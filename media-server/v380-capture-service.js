const net = require('net');
const dgram = require('dgram');
const EventEmitter = require('events');
const { spawn } = require('child_process');
const config = require('./config');

/**
 * V380 Stream Capture Service
 * Interfaces with V380 PC software to capture and relay video streams
 */
class V380CaptureService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      ...config.cameras.v380,
      ...options
    };
    
    this.activeCaptures = new Map();
    this.relayServers = new Map();
    this.isRunning = false;
    
    // Bind methods
    this.startCapture = this.startCapture.bind(this);
    this.stopCapture = this.stopCapture.bind(this);
  }

  /**
   * Start the V380 capture service
   */
  async start() {
    if (this.isRunning) {
      console.log('V380 Capture Service already running');
      return;
    }

    try {
      console.log('Starting V380 Capture Service...');
      
      // Initialize capture server
      await this.initializeCaptureServer();
      
      // Initialize relay server
      await this.initializeRelayServer();
      
      this.isRunning = true;
      this.emit('started');
      
      console.log('✅ V380 Capture Service started successfully');
      console.log(`📡 Capture server listening on port ${this.config.pcSoftware.capturePort}`);
      console.log(`🔄 Relay server listening on port ${this.config.pcSoftware.relayPort}`);
      
    } catch (error) {
      console.error('❌ Failed to start V380 Capture Service:', error);
      throw error;
    }
  }

  /**
   * Stop the V380 capture service
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping V380 Capture Service...');

    // Stop all active captures
    for (const [cameraId, capture] of this.activeCaptures) {
      await this.stopCapture(cameraId);
    }

    // Close servers
    if (this.captureServer) {
      this.captureServer.close();
      this.captureServer = null;
    }

    if (this.relayServer) {
      this.relayServer.close();
      this.relayServer = null;
    }

    // Close relay servers
    for (const [port, server] of this.relayServers) {
      server.close();
    }
    this.relayServers.clear();

    this.isRunning = false;
    this.emit('stopped');

    console.log('✅ V380 Capture Service stopped');
  }

  /**
   * Initialize the capture server to receive streams from V380 PC software
   */
  async initializeCaptureServer() {
    return new Promise((resolve, reject) => {
      const server = net.createServer((socket) => {
        console.log('📥 V380 PC software connected:', socket.remoteAddress);
        
        socket.on('data', (data) => {
          this.handleV380Data(socket, data);
        });
        
        socket.on('error', (error) => {
          console.error('V380 socket error:', error);
        });
        
        socket.on('close', () => {
          console.log('📤 V380 PC software disconnected');
        });
      });
      
      server.listen(this.config.pcSoftware.capturePort, (error) => {
        if (error) {
          reject(error);
        } else {
          this.captureServer = server;
          resolve();
        }
      });
    });
  }

  /**
   * Initialize the relay server to provide streams to clients
   */
  async initializeRelayServer() {
    return new Promise((resolve, reject) => {
      const server = net.createServer((socket) => {
        console.log('🔗 Client connected to relay:', socket.remoteAddress);
        
        socket.on('data', (data) => {
          this.handleRelayRequest(socket, data);
        });
        
        socket.on('error', (error) => {
          console.error('Relay socket error:', error);
        });
        
        socket.on('close', () => {
          console.log('🔌 Client disconnected from relay');
        });
      });
      
      server.listen(this.config.pcSoftware.relayPort, (error) => {
        if (error) {
          reject(error);
        } else {
          this.relayServer = server;
          resolve();
        }
      });
    });
  }

  /**
   * Handle incoming data from V380 PC software
   */
  handleV380Data(socket, data) {
    try {
      // Parse V380 protocol data
      const packet = this.parseV380Packet(data);
      
      if (packet.type === 'video') {
        this.handleVideoData(packet);
      } else if (packet.type === 'audio') {
        this.handleAudioData(packet);
      } else if (packet.type === 'control') {
        this.handleControlData(packet);
      }
      
    } catch (error) {
      console.error('Error handling V380 data:', error);
    }
  }

  /**
   * Parse V380 protocol packet
   */
  parseV380Packet(data) {
    // V380 protocol packet structure (simplified)
    // [Header: 4 bytes][Type: 1 byte][Length: 4 bytes][Data: variable][Checksum: 2 bytes]
    
    if (data.length < 11) {
      throw new Error('Invalid V380 packet: too short');
    }
    
    const header = data.readUInt32BE(0);
    const type = data.readUInt8(4);
    const length = data.readUInt32BE(5);
    const payload = data.slice(9, 9 + length);
    const checksum = data.readUInt16BE(9 + length);
    
    // Verify header
    if (header !== 0x56333830) { // "V380" in hex
      throw new Error('Invalid V380 packet header');
    }
    
    // Verify checksum (simple XOR checksum)
    let calculatedChecksum = 0;
    for (let i = 0; i < payload.length; i++) {
      calculatedChecksum ^= payload[i];
    }
    
    if (calculatedChecksum !== checksum) {
      console.warn('V380 packet checksum mismatch');
    }
    
    return {
      type: this.getPacketType(type),
      length,
      data: payload,
      timestamp: Date.now()
    };
  }

  /**
   * Get packet type from type byte
   */
  getPacketType(typeByte) {
    switch (typeByte) {
      case 0x01: return 'video';
      case 0x02: return 'audio';
      case 0x03: return 'control';
      case 0x04: return 'heartbeat';
      default: return 'unknown';
    }
  }

  /**
   * Handle video data packet
   */
  handleVideoData(packet) {
    // Process video data and relay to connected clients
    this.emit('videoData', packet);
    
    // Forward to relay clients
    this.relayToClients('video', packet.data);
  }

  /**
   * Handle audio data packet
   */
  handleAudioData(packet) {
    // Process audio data and relay to connected clients
    this.emit('audioData', packet);
    
    // Forward to relay clients
    this.relayToClients('audio', packet.data);
  }

  /**
   * Handle control data packet
   */
  handleControlData(packet) {
    // Process control commands (PTZ, settings, etc.)
    this.emit('controlData', packet);
  }

  /**
   * Relay data to connected clients
   */
  relayToClients(type, data) {
    // Implementation for relaying data to connected clients
    // This would typically involve converting to RTSP/HLS format
    console.log(`Relaying ${type} data: ${data.length} bytes`);
  }

  /**
   * Handle relay requests from clients
   */
  handleRelayRequest(socket, data) {
    try {
      const request = data.toString().trim();
      console.log('Relay request:', request);
      
      if (request.startsWith('GET_STREAM')) {
        const cameraId = request.split(' ')[1];
        this.startStreamRelay(socket, cameraId);
      }
      
    } catch (error) {
      console.error('Error handling relay request:', error);
    }
  }

  /**
   * Start stream relay for a specific camera
   */
  startStreamRelay(socket, cameraId) {
    console.log(`Starting stream relay for camera: ${cameraId}`);
    
    // Send RTSP-like response
    const response = [
      'RTSP/1.0 200 OK',
      'Content-Type: application/sdp',
      'Content-Length: 0',
      '',
      ''
    ].join('\r\n');
    
    socket.write(response);
    
    // Start streaming data to this socket
    this.addRelayClient(socket, cameraId);
  }

  /**
   * Add a relay client for a camera
   */
  addRelayClient(socket, cameraId) {
    if (!this.relayClients) {
      this.relayClients = new Map();
    }
    
    if (!this.relayClients.has(cameraId)) {
      this.relayClients.set(cameraId, new Set());
    }
    
    this.relayClients.get(cameraId).add(socket);
    
    socket.on('close', () => {
      this.relayClients.get(cameraId)?.delete(socket);
    });
  }

  /**
   * Start capturing from a V380 camera
   */
  async startCapture(cameraId, options = {}) {
    if (this.activeCaptures.has(cameraId)) {
      console.log(`Capture already active for camera: ${cameraId}`);
      return;
    }

    console.log(`Starting V380 capture for camera: ${cameraId}`);
    
    const captureConfig = {
      ...this.config,
      ...options,
      cameraId
    };
    
    try {
      // Create capture process
      const captureProcess = await this.createCaptureProcess(captureConfig);
      
      this.activeCaptures.set(cameraId, {
        process: captureProcess,
        config: captureConfig,
        startTime: Date.now(),
        status: 'active'
      });
      
      this.emit('captureStarted', cameraId);
      console.log(`✅ V380 capture started for camera: ${cameraId}`);
      
    } catch (error) {
      console.error(`❌ Failed to start V380 capture for camera ${cameraId}:`, error);
      throw error;
    }
  }

  /**
   * Stop capturing from a V380 camera
   */
  async stopCapture(cameraId) {
    const capture = this.activeCaptures.get(cameraId);
    if (!capture) {
      console.log(`No active capture for camera: ${cameraId}`);
      return;
    }

    console.log(`Stopping V380 capture for camera: ${cameraId}`);
    
    try {
      if (capture.process) {
        capture.process.kill('SIGTERM');
      }
      
      this.activeCaptures.delete(cameraId);
      this.emit('captureStopped', cameraId);
      
      console.log(`✅ V380 capture stopped for camera: ${cameraId}`);
      
    } catch (error) {
      console.error(`❌ Failed to stop V380 capture for camera ${cameraId}:`, error);
      throw error;
    }
  }

  /**
   * Create capture process (placeholder for actual V380 PC software integration)
   */
  async createCaptureProcess(config) {
    // This would typically interface with V380 PC software
    // For now, we'll create a mock process
    console.log('Creating V380 capture process with config:', config);
    
    return {
      kill: (signal) => {
        console.log(`Killing V380 capture process with signal: ${signal}`);
      }
    };
  }

  /**
   * Get capture status
   */
  getCaptureStatus(cameraId) {
    const capture = this.activeCaptures.get(cameraId);
    if (!capture) {
      return { status: 'inactive' };
    }
    
    return {
      status: capture.status,
      startTime: capture.startTime,
      uptime: Date.now() - capture.startTime,
      config: capture.config
    };
  }

  /**
   * Get all active captures
   */
  getActiveCaptures() {
    const captures = {};
    for (const [cameraId, capture] of this.activeCaptures) {
      captures[cameraId] = this.getCaptureStatus(cameraId);
    }
    return captures;
  }
}

module.exports = V380CaptureService;
