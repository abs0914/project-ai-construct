# V380 PC Software Integration Guide

## Overview

This guide describes the implementation of V380 PC software integration for capturing and relaying video streams from V380 cameras. The solution provides a comprehensive approach to interface with V380 PC software and convert streams to standard formats (RTSP/HLS/WebRTC).

**🌐 REMOTE NETWORK SUPPORT**: This implementation fully supports cameras outside the local network using GL.iNET routers and ZeroTier VPN, providing seamless access to remote V380 cameras with intelligent routing and automatic failover.

## Architecture

### Components

#### Core V380 Services

1. **V380 Capture Service** (`media-server/v380-capture-service.js`)
   - Interfaces with V380 PC software
   - Captures video streams using V380 protocol
   - Handles protocol-specific packet parsing
   - Manages connection lifecycle

2. **V380 Stream Relay** (`media-server/v380-stream-relay.js`)
   - Converts V380 streams to standard formats
   - Supports HLS, RTSP, and WebRTC output
   - Uses FFmpeg for stream conversion
   - Provides stream health monitoring

3. **V380 Configuration Manager** (`media-server/v380-config-manager.js`)
   - Manages camera configurations
   - Handles authentication and encryption
   - Stores protocol settings
   - Provides configuration validation

#### Remote Network Services

4. **V380 Remote Manager** (`media-server/v380-remote-manager.js`)
   - Manages V380 cameras across remote networks
   - Integrates with GL.iNET routers and ZeroTier VPN
   - Handles network discovery and connection management
   - Provides unified interface for local and remote cameras

5. **V380 Network Discovery** (`media-server/v380-network-discovery.js`)
   - Discovers V380 cameras on local and ZeroTier networks
   - Scans IP ranges and responds to V380 discovery broadcasts
   - Identifies camera capabilities and connection methods
   - Supports both UDP broadcast and targeted scanning

6. **V380 VPN Router** (`media-server/v380-vpn-router.js`)
   - Intelligent routing for V380 streams through VPN tunnels
   - Finds optimal connection paths (direct, ZeroTier, router forwarding)
   - Tests route viability and maintains routing tables
   - Provides connection health monitoring

7. **V380 Connection Fallback** (`media-server/v380-connection-fallback.js`)
   - Automatic failover to backup routes when primary fails
   - Monitors connection health and triggers fallbacks
   - Attempts to restore primary routes when available
   - Provides exponential backoff retry mechanisms

#### Frontend Integration

8. **V380 Frontend Service** (`src/lib/services/v380-service.ts`)
   - TypeScript service for frontend integration
   - Provides API wrapper functions
   - Handles stream workflow management
   - Offers connection testing

9. **V380 Setup Component** (`src/components/siteguard/V380Setup.tsx`)
   - React component for V380 configuration
   - User interface for stream management
   - Real-time status monitoring
   - Stream URL display

## Installation & Setup

### Prerequisites

- Node.js 16+
- FFmpeg installed and accessible in PATH
- V380 PC software installed and configured
- V380 cameras on the network

### Configuration

1. **Enable V380 Support in Media Server**

```javascript
// media-server/config.js
cameras: {
  'v380': {
    // ... existing config ...
    pcSoftware: {
      enabled: true,
      capturePort: 8554,
      relayPort: 8555,
      streamFormat: 'rtsp',
      maxConnections: 10,
      bufferSize: 1024 * 1024,
      reconnectInterval: 5000,
      heartbeatInterval: 30000
    },
    protocol: {
      version: '1.0',
      encryption: false,
      compression: true,
      audioEnabled: true,
      videoQuality: 'high',
      frameRate: 25,
      resolution: '1920x1080'
    }
  }
}
```

2. **Start Media Server with V380 Support**

```bash
cd media-server
node server.js
```

The server will automatically start V380 services if enabled in configuration.

## Usage

### Basic V380 Stream Setup

1. **Configure Camera**

```javascript
const camera = {
  id: 'v380-cam-001',
  name: 'V380 Camera 001',
  ip: '192.168.1.100',
  port: 554,
  credentials: {
    username: 'admin',
    password: 'password'
  },
  streamSettings: {
    rtspPath: '/stream1',
    quality: 'high',
    resolution: '1920x1080',
    frameRate: 25,
    audioEnabled: true
  }
};
```

2. **Start V380 Stream**

```javascript
import { v380Service } from '@/lib/services/v380-service';

// Start complete V380 streaming workflow
const result = await v380Service.startV380Stream(
  camera.id,
  camera,
  'hls' // Output format: 'hls', 'rtsp', or 'webrtc'
);

console.log('Stream URLs:', result.streamUrls);
```

3. **Monitor Stream Status**

```javascript
// Get capture status
const captureStatus = await v380Service.getCaptureStatus(camera.id);

// Get relay status
const relayStatus = await v380Service.getRelayStatus();

// Test connection
const connectionTest = await v380Service.testConnection(camera);
```

### API Endpoints

#### V380 Capture Endpoints

- `POST /api/v380/capture/start` - Start V380 capture
- `POST /api/v380/capture/stop` - Stop V380 capture
- `GET /api/v380/capture/status/:cameraId?` - Get capture status

#### V380 Relay Endpoints

- `POST /api/v380/relay/start` - Start stream relay
- `POST /api/v380/relay/stop` - Stop stream relay
- `GET /api/v380/relay/status/:relayId?` - Get relay status

#### V380 Stream Endpoints

- `GET /api/v380/streams/:cameraId` - Get stream URLs

### Frontend Integration

Use the V380Setup component for easy configuration:

```tsx
import { V380Setup } from '@/components/siteguard/V380Setup';

function CameraSetup() {
  const handleStreamStarted = (cameraId, streamUrls) => {
    console.log('V380 stream started:', cameraId, streamUrls);
  };

  const handleStreamStopped = (cameraId) => {
    console.log('V380 stream stopped:', cameraId);
  };

  return (
    <V380Setup
      onStreamStarted={handleStreamStarted}
      onStreamStopped={handleStreamStopped}
    />
  );
}
```

## V380 Protocol Implementation

### Packet Structure

The V380 protocol uses a custom packet format:

```
[Header: 4 bytes][Type: 1 byte][Length: 4 bytes][Data: variable][Checksum: 2 bytes]
```

- **Header**: 0x56333830 ("V380" in hex)
- **Type**: Packet type (0x01=video, 0x02=audio, 0x03=control, 0x04=heartbeat)
- **Length**: Payload length in bytes
- **Data**: Actual payload data
- **Checksum**: Simple XOR checksum for data integrity

### Stream Conversion

The system converts V380 streams through the following pipeline:

1. **V380 PC Software** → Captures stream from camera
2. **V380 Capture Service** → Receives and parses V380 protocol
3. **V380 Stream Relay** → Converts to standard formats using FFmpeg
4. **Output Formats** → HLS, RTSP, or WebRTC streams

### Supported Features

- ✅ Video stream capture and relay
- ✅ Audio stream support
- ✅ Multiple output formats (HLS, RTSP, WebRTC)
- ✅ Real-time stream conversion
- ✅ Connection health monitoring
- ✅ Automatic reconnection
- ✅ Configuration management
- ✅ Stream quality control
- ✅ PTZ control support (protocol level)
- ✅ Motion detection integration

## Testing

Run the comprehensive test suite:

```bash
cd media-server
node test-v380.js
```

The test suite covers:
- Configuration management
- Capture service functionality
- Stream relay operations
- End-to-end workflow
- Error handling
- Performance characteristics

## Troubleshooting

### Common Issues

1. **V380 PC Software Connection Failed**
   - Verify V380 PC software is running
   - Check capture port (default: 8554) is available
   - Ensure camera is accessible from PC software

2. **Stream Conversion Failed**
   - Verify FFmpeg is installed and in PATH
   - Check relay port (default: 8555) is available
   - Ensure sufficient system resources

3. **Protocol Parsing Errors**
   - Verify V380 protocol version compatibility
   - Check packet integrity and checksums
   - Review network connectivity

### Debug Mode

Enable debug logging:

```javascript
// Set environment variable
process.env.V380_DEBUG = 'true';

// Or in configuration
const config = {
  debug: true,
  logLevel: 'debug'
};
```

### Performance Optimization

1. **Stream Quality Settings**
   - Adjust resolution and frame rate based on network capacity
   - Use appropriate compression settings
   - Enable/disable audio based on requirements

2. **Buffer Management**
   - Increase buffer size for unstable connections
   - Adjust heartbeat intervals for better connectivity
   - Configure retry mechanisms

3. **Resource Management**
   - Monitor FFmpeg process resource usage
   - Implement stream cleanup on disconnection
   - Use connection pooling for multiple cameras

## Security Considerations

1. **Credential Management**
   - Passwords are encrypted in configuration files
   - Use environment variables for sensitive data
   - Implement proper access controls

2. **Network Security**
   - Use secure connections where possible
   - Implement proper firewall rules
   - Monitor for unauthorized access

3. **Stream Security**
   - Validate all incoming packets
   - Implement rate limiting
   - Use secure stream URLs

## Future Enhancements

- [ ] WebRTC direct streaming (bypass FFmpeg)
- [ ] Advanced PTZ control interface
- [ ] Motion detection event handling
- [ ] Cloud recording integration
- [ ] Mobile app support
- [ ] Multi-camera synchronization
- [ ] Advanced analytics integration

## Support

For issues and questions:
1. Check the troubleshooting section
2. Run the test suite to identify problems
3. Review logs for detailed error information
4. Consult the V380 PC software documentation
