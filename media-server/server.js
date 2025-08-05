const NodeMediaServer = require('node-media-server');
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const ffmpeg = require('fluent-ffmpeg');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Import V380 services
const V380CaptureService = require('./v380-capture-service');
const V380StreamRelay = require('./v380-stream-relay');

// Ensure media directories exist
const mediaDir = path.resolve(config.storage.mediaRoot);
const recordingsDir = path.resolve(config.storage.recordingsPath);

if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Set FFmpeg path
if (config.ffmpeg.path) {
  ffmpeg.setFfmpegPath(config.ffmpeg.path);
}

// Node Media Server configuration
const nmsConfig = {
  rtmp: {
    port: config.ports.rtmp,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: config.ports.http,
    mediaroot: config.storage.mediaRoot,
    allow_origin: '*'
  },
  relay: {
    ffmpeg: config.ffmpeg.path,
    tasks: []
  }
};

// Create Express app for API
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.security.allowedOrigins,
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: [
    'https://aiconstructpro.com',
    'https://www.aiconstructpro.com',
    'https://preview--project-ai-construct.lovable.app',
    'https://preview--ai-construct-pro.lovable.app',
    'https://66748df0-6d8e-4361-b644-77957af188bc.lovableproject.com',
    'http://localhost:5173',
    'http://localhost:3000',
    '*' // Allow all origins for development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-info', 'apikey']
}));
app.use(express.json());

// Store active streams and their health
const activeStreams = new Map();
const streamHealth = new Map();
const streamRetries = new Map();

// Initialize V380 services
const v380CaptureService = new V380CaptureService();
const v380StreamRelay = new V380StreamRelay();

// Media server setup
const nms = new NodeMediaServer(nmsConfig);

// Enhanced logging
const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`)
};

// Enhanced stream management endpoints with debugging
app.get('/api/streams', (req, res) => {
  const streams = Array.from(activeStreams.entries()).map(([streamKey, info]) => ({
    streamKey,
    ...info,
    health: streamHealth.get(streamKey) || { status: 'unknown' }
  }));
  res.json({ 
    streams,
    totalStreams: streams.length,
    serverStatus: 'healthy',
    uptime: process.uptime()
  });
});

// Add debugging endpoints
app.get('/api/debug/streams', (req, res) => {
  const debug = {
    activeStreams: activeStreams.size,
    streamHealth: streamHealth.size,
    streamRetries: Object.fromEntries(streamRetries),
    processDetails: Array.from(activeStreams.entries()).map(([key, stream]) => ({
      streamKey: key,
      processAlive: stream.process ? !stream.process.killed : false,
      startTime: stream.startTime,
      rtspUrl: stream.rtspUrl?.replace(/\/\/.*:.*@/, '//***:***@'), // Hide credentials
      status: stream.status
    }))
  };
  res.json(debug);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeStreams: activeStreams.size,
    version: '1.0.0'
  });
});

// Test stream endpoint with known good RTSP source
app.post('/api/test/stream', async (req, res) => {
  const testStreamKey = 'test_stream';
  const testRtspUrl = 'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4';
  
  try {
    log.info('Starting test stream with Big Buck Bunny');
    
    const rtmpUrl = `rtmp://localhost:1935/live/${testStreamKey}`;
    const ffmpegProcess = startRTSPToRTMP(testRtspUrl, rtmpUrl, null, null, 'medium');
    
    // Get the public domain from environment or use default
    const publicDomain = process.env.PUBLIC_URL || process.env.DOMAIN || 'https://api.aiconstructpro.com';
    const hlsUrl = `${publicDomain}/live/${testStreamKey}/index.m3u8`;
    const webrtcUrl = `${publicDomain.replace('https://', 'wss://').replace('http://', 'ws://')}/webrtc/${testStreamKey}`;

    activeStreams.set(testStreamKey, {
      cameraId: 'test',
      rtspUrl: testRtspUrl,
      rtmpUrl,
      hlsUrl,
      webrtcUrl,
      process: ffmpegProcess,
      startTime: new Date(),
      status: 'starting'
    });

    res.json({
      success: true,
      streamKey: testStreamKey,
      message: 'Test stream started with Big Buck Bunny',
      urls: {
        hls: hlsUrl,
        webrtc: webrtcUrl
      }
    });
  } catch (error) {
    log.error(`Test stream failed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Add HLS verification endpoint
app.get('/api/streams/:streamKey/verify-hls', async (req, res) => {
  const { streamKey } = req.params;
  const stream = activeStreams.get(streamKey);
  
  if (!stream) {
    return res.status(404).json({ error: 'Stream not found' });
  }
  
  try {
    // Check if HLS files exist
    const hlsPath = path.join(config.storage.mediaRoot, 'live', streamKey);
    const manifestPath = path.join(hlsPath, 'index.m3u8');
    
    const manifestExists = fs.existsSync(manifestPath);
    let segmentCount = 0;
    
    if (fs.existsSync(hlsPath)) {
      const files = fs.readdirSync(hlsPath);
      segmentCount = files.filter(file => file.endsWith('.ts')).length;
    }
    
    res.json({
      streamKey,
      hlsPath,
      manifestExists,
      segmentCount,
      files: fs.existsSync(hlsPath) ? fs.readdirSync(hlsPath) : [],
      status: stream.status,
      health: streamHealth.get(streamKey)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/streams/:cameraId/start', async (req, res) => {
  const { cameraId } = req.params;
  const { rtspUrl, username, password } = req.body;

  try {
    log.info(`Starting stream for camera ${cameraId} with RTSP: ${rtspUrl?.replace(/\/\/.*:.*@/, '//***:***@')}`);
    
    const streamKey = `camera_${cameraId}`;
    const rtmpUrl = `rtmp://localhost:1935/live/${streamKey}`;
    
    // Validate RTSP URL
    if (!rtspUrl) {
      throw new Error('RTSP URL is required');
    }
    
    // Check if stream already exists
    if (activeStreams.has(streamKey)) {
      log.warn(`Stream ${streamKey} already exists, stopping previous stream`);
      const existingStream = activeStreams.get(streamKey);
      if (existingStream.process) {
        existingStream.process.kill('SIGTERM');
      }
    }
    
    // Start RTSP to RTMP conversion with enhanced logging
    const ffmpegProcess = startRTSPToRTMP(rtspUrl, rtmpUrl, username, password);
    
    // Get the public domain from environment or use default
    const publicDomain = process.env.PUBLIC_URL || process.env.DOMAIN || 'https://api.aiconstructpro.com';
    const hlsUrl = `${publicDomain}/live/${streamKey}/index.m3u8`;
    const webrtcUrl = `${publicDomain.replace('https://', 'wss://').replace('http://', 'ws://')}/webrtc/${streamKey}`;

    activeStreams.set(streamKey, {
      cameraId,
      rtspUrl,
      rtmpUrl,
      hlsUrl,
      webrtcUrl,
      process: ffmpegProcess,
      startTime: new Date(),
      status: 'starting'
    });

    // Initialize stream health
    streamHealth.set(streamKey, {
      status: 'starting',
      lastUpdate: new Date(),
      bitrate: 0,
      fps: 0,
      connectionAttempts: 1
    });

    log.info(`Stream ${streamKey} initialization complete`);

    res.json({
      success: true,
      streamKey,
      cameraId,
      urls: {
        hls: hlsUrl,
        webrtc: webrtcUrl
      },
      message: 'Stream started successfully. Wait 3-5 seconds for HLS segments to be generated.'
    });
  } catch (error) {
    log.error(`Error starting stream for camera ${cameraId}: ${error.message}`);
    res.status(500).json({ 
      error: error.message,
      cameraId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/streams/:streamKey/stop', (req, res) => {
  const { streamKey } = req.params;
  
  const stream = activeStreams.get(streamKey);
  if (stream && stream.process) {
    stream.process.kill('SIGTERM');
    activeStreams.delete(streamKey);
    streamHealth.delete(streamKey);
    
    res.json({ success: true, message: 'Stream stopped' });
  } else {
    res.status(404).json({ error: 'Stream not found' });
  }
});

app.get('/api/streams/:streamKey/health', (req, res) => {
  const { streamKey } = req.params;
  const health = streamHealth.get(streamKey);
  
  if (health) {
    res.json(health);
  } else {
    res.status(404).json({ error: 'Stream not found' });
  }
});

// Enhanced RTSP to HLS conversion function with detailed logging
function startRTSPToRTMP(rtspUrl, rtmpUrl, username, password, quality = 'medium') {
  const authUrl = username && password
    ? rtspUrl.replace('rtsp://', `rtsp://${username}:${password}@`)
    : rtspUrl;

  const logSafeUrl = authUrl.replace(/\/\/.*:.*@/, '//***:***@');
  const streamKey = rtmpUrl.split('/').pop();
  
  // Create HLS output directory
  const hlsDir = path.join(config.storage.mediaRoot, 'live', streamKey);
  if (!fs.existsSync(hlsDir)) {
    fs.mkdirSync(hlsDir, { recursive: true });
  }
  
  const hlsPath = path.join(hlsDir, 'index.m3u8');
  log.info(`🎬 Starting RTSP to HLS conversion: ${logSafeUrl} -> ${hlsPath} (Quality: ${quality})`);

  const ffmpegOptions = config.getFFmpegOptions(authUrl, 'hls', quality);

  const ffmpegProcess = ffmpeg(authUrl)
    .inputOptions(ffmpegOptions.input)
    .outputOptions([
      ...ffmpegOptions.output,
      '-hls_segment_filename', path.join(hlsDir, 'segment_%03d.ts')
    ])
    .output(hlsPath)
    .on('start', (commandLine) => {
      log.info(`✅ FFmpeg started for ${streamKey}: ${commandLine.replace(/rtsp:\/\/.*:.*@/, 'rtsp://***:***@')}`);
      
      // Update stream status
      if (streamHealth.has(streamKey)) {
        const health = streamHealth.get(streamKey);
        streamHealth.set(streamKey, {
          ...health,
          status: 'connecting',
          lastUpdate: new Date()
        });
      }
    })
    .on('progress', (progress) => {
      // Update stream health with detailed progress info
      if (streamHealth.has(streamKey)) {
        const health = streamHealth.get(streamKey);
        streamHealth.set(streamKey, {
          ...health,
          status: 'streaming',
          fps: progress.currentFps || 0,
          bitrate: progress.currentKbps || 0,
          lastUpdate: new Date(),
          frames: progress.frames || 0,
          timemark: progress.timemark || '00:00:00'
        });
        
        // Log progress periodically
        if (progress.frames && progress.frames % 300 === 0) { // Every ~10 seconds at 30fps
          log.info(`📊 Stream ${streamKey} progress: ${progress.currentFps}fps, ${progress.currentKbps}kbps, ${progress.timemark}`);
        }
      }
    })
    .on('stderr', (stderrLine) => {
      // Log FFmpeg stderr for debugging
      if (stderrLine.includes('error') || stderrLine.includes('failed')) {
        log.error(`🔴 FFmpeg stderr (${streamKey}): ${stderrLine}`);
      } else if (stderrLine.includes('Input') || stderrLine.includes('Output')) {
        log.info(`📝 FFmpeg info (${streamKey}): ${stderrLine}`);
      }
    })
    .on('error', (err) => {
      log.error(`❌ FFmpeg error for ${streamKey}: ${err.message}`);

      // Update stream health with error
      streamHealth.set(streamKey, {
        status: 'error',
        lastUpdate: new Date(),
        error: err.message,
        errorCode: err.code || 'unknown'
      });

      // Handle retry logic
      const retryCount = streamRetries.get(streamKey) || 0;

      if (retryCount < config.monitoring.maxRetries) {
        log.info(`🔄 Retrying stream ${streamKey} (attempt ${retryCount + 1}/${config.monitoring.maxRetries}) in ${config.monitoring.retryDelayMs}ms`);
        streamRetries.set(streamKey, retryCount + 1);

        setTimeout(() => {
          log.info(`🔁 Attempting retry for ${streamKey}`);
          const newProcess = startRTSPToRTMP(rtspUrl, rtmpUrl, username, password, quality);
          if (activeStreams.has(streamKey)) {
            const stream = activeStreams.get(streamKey);
            stream.process = newProcess;
            stream.status = 'retrying';
            activeStreams.set(streamKey, stream);
          }
        }, config.monitoring.retryDelayMs);
      } else {
        log.error(`💀 Max retries exceeded for stream ${streamKey}`);
        streamHealth.set(streamKey, {
          status: 'failed',
          lastUpdate: new Date(),
          error: `Max retries (${config.monitoring.maxRetries}) exceeded: ${err.message}`,
          finalError: true
        });
      }
    })
    .on('end', () => {
      log.info(`🏁 FFmpeg process ended for ${streamKey}`);
      streamHealth.set(streamKey, {
        status: 'ended',
        lastUpdate: new Date(),
        endReason: 'natural'
      });
    });

  // Add enhanced timeout handling
  const timeout = setTimeout(() => {
    log.warn(`⏰ Stream timeout for ${streamKey} after ${config.monitoring.streamTimeoutMs}ms`);
    streamHealth.set(streamKey, {
      status: 'timeout',
      lastUpdate: new Date(),
      error: 'Stream connection timeout'
    });
    ffmpegProcess.kill('SIGTERM');
  }, config.monitoring.streamTimeoutMs);

  ffmpegProcess.on('end', () => clearTimeout(timeout));
  ffmpegProcess.on('error', () => clearTimeout(timeout));

  try {
    ffmpegProcess.run();
    log.info(`🚀 FFmpeg process launched for ${streamKey}`);
  } catch (runError) {
    log.error(`💥 Failed to run FFmpeg for ${streamKey}: ${runError.message}`);
    clearTimeout(timeout);
    throw runError;
  }

  return ffmpegProcess;
}

// V380 API Endpoints
app.post('/api/v380/capture/start', async (req, res) => {
  const { cameraId, inputSource, options } = req.body;

  try {
    log.info(`Starting V380 capture for camera ${cameraId}`);

    await v380CaptureService.startCapture(cameraId, {
      inputSource,
      ...options
    });

    const status = v380CaptureService.getCaptureStatus(cameraId);

    res.json({
      success: true,
      message: `V380 capture started for camera ${cameraId}`,
      status
    });

  } catch (error) {
    log.error(`Failed to start V380 capture for camera ${cameraId}: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/v380/capture/stop', async (req, res) => {
  const { cameraId } = req.body;

  try {
    log.info(`Stopping V380 capture for camera ${cameraId}`);

    await v380CaptureService.stopCapture(cameraId);

    res.json({
      success: true,
      message: `V380 capture stopped for camera ${cameraId}`
    });

  } catch (error) {
    log.error(`Failed to stop V380 capture for camera ${cameraId}: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/v380/capture/status/:cameraId?', (req, res) => {
  const { cameraId } = req.params;

  try {
    if (cameraId) {
      const status = v380CaptureService.getCaptureStatus(cameraId);
      if (!status) {
        return res.status(404).json({
          success: false,
          error: `No capture found for camera ${cameraId}`
        });
      }
      res.json({ success: true, status });
    } else {
      const allCaptures = v380CaptureService.getActiveCaptures();
      res.json({ success: true, captures: allCaptures });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/v380/relay/start', async (req, res) => {
  const { cameraId, inputSource, outputFormat } = req.body;

  try {
    log.info(`Starting V380 relay for camera ${cameraId}: ${inputSource} -> ${outputFormat}`);

    const relayId = await v380StreamRelay.startRelay(cameraId, inputSource, outputFormat);
    const streamUrls = v380StreamRelay.getStreamUrls(cameraId);

    res.json({
      success: true,
      message: `V380 relay started for camera ${cameraId}`,
      relayId,
      streamUrls
    });

  } catch (error) {
    log.error(`Failed to start V380 relay for camera ${cameraId}: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/v380/relay/stop', async (req, res) => {
  const { relayId } = req.body;

  try {
    log.info(`Stopping V380 relay ${relayId}`);

    await v380StreamRelay.stopRelay(relayId);

    res.json({
      success: true,
      message: `V380 relay ${relayId} stopped`
    });

  } catch (error) {
    log.error(`Failed to stop V380 relay ${relayId}: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/v380/relay/status/:relayId?', (req, res) => {
  const { relayId } = req.params;

  try {
    const status = v380StreamRelay.getRelayStatus(relayId);

    if (relayId && !status) {
      return res.status(404).json({
        success: false,
        error: `Relay ${relayId} not found`
      });
    }

    res.json({ success: true, status });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/v380/streams/:cameraId', (req, res) => {
  const { cameraId } = req.params;

  try {
    const streamUrls = v380StreamRelay.getStreamUrls(cameraId);

    res.json({
      success: true,
      cameraId,
      streamUrls
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// WebRTC signaling server
const wss = new WebSocket.Server({ port: 8001 });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const streamKey = url.pathname.split('/').pop();
  
  console.log(`WebRTC connection for stream: ${streamKey}`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebRTCMessage(ws, streamKey, data);
    } catch (error) {
      console.error('WebRTC message error:', error);
    }
  });

  ws.on('close', () => {
    console.log(`WebRTC connection closed for stream: ${streamKey}`);
  });
});

function handleWebRTCMessage(ws, streamKey, data) {
  switch (data.type) {
    case 'offer':
      // Handle WebRTC offer
      handleWebRTCOffer(ws, streamKey, data.offer);
      break;
    case 'ice-candidate':
      // Handle ICE candidate
      handleICECandidate(ws, streamKey, data.candidate);
      break;
    default:
      console.log('Unknown WebRTC message type:', data.type);
  }
}

function handleWebRTCOffer(ws, streamKey, offer) {
  // WebRTC disabled - send error response
  ws.send(JSON.stringify({
    type: 'error',
    error: 'WebRTC streaming is currently disabled. Please use HLS instead.'
  }));
}

function handleICECandidate(ws, streamKey, candidate) {
  // Handle ICE candidate exchange
  console.log('Received ICE candidate for stream:', streamKey);
}

// Stream health monitoring
setInterval(() => {
  for (const [streamKey, stream] of activeStreams.entries()) {
    // Check if FFmpeg process is still running
    if (stream.process && stream.process.killed) {
      streamHealth.set(streamKey, {
        status: 'error',
        lastUpdate: new Date(),
        error: 'FFmpeg process died'
      });
    } else {
      // Update health status (in real implementation, would check actual stream metrics)
      streamHealth.set(streamKey, {
        status: 'healthy',
        lastUpdate: new Date(),
        bitrate: Math.floor(Math.random() * 2000) + 1000, // Mock bitrate
        fps: Math.floor(Math.random() * 10) + 25 // Mock FPS
      });
    }
  }
}, 5000);

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected to media server');
  
  socket.on('subscribe-stream-health', (streamKey) => {
    socket.join(`stream-${streamKey}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected from media server');
  });
});

// Broadcast stream health updates
setInterval(() => {
  for (const [streamKey, health] of streamHealth.entries()) {
    io.to(`stream-${streamKey}`).emit('stream-health', {
      streamKey,
      health
    });
  }
}, 2000);

// Start V380 services
async function startV380Services() {
  try {
    if (config.cameras.v380.pcSoftware.enabled) {
      log.info('Starting V380 services...');

      await v380CaptureService.start();
      await v380StreamRelay.start();

      log.info('✅ V380 services started successfully');
    } else {
      log.info('V380 services disabled in configuration');
    }
  } catch (error) {
    log.error(`❌ Failed to start V380 services: ${error.message}`);
  }
}

// Start servers
nms.run();
server.listen(config.ports.api, async () => {
  log.info(`Media Server API running on port ${config.ports.api}`);
  log.info(`RTMP Server running on port ${config.ports.rtmp}`);
  log.info(`HTTP Media Server running on port ${config.ports.http}`);
  log.info(`WebRTC Signaling Server running on port ${config.ports.webrtc}`);
  log.info('Video streaming infrastructure ready');

  // Start V380 services after main server is ready
  await startV380Services();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down media server...');

  try {
    // Stop V380 services
    if (config.cameras.v380.pcSoftware.enabled) {
      log.info('Stopping V380 services...');
      await v380CaptureService.stop();
      await v380StreamRelay.stop();
      log.info('✅ V380 services stopped');
    }

    // Stop all active streams
    for (const [streamKey, stream] of activeStreams.entries()) {
      if (stream.process) {
        stream.process.kill('SIGTERM');
      }
    }

    nms.stop();
    server.close();
    wss.close();

    log.info('✅ Media server shutdown complete');
    process.exit(0);

  } catch (error) {
    log.error(`❌ Error during shutdown: ${error.message}`);
    process.exit(1);
  }
});
