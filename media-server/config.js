// Media Server Configuration
const config = {
  // Server ports
  ports: {
    rtmp: 1935,
    http: 8000,
    api: 3001,
    webrtc: 8001
  },

  // FFmpeg configuration
  ffmpeg: {
    // Path to FFmpeg binary (adjust based on system)
    path: process.env.FFMPEG_PATH || '/usr/local/bin/ffmpeg',
    
    // Input options for RTSP streams
    inputOptions: [
      '-rtsp_transport', 'tcp',
      '-stimeout', '5000000',
      '-use_wallclock_as_timestamps', '1',
      '-fflags', '+genpts',
      '-avoid_negative_ts', 'make_zero'
    ],

    // Output options for different protocols
    outputOptions: {
      rtmp: [
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-c:a', 'aac',
        '-ar', '44100',
        '-b:a', '128k',
        '-f', 'flv'
      ],
      hls: [
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-tune', 'zerolatency',
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-c:a', 'aac',
        '-ar', '44100',
        '-b:a', '128k',
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '10',
        '-hls_flags', 'delete_segments+append_list'
      ],
      webrtc: [
        '-c:v', 'libvpx-vp8',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-c:a', 'libopus',
        '-ar', '48000',
        '-b:a', '128k'
      ]
    }
  },

  // Camera-specific configurations
  cameras: {
    // V380 Pro / YK-23 cameras
    'v380': {
      defaultPort: 554,
      rtspPath: '/stream1',
      supportedCodecs: ['h264', 'h265'],
      defaultCredentials: {
        username: 'admin',
        password: 'password'
      },
      capabilities: {
        ptz: true,
        nightVision: true,
        motionDetection: true,
        audioSupport: true
      }
    },

    // Generic ONVIF cameras
    'onvif': {
      defaultPort: 554,
      rtspPath: '/onvif1',
      supportedCodecs: ['h264', 'mjpeg'],
      defaultCredentials: {
        username: 'admin',
        password: 'admin'
      },
      capabilities: {
        ptz: false,
        nightVision: false,
        motionDetection: true,
        audioSupport: false
      }
    },

    // Hikvision cameras
    'hikvision': {
      defaultPort: 554,
      rtspPath: '/Streaming/Channels/101',
      supportedCodecs: ['h264', 'h265'],
      defaultCredentials: {
        username: 'admin',
        password: '12345'
      },
      capabilities: {
        ptz: true,
        nightVision: true,
        motionDetection: true,
        audioSupport: true
      }
    },

    // Dahua cameras
    'dahua': {
      defaultPort: 554,
      rtspPath: '/cam/realmonitor?channel=1&subtype=0',
      supportedCodecs: ['h264', 'h265'],
      defaultCredentials: {
        username: 'admin',
        password: 'admin'
      },
      capabilities: {
        ptz: true,
        nightVision: true,
        motionDetection: true,
        audioSupport: true
      }
    }
  },

  // Streaming quality profiles
  qualityProfiles: {
    low: {
      video: {
        width: 640,
        height: 480,
        bitrate: '500k',
        fps: 15
      },
      audio: {
        bitrate: '64k',
        sampleRate: 22050
      }
    },
    medium: {
      video: {
        width: 1280,
        height: 720,
        bitrate: '1500k',
        fps: 25
      },
      audio: {
        bitrate: '128k',
        sampleRate: 44100
      }
    },
    high: {
      video: {
        width: 1920,
        height: 1080,
        bitrate: '3000k',
        fps: 30
      },
      audio: {
        bitrate: '192k',
        sampleRate: 48000
      }
    }
  },

  // WebRTC configuration
  webrtc: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ],
    sdpSemantics: 'unified-plan'
  },

  // Storage configuration
  storage: {
    mediaRoot: './media',
    recordingsPath: './recordings',
    maxDiskUsage: '10GB', // Maximum disk usage for recordings
    retentionDays: 7, // Days to keep recordings
    cleanupInterval: 3600000 // Cleanup interval in milliseconds (1 hour)
  },

  // Monitoring and health check configuration
  monitoring: {
    healthCheckInterval: 5000, // Health check interval in milliseconds
    streamTimeoutMs: 30000, // Stream timeout in milliseconds
    maxRetries: 3, // Maximum retry attempts for failed streams
    retryDelayMs: 5000 // Delay between retry attempts
  },

  // Security configuration
  security: {
    enableAuth: false, // Enable authentication for API endpoints
    apiKey: process.env.MEDIA_SERVER_API_KEY || 'your-api-key-here',
    allowedOrigins: [
      'https://aiconstructpro.com',
      'https://www.aiconstructpro.com',
      'https://preview--project-ai-construct.lovable.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ], // CORS allowed origins
    maxConcurrentStreams: 10 // Maximum concurrent streams per server
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableFileLogging: true,
    logFilePath: './logs/media-server.log',
    maxLogFileSize: '10MB',
    maxLogFiles: 5
  }
};

// Helper functions
config.getCameraConfig = function(cameraType) {
  return this.cameras[cameraType] || this.cameras['onvif'];
};

config.getQualityProfile = function(quality) {
  return this.qualityProfiles[quality] || this.qualityProfiles['medium'];
};

config.buildRtspUrl = function(ip, port, path, username, password) {
  const auth = username && password ? `${username}:${password}@` : '';
  return `rtsp://${auth}${ip}:${port}${path}`;
};

config.getFFmpegOptions = function(inputUrl, outputType, quality = 'medium') {
  const profile = this.getQualityProfile(quality);
  const baseOptions = [...this.ffmpeg.outputOptions[outputType]];
  
  // Add quality-specific options
  if (profile.video) {
    baseOptions.push('-s', `${profile.video.width}x${profile.video.height}`);
    baseOptions.push('-b:v', profile.video.bitrate);
    baseOptions.push('-r', profile.video.fps.toString());
  }
  
  if (profile.audio) {
    baseOptions.push('-b:a', profile.audio.bitrate);
    baseOptions.push('-ar', profile.audio.sampleRate.toString());
  }
  
  return {
    input: this.ffmpeg.inputOptions,
    output: baseOptions
  };
};

module.exports = config;
