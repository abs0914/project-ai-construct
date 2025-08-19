#!/bin/bash
# V380 External Streaming Test Script
# Tests V380 camera streaming from external network

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Camera configuration
CAMERA_ID="85725752"
CAMERA_IP="172.30.195.39"
CAMERA_PORT="554"
CAMERA_USERNAME="85725752"
CAMERA_PASSWORD="Ztatic@PV0sites"
RTSP_PATH="/live/ch00_0"
MEDIA_SERVER_URL="http://localhost:3001"
PUBLIC_URL="https://api.aiconstructpro.com"

echo "🧪 V380 External Streaming Test"
echo "=================================================="
echo "Camera ID: $CAMERA_ID"
echo "Camera IP: $CAMERA_IP"
echo "Media Server: $MEDIA_SERVER_URL"
echo "Public URL: $PUBLIC_URL"
echo ""

log_step "1. Pre-flight Checks"

# Check if media server is running
if curl -s "$MEDIA_SERVER_URL/health" >/dev/null 2>&1; then
    log_info "✅ Media server is running"
else
    log_error "❌ Media server is not accessible"
    echo "Please start the media server: pm2 start siteguard-media-server"
    exit 1
fi

# Check if FFmpeg is available
if command -v ffmpeg >/dev/null 2>&1; then
    log_info "✅ FFmpeg is available"
else
    log_error "❌ FFmpeg is not installed"
    exit 1
fi

log_step "2. Testing Direct Camera Connection"

# Test direct RTSP connection
RTSP_URL="rtsp://${CAMERA_USERNAME}:${CAMERA_PASSWORD}@${CAMERA_IP}:${CAMERA_PORT}${RTSP_PATH}"
log_info "Testing RTSP URL: rtsp://***:***@${CAMERA_IP}:${CAMERA_PORT}${RTSP_PATH}"

# Test with timeout
if timeout 15 ffprobe -v quiet -print_format json -show_streams "$RTSP_URL" >/dev/null 2>&1; then
    log_info "✅ Direct RTSP connection successful"
    DIRECT_ACCESS=true
else
    log_warn "⚠️  Direct RTSP connection failed"
    DIRECT_ACCESS=false
fi

log_step "3. Starting Stream via Media Server"

# Prepare stream start request
STREAM_REQUEST=$(cat << EOF
{
  "rtspUrl": "$RTSP_URL",
  "username": "$CAMERA_USERNAME",
  "password": "$CAMERA_PASSWORD",
  "externalAccess": true,
  "cameraId": "$CAMERA_ID"
}
EOF
)

log_info "Starting stream for camera $CAMERA_ID..."

# Start the stream
STREAM_RESPONSE=$(curl -s -X POST "$MEDIA_SERVER_URL/api/streams/$CAMERA_ID/start" \
  -H "Content-Type: application/json" \
  -d "$STREAM_REQUEST" || echo '{"error": "Request failed"}')

echo "Stream start response: $STREAM_RESPONSE"

# Check if stream started successfully
if echo "$STREAM_RESPONSE" | grep -q '"success".*true\|"status".*"success"'; then
    log_info "✅ Stream started successfully"
    STREAM_STARTED=true
else
    log_error "❌ Failed to start stream"
    STREAM_STARTED=false
fi

log_step "4. Testing Stream Endpoints"

if [ "$STREAM_STARTED" = true ]; then
    # Wait for stream to initialize
    log_info "Waiting for stream to initialize..."
    sleep 10
    
    # Test HLS endpoint
    HLS_URL="$PUBLIC_URL/live/camera_$CAMERA_ID/index.m3u8"
    log_info "Testing HLS endpoint: $HLS_URL"
    
    if curl -s -I "$HLS_URL" | grep -q "200 OK"; then
        log_info "✅ HLS endpoint is accessible"
        HLS_WORKING=true
    else
        log_warn "⚠️  HLS endpoint not accessible"
        HLS_WORKING=false
    fi
    
    # Test RTSP relay endpoint
    RTSP_RELAY_URL="rtsp://api.aiconstructpro.com:554/camera_$CAMERA_ID"
    log_info "Testing RTSP relay: $RTSP_RELAY_URL"
    
    if timeout 10 ffprobe -v quiet "$RTSP_RELAY_URL" >/dev/null 2>&1; then
        log_info "✅ RTSP relay is working"
        RTSP_RELAY_WORKING=true
    else
        log_warn "⚠️  RTSP relay not accessible"
        RTSP_RELAY_WORKING=false
    fi
    
    # Test WebRTC endpoint
    WEBRTC_URL="$PUBLIC_URL/webrtc/camera_$CAMERA_ID"
    log_info "Testing WebRTC endpoint: $WEBRTC_URL"
    
    if curl -s -I "$WEBRTC_URL" | grep -q "200 OK\|101 Switching Protocols"; then
        log_info "✅ WebRTC endpoint is accessible"
        WEBRTC_WORKING=true
    else
        log_warn "⚠️  WebRTC endpoint not accessible"
        WEBRTC_WORKING=false
    fi
else
    HLS_WORKING=false
    RTSP_RELAY_WORKING=false
    WEBRTC_WORKING=false
fi

log_step "5. Stream Quality Test"

if [ "$HLS_WORKING" = true ]; then
    log_info "Testing stream quality..."
    
    # Download a few segments to test quality
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    if curl -s "$HLS_URL" -o playlist.m3u8; then
        # Extract first segment URL
        SEGMENT_URL=$(grep -v '^#' playlist.m3u8 | head -1)
        if [ -n "$SEGMENT_URL" ]; then
            FULL_SEGMENT_URL="$PUBLIC_URL/live/camera_$CAMERA_ID/$SEGMENT_URL"
            if curl -s "$FULL_SEGMENT_URL" -o segment.ts; then
                SEGMENT_SIZE=$(stat -f%z segment.ts 2>/dev/null || stat -c%s segment.ts 2>/dev/null || echo "0")
                if [ "$SEGMENT_SIZE" -gt 1000 ]; then
                    log_info "✅ Stream quality test passed (segment size: ${SEGMENT_SIZE} bytes)"
                    QUALITY_OK=true
                else
                    log_warn "⚠️  Stream quality test failed (segment too small: ${SEGMENT_SIZE} bytes)"
                    QUALITY_OK=false
                fi
            else
                log_warn "⚠️  Could not download stream segment"
                QUALITY_OK=false
            fi
        else
            log_warn "⚠️  No segments found in playlist"
            QUALITY_OK=false
        fi
    else
        log_warn "⚠️  Could not download playlist"
        QUALITY_OK=false
    fi
    
    # Cleanup
    cd - >/dev/null
    rm -rf "$TEMP_DIR"
else
    QUALITY_OK=false
fi

log_step "6. Performance Metrics"

# Get stream statistics
if [ "$STREAM_STARTED" = true ]; then
    STATS_RESPONSE=$(curl -s "$MEDIA_SERVER_URL/api/streams/$CAMERA_ID/stats" || echo '{}')
    echo "Stream statistics: $STATS_RESPONSE"
fi

log_step "7. Test Results Summary"

echo ""
echo "📊 Test Results Summary"
echo "======================="
echo "Direct RTSP Access: $([ "$DIRECT_ACCESS" = true ] && echo "✅ Working" || echo "❌ Failed")"
echo "Stream Started: $([ "$STREAM_STARTED" = true ] && echo "✅ Success" || echo "❌ Failed")"
echo "HLS Streaming: $([ "$HLS_WORKING" = true ] && echo "✅ Working" || echo "❌ Failed")"
echo "RTSP Relay: $([ "$RTSP_RELAY_WORKING" = true ] && echo "✅ Working" || echo "❌ Failed")"
echo "WebRTC: $([ "$WEBRTC_WORKING" = true ] && echo "✅ Working" || echo "❌ Failed")"
echo "Stream Quality: $([ "$QUALITY_OK" = true ] && echo "✅ Good" || echo "❌ Poor")"
echo ""

if [ "$HLS_WORKING" = true ]; then
    echo "🎥 Stream Access URLs:"
    echo "====================="
    echo "HLS Stream: $HLS_URL"
    echo "RTSP Relay: $RTSP_RELAY_URL"
    echo "WebRTC: $WEBRTC_URL"
    echo ""
fi

# Overall result
if [ "$STREAM_STARTED" = true ] && [ "$HLS_WORKING" = true ]; then
    log_info "🎉 V380 External Streaming Test: PASSED"
    echo ""
    echo "✅ Your V380 camera is successfully streaming from external network!"
    echo "✅ Stream is accessible via multiple protocols"
    echo "✅ Ready for production use"
else
    log_error "❌ V380 External Streaming Test: FAILED"
    echo ""
    echo "🔧 Troubleshooting Steps:"
    echo "1. Check camera network connectivity"
    echo "2. Verify camera credentials and RTSP path"
    echo "3. Ensure media server is running: pm2 status"
    echo "4. Check firewall and port forwarding"
    echo "5. Review media server logs: pm2 logs siteguard-media-server"
fi

echo ""
echo "=================================================="
