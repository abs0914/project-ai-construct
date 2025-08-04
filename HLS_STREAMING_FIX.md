# HLS Streaming Fix Documentation

## Problem Description

The HLS streaming was failing with 404 errors when trying to access HLS manifest files (index.m3u8). The error occurred because:

1. **Incorrect Nginx Routing**: The nginx configuration was routing `/live/` requests to the media server API port (3001) instead of the Node Media Server HTTP port (8000)
2. **Missing Upstream Configuration**: There was no upstream configuration for the Node Media Server HTTP service
3. **Architecture Mismatch**: The media server consists of two components:
   - Express API server (port 3001) - handles stream management API
   - Node Media Server HTTP server (port 8000) - serves HLS files and segments

## Root Cause Analysis

### Media Server Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Media Server                             │
├─────────────────────────────────────────────────────────────┤
│  Express API Server (Port 3001)                            │
│  - Stream management (/api/streams/)                       │
│  - Health checks                                           │
│  - WebSocket connections                                   │
├─────────────────────────────────────────────────────────────┤
│  Node Media Server (NMS)                                   │
│  - RTMP Server (Port 1935) - receives streams             │
│  - HTTP Server (Port 8000) - serves HLS files             │
│    └── /live/{streamKey}/index.m3u8                       │
│    └── /live/{streamKey}/*.ts                             │
└─────────────────────────────────────────────────────────────┘
```

### Previous (Incorrect) Nginx Configuration
```nginx
upstream siteguard_media_server {
    server 127.0.0.1:3001;  # Express API server
}

location ~ ^/live/(.+)\.m3u8$ {
    proxy_pass http://siteguard_media_server/live/$1.m3u8;  # Wrong port!
}
```

### Fixed Nginx Configuration
```nginx
upstream siteguard_media_server {
    server 127.0.0.1:3001;  # Express API server
}

upstream siteguard_media_http {
    server 127.0.0.1:8000;  # Node Media Server HTTP
}

location ~ ^/live/(.+)\.m3u8$ {
    proxy_pass http://siteguard_media_http/live/$1.m3u8;  # Correct port!
}
```

## Solution Implementation

### Files Modified

1. **deploy-backend-only.sh**
   - Added `siteguard_media_http` upstream pointing to port 8000
   - Updated HLS location blocks to use the new upstream

2. **configure-domain-ssl.sh**
   - Added `siteguard_media_http` upstream pointing to port 8000
   - Updated HLS location blocks in both HTTP and HTTPS server blocks

3. **fix-hls-streaming.sh** (New)
   - Script to apply the fix to existing deployments
   - Backs up current configuration
   - Updates nginx configuration
   - Tests and reloads services

4. **test-hls-fix.sh** (New)
   - Comprehensive test script to verify the fix
   - Tests service connectivity
   - Starts test stream and verifies HLS generation

## How to Apply the Fix

### For New Deployments
The fix is already included in the updated deployment scripts. Simply run:
```bash
sudo ./deploy-backend-only.sh
```

### For Existing Deployments
1. Upload the fix script to your server
2. Make it executable and run:
```bash
chmod +x fix-hls-streaming.sh
sudo ./fix-hls-streaming.sh
```

### Testing the Fix
```bash
chmod +x test-hls-fix.sh
sudo ./test-hls-fix.sh
```

## Verification Steps

### 1. Check Service Status
```bash
pm2 status
netstat -tlnp | grep -E ":(3001|8000|1935)"
```

Expected output:
- Port 3001: Express API server
- Port 8000: Node Media Server HTTP
- Port 1935: RTMP server

### 2. Test HLS Endpoint
```bash
curl -I "https://api.aiconstructpro.com/live/test-stream/index.m3u8"
```

Expected: HTTP 404 (when no stream is active) or HTTP 200 (when stream is active)

### 3. Start Test Stream
```bash
curl -X POST "https://api.aiconstructpro.com/api/streams/test-camera/start" \
  -H "Content-Type: application/json" \
  -d '{
    "rtspUrl": "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4",
    "username": "",
    "password": ""
  }'
```

### 4. Verify HLS Generation
After starting a stream, wait 5-10 seconds then check:
```bash
curl "https://api.aiconstructpro.com/live/{streamKey}/index.m3u8"
```

## Technical Details

### Stream Flow
1. **Stream Start**: Client calls `/api/streams/{cameraId}/start`
2. **RTSP to RTMP**: FFmpeg converts RTSP to RTMP and sends to `rtmp://localhost:1935/live/{streamKey}`
3. **RTMP to HLS**: Node Media Server receives RTMP and generates HLS files in `/media/live/{streamKey}/`
4. **HLS Serving**: Node Media Server HTTP serves files from `/live/{streamKey}/` endpoint
5. **Client Access**: Nginx routes `https://api.aiconstructpro.com/live/{streamKey}/index.m3u8` to Node Media Server

### Port Mapping
- **1935**: RTMP input (internal only)
- **3001**: Express API (proxied via nginx)
- **8000**: Node Media Server HTTP (proxied via nginx for /live/ paths)

### File Locations
- **HLS Files**: `/opt/siteguard/media-server/media/live/{streamKey}/`
- **Nginx Config**: `/etc/nginx/sites-available/siteguard-api`
- **PM2 Config**: `/opt/siteguard/ecosystem.config.js`

## Troubleshooting

### HLS Still Returns 404
1. Check if Node Media Server HTTP is running: `netstat -tlnp | grep :8000`
2. Check nginx configuration: `nginx -t`
3. Check PM2 logs: `pm2 logs media-server`
4. Verify media directory exists: `ls -la /opt/siteguard/media-server/media/live/`

### Stream Starts But No HLS Files
1. Check FFmpeg process: `ps aux | grep ffmpeg`
2. Check RTMP connection: `netstat -tlnp | grep :1935`
3. Check media directory permissions: `ls -la /opt/siteguard/media-server/media/`
4. Check Node Media Server logs in PM2

### CORS Issues
The fix includes proper CORS headers for HLS files:
```nginx
add_header Access-Control-Allow-Origin "*";
```

## Prevention

To prevent similar issues in the future:
1. Always document port usage and service architecture
2. Test HLS endpoints after any nginx configuration changes
3. Use the provided test scripts after deployments
4. Monitor PM2 logs for media server issues

## Related Files

- `media-server/server.js` - Main media server implementation
- `media-server/config.js` - Media server configuration
- `src/lib/video-streaming-service.ts` - Frontend streaming service
- `src/lib/hls-client.ts` - HLS client implementation
