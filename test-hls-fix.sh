#!/bin/bash

# Test HLS Streaming Fix
# This script tests the HLS streaming functionality after applying the fix

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${GREEN}=== $1 ===${NC}"
}

log_step "1. Testing service connectivity"

# Test API endpoints
log_info "Testing media server API..."
if curl -s -f "https://api.aiconstructpro.com/api/streams/test/health" > /dev/null 2>&1; then
    log_success "Media server API is accessible"
else
    log_warning "Media server API test returned non-200 status (this may be expected if no test stream exists)"
fi

# Test Node Media Server HTTP port directly
log_info "Testing Node Media Server HTTP port (8000) directly..."
if curl -s -f "http://localhost:8000/" > /dev/null 2>&1; then
    log_success "Node Media Server HTTP port is accessible"
else
    log_warning "Node Media Server HTTP port is not accessible directly"
fi

log_step "2. Testing HLS endpoint routing"

# Test HLS manifest endpoint
log_info "Testing HLS manifest endpoint through nginx..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://api.aiconstructpro.com/live/test-stream/index.m3u8")
log_info "HLS manifest endpoint returned HTTP $HTTP_CODE"

if [[ "$HTTP_CODE" == "404" ]]; then
    log_success "HLS endpoint is properly routed (404 is expected when no stream is active)"
elif [[ "$HTTP_CODE" == "200" ]]; then
    log_success "HLS endpoint is working and stream is active!"
else
    log_error "HLS endpoint returned unexpected status: $HTTP_CODE"
fi

log_step "3. Starting test stream"

log_info "Starting test stream to verify HLS generation..."
STREAM_RESPONSE=$(curl -s -X POST "https://api.aiconstructpro.com/api/streams/test-camera/start" \
    -H "Content-Type: application/json" \
    -d '{
        "rtspUrl": "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4",
        "username": "",
        "password": ""
    }' 2>/dev/null || echo '{"error": "Failed to start stream"}')

if echo "$STREAM_RESPONSE" | grep -q '"success":true'; then
    log_success "Test stream started successfully"
    
    # Extract stream key
    STREAM_KEY=$(echo "$STREAM_RESPONSE" | grep -o '"streamKey":"[^"]*"' | cut -d'"' -f4)
    log_info "Stream key: $STREAM_KEY"
    
    # Wait for HLS segments to be generated
    log_info "Waiting 10 seconds for HLS segments to be generated..."
    sleep 10
    
    # Test the actual HLS manifest
    HLS_URL="https://api.aiconstructpro.com/live/$STREAM_KEY/index.m3u8"
    log_info "Testing HLS manifest: $HLS_URL"
    
    HLS_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HLS_URL")
    log_info "HLS manifest returned HTTP $HLS_HTTP_CODE"
    
    if [[ "$HLS_HTTP_CODE" == "200" ]]; then
        log_success "HLS streaming is working correctly!"
        
        # Show manifest content
        log_info "HLS manifest content:"
        curl -s "$HLS_URL" | head -20
        
    elif [[ "$HLS_HTTP_CODE" == "404" ]]; then
        log_warning "HLS manifest not found - segments may not be generated yet"
        log_info "Checking media directory..."
        if [[ -d "/opt/siteguard/media-server/media/live/$STREAM_KEY" ]]; then
            log_info "Stream directory exists, checking contents..."
            ls -la "/opt/siteguard/media-server/media/live/$STREAM_KEY" || log_warning "Cannot access stream directory"
        else
            log_warning "Stream directory does not exist"
        fi
    else
        log_error "HLS manifest returned unexpected status: $HLS_HTTP_CODE"
    fi
    
    # Clean up test stream
    log_info "Stopping test stream..."
    curl -s -X POST "https://api.aiconstructpro.com/api/streams/$STREAM_KEY/stop" > /dev/null 2>&1 || true
    
else
    log_error "Failed to start test stream"
    log_info "Response: $STREAM_RESPONSE"
fi

log_step "4. Service status check"

log_info "PM2 process status:"
pm2 status

log_info "Port usage check:"
netstat -tlnp | grep -E ":(3001|8000|1935)" || log_warning "Some expected ports are not listening"

log_step "5. Summary"

log_info "HLS streaming fix test completed"
log_info "Key points to verify:"
log_info "  - Nginx routes /live/ requests to port 8000 (Node Media Server HTTP)"
log_info "  - Media server API is accessible on port 3001"
log_info "  - RTMP server is running on port 1935"
log_info "  - HLS segments are generated in the media directory"

log_success "Test completed!"
