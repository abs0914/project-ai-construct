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
  origin: config.security.allowedOrigins
}));
app.use(express.json());

// Store active streams and their health
const activeStreams = new Map();
const streamHealth = new Map();
const streamRetries = new Map();

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
    
    activeStreams.set(testStreamKey, {
      cameraId: 'test',
      rtspUrl: testRtspUrl,
      rtmpUrl,
      hlsUrl: `http://localhost:8000/live/${testStreamKey}/index.m3u8`,
      webrtcUrl: `ws://localhost:8001/webrtc/${testStreamKey}`,
      process: ffmpegProcess,
      startTime: new Date(),
      status: 'starting'
    });

    res.json({
      success: true,
      streamKey: testStreamKey,
      message: 'Test stream started with Big Buck Bunny',
      urls: {
        hls: `http://localhost:8000/live/${testStreamKey}/index.m3u8`,
        webrtc: `ws://localhost:8001/webrtc/${testStreamKey}`
      }
    });
  } catch (error) {
    log.error(`Test stream failed: ${error.message}`);
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
    
    activeStreams.set(streamKey, {
      cameraId,
      rtspUrl,
      rtmpUrl,
      hlsUrl: `http://localhost:8000/live/${streamKey}/index.m3u8`,
      webrtcUrl: `ws://localhost:8001/webrtc/${streamKey}`,
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
        hls: `http://localhost:8000/live/${streamKey}/index.m3u8`,
        webrtc: `ws://localhost:8001/webrtc/${streamKey}`
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

// Enhanced RTSP to RTMP conversion function with detailed logging
function startRTSPToRTMP(rtspUrl, rtmpUrl, username, password, quality = 'medium') {
  const authUrl = username && password
    ? rtspUrl.replace('rtsp://', `rtsp://${username}:${password}@`)
    : rtspUrl;

  const logSafeUrl = authUrl.replace(/\/\/.*:.*@/, '//***:***@');
  log.info(`🎬 Starting RTSP to RTMP conversion: ${logSafeUrl} -> ${rtmpUrl} (Quality: ${quality})`);

  const ffmpegOptions = config.getFFmpegOptions(authUrl, 'rtmp', quality);
  const streamKey = rtmpUrl.split('/').pop();

  const ffmpegProcess = ffmpeg(authUrl)
    .inputOptions(ffmpegOptions.input)
    .outputOptions(ffmpegOptions.output)
    .output(rtmpUrl)
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
  // In a real implementation, this would set up WebRTC peer connection
  // For now, we'll send back a mock answer
  const answer = {
    type: 'answer',
    sdp: 'mock-sdp-answer'
  };
  
  ws.send(JSON.stringify({
    type: 'answer',
    answer: answer
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

// Start servers
nms.run();
server.listen(config.ports.api, () => {
  log.info(`Media Server API running on port ${config.ports.api}`);
  log.info(`RTMP Server running on port ${config.ports.rtmp}`);
  log.info(`HTTP Media Server running on port ${config.ports.http}`);
  log.info(`WebRTC Signaling Server running on port ${config.ports.webrtc}`);
  log.info('Video streaming infrastructure ready');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down media server...');
  
  // Stop all active streams
  for (const [streamKey, stream] of activeStreams.entries()) {
    if (stream.process) {
      stream.process.kill('SIGTERM');
    }
  }
  
  nms.stop();
  server.close();
  wss.close();
  process.exit(0);
});
