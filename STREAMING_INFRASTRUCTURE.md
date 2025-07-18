# SiteGuard Video Streaming Infrastructure

## Overview

This document describes the comprehensive video streaming infrastructure implemented for SiteGuard, which provides real-time RTSP-to-WebRTC/HLS streaming capabilities for construction site monitoring cameras.

## Architecture

### Components

1. **Media Server** (`media-server/server.js`)
   - Node.js-based streaming server
   - RTSP ingestion and conversion
   - WebRTC signaling server
   - HLS streaming support
   - Stream health monitoring

2. **WebRTC Client** (`src/lib/webrtc-client.ts`)
   - Browser-based WebRTC implementation
   - Low-latency streaming
   - Automatic reconnection
   - Stream statistics

3. **HLS Client** (`src/lib/hls-client.ts`)
   - HTTP Live Streaming support
   - Browser compatibility fallback
   - Adaptive bitrate streaming
   - Buffer management

4. **Video Streaming Service** (`src/lib/video-streaming-service.ts`)
   - Unified streaming interface
   - Automatic protocol selection
   - Fallback mechanisms
   - Stream management

## Features

### ✅ Implemented Features

- **RTSP-to-WebRTC Gateway**: Real-time conversion of RTSP camera feeds to WebRTC
- **HLS Fallback**: HTTP Live Streaming for browsers without WebRTC support
- **Automatic Protocol Selection**: Chooses optimal streaming protocol based on browser capabilities
- **Stream Health Monitoring**: Real-time monitoring of stream quality and connection status
- **Multi-Camera Support**: Concurrent streaming from multiple cameras
- **Codec Support**: H.264, H.265, VP8 codec support with browser compatibility
- **Quality Profiles**: Low, medium, high quality streaming options
- **Error Recovery**: Automatic retry and reconnection mechanisms
- **Stream Statistics**: Real-time bitrate, FPS, resolution, and latency metrics

### 🔧 Configuration

The media server supports extensive configuration through `media-server/config.js`:

- **Camera Types**: V380, ONVIF, Hikvision, Dahua camera profiles
- **Quality Profiles**: Configurable video/audio quality settings
- **Network Settings**: STUN servers, ICE configuration
- **Storage Options**: Recording paths, retention policies
- **Security Settings**: Authentication, CORS, API keys

## Installation & Setup

### Prerequisites

- Node.js 16+ 
- FFmpeg installed and accessible in PATH
- Modern web browser with WebRTC support

### Installation

```bash
# Install dependencies
npm install

# Start media server (in separate terminal)
npm run media-server

# Start React application
npm run dev:client

# Or start both together
npm run dev
```

### Testing

```bash
# Test streaming infrastructure
npm run test:streaming
```

## Usage

### Frontend Integration

```typescript
import { VideoStreamingService } from '@/lib/video-streaming-service';

const streamingService = new VideoStreamingService({
  cameraId: 'camera-001',
  rtspUrl: 'rtsp://192.168.1.100:554/stream1',
  username: 'admin',
  password: 'password',
  preferredProtocol: 'auto'
});

// Start streaming
await streamingService.startStream(videoElement);

// Monitor stream statistics
streamingService.onStats((stats) => {
  console.log(`Bitrate: ${stats.bitrate}kbps, FPS: ${stats.fps}`);
});

// Handle errors
streamingService.onError((error) => {
  console.error('Streaming error:', error);
});
```

### Camera Configuration

The system supports multiple camera types with automatic configuration:

```javascript
// V380 Pro cameras
const v380Config = {
  rtspUrl: 'rtsp://192.168.1.100:554/stream1',
  username: 'admin',
  password: 'password'
};

// ONVIF cameras
const onvifConfig = {
  rtspUrl: 'rtsp://192.168.1.101:554/onvif1',
  username: 'admin',
  password: 'admin'
};
```

## API Endpoints

### Media Server API

- `POST /api/streams/:cameraId/start` - Start camera stream
- `POST /api/streams/:streamKey/stop` - Stop stream
- `GET /api/streams` - List active streams
- `GET /api/streams/:streamKey/health` - Get stream health

### WebRTC Signaling

- `WS ws://localhost:8001/webrtc/:streamKey` - WebRTC signaling

### HLS Streaming

- `GET http://localhost:8000/live/:streamKey/index.m3u8` - HLS playlist

## Browser Compatibility

| Browser | WebRTC | HLS | Status |
|---------|--------|-----|--------|
| Chrome 80+ | ✅ | ✅ | Full Support |
| Firefox 75+ | ✅ | ✅ | Full Support |
| Safari 14+ | ✅ | ✅ | Full Support |
| Edge 80+ | ✅ | ✅ | Full Support |
| Mobile Safari | ✅ | ✅ | Full Support |
| Mobile Chrome | ✅ | ✅ | Full Support |

## Performance Characteristics

### WebRTC Mode
- **Latency**: 100-500ms
- **Bandwidth**: 500kbps - 3Mbps (configurable)
- **CPU Usage**: Low (hardware acceleration)
- **Best For**: Real-time monitoring, interactive applications

### HLS Mode
- **Latency**: 2-10 seconds
- **Bandwidth**: 500kbps - 5Mbps (adaptive)
- **CPU Usage**: Very Low
- **Best For**: Recording playback, mobile devices

## Troubleshooting

### Common Issues

1. **Stream Not Starting**
   - Check RTSP URL and credentials
   - Verify camera is accessible on network
   - Check FFmpeg installation

2. **High Latency**
   - Switch to WebRTC mode
   - Reduce video quality
   - Check network conditions

3. **Connection Drops**
   - Enable auto-reconnection
   - Check network stability
   - Verify camera power supply

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm run media-server
```

## Security Considerations

- **Authentication**: Implement proper camera credential management
- **Network Security**: Use VPN (ZeroTier) for remote access
- **HTTPS**: Enable HTTPS for production deployments
- **API Security**: Implement API key authentication
- **Stream Encryption**: Consider SRTP for sensitive environments

## Scalability

### Current Limits
- **Concurrent Streams**: 10 per server instance
- **Bandwidth**: Limited by server network capacity
- **Storage**: Configurable retention policies

### Scaling Options
- **Horizontal Scaling**: Multiple media server instances
- **Load Balancing**: Distribute streams across servers
- **CDN Integration**: Use CDN for HLS delivery
- **Cloud Deployment**: AWS/Azure media services integration

## Future Enhancements

- [ ] WebRTC recording capabilities
- [ ] Advanced motion detection integration
- [ ] AI-powered video analytics
- [ ] Mobile app support
- [ ] Cloud storage integration
- [ ] Advanced codec support (AV1, VP9)
- [ ] Adaptive bitrate streaming
- [ ] Multi-language audio support

## Support

For technical support or questions about the video streaming infrastructure:

1. Check the troubleshooting section above
2. Run the test suite: `npm run test:streaming`
3. Review server logs for error messages
4. Verify network connectivity and camera accessibility
