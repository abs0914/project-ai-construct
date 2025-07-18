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

// Stream management endpoints
app.get('/api/streams', (req, res) => {
  const streams = Array.from(activeStreams.entries()).map(([streamKey, info]) => ({
    streamKey,
    ...info,
    health: streamHealth.get(streamKey) || { status: 'unknown' }
  }));
  res.json({ streams });
});

app.post('/api/streams/:cameraId/start', async (req, res) => {
  const { cameraId } = req.params;
  const { rtspUrl, username, password } = req.body;

  try {
    const streamKey = `camera_${cameraId}`;
    const rtmpUrl = `rtmp://localhost:1935/live/${streamKey}`;
    
    // Start RTSP to RTMP conversion
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

    // Update stream health
    streamHealth.set(streamKey, {
      status: 'healthy',
      lastUpdate: new Date(),
      bitrate: 0,
      fps: 0
    });

    res.json({ 
      success: true, 
      streamKey,
      urls: {
        hls: `http://localhost:8000/live/${streamKey}/index.m3u8`,
        webrtc: `ws://localhost:8001/webrtc/${streamKey}`
      }
    });
  } catch (error) {
    console.error('Error starting stream:', error);
    res.status(500).json({ error: error.message });
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

// Enhanced RTSP to RTMP conversion function
function startRTSPToRTMP(rtspUrl, rtmpUrl, username, password, quality = 'medium') {
  const authUrl = username && password
    ? rtspUrl.replace('rtsp://', `rtsp://${username}:${password}@`)
    : rtspUrl;

  log.info(`Starting RTSP to RTMP conversion: ${authUrl} -> ${rtmpUrl} (Quality: ${quality})`);

  const ffmpegOptions = config.getFFmpegOptions(authUrl, 'rtmp', quality);

  const ffmpegProcess = ffmpeg(authUrl)
    .inputOptions(ffmpegOptions.input)
    .outputOptions(ffmpegOptions.output)
    .output(rtmpUrl)
    .on('start', (commandLine) => {
      log.info(`FFmpeg started: ${commandLine}`);
    })
    .on('progress', (progress) => {
      // Update stream health with progress info
      const streamKey = rtmpUrl.split('/').pop();
      if (streamHealth.has(streamKey)) {
        const health = streamHealth.get(streamKey);
        streamHealth.set(streamKey, {
          ...health,
          fps: progress.currentFps || 0,
          bitrate: progress.currentKbps || 0,
          lastUpdate: new Date()
        });
      }
    })
    .on('error', (err) => {
      log.error(`FFmpeg error: ${err.message}`);

      // Handle retry logic
      const streamKey = rtmpUrl.split('/').pop();
      const retryCount = streamRetries.get(streamKey) || 0;

      if (retryCount < config.monitoring.maxRetries) {
        log.info(`Retrying stream ${streamKey} (attempt ${retryCount + 1}/${config.monitoring.maxRetries})`);
        streamRetries.set(streamKey, retryCount + 1);

        setTimeout(() => {
          const newProcess = startRTSPToRTMP(rtspUrl, rtmpUrl, username, password, quality);
          if (activeStreams.has(streamKey)) {
            const stream = activeStreams.get(streamKey);
            stream.process = newProcess;
            activeStreams.set(streamKey, stream);
          }
        }, config.monitoring.retryDelayMs);
      } else {
        log.error(`Max retries exceeded for stream ${streamKey}`);
        streamHealth.set(streamKey, {
          status: 'error',
          lastUpdate: new Date(),
          error: err.message
        });
      }
    })
    .on('end', () => {
      log.info('FFmpeg process ended');
      const streamKey = rtmpUrl.split('/').pop();
      streamHealth.set(streamKey, {
        status: 'ended',
        lastUpdate: new Date()
      });
    });

  // Add timeout handling
  const timeout = setTimeout(() => {
    log.warn(`Stream timeout for ${rtmpUrl}`);
    ffmpegProcess.kill('SIGTERM');
  }, config.monitoring.streamTimeoutMs);

  ffmpegProcess.on('end', () => clearTimeout(timeout));
  ffmpegProcess.on('error', () => clearTimeout(timeout));

  ffmpegProcess.run();
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
