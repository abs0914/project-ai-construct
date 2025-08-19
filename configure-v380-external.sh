#!/bin/bash
# V380 External Network Configuration Script
# Configures V380 camera for external network access via ZeroTier VPN

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

echo "🎥 V380 External Network Configuration"
echo "=================================================="
echo "Camera ID: $CAMERA_ID"
echo "Camera IP: $CAMERA_IP"
echo "Camera Port: $CAMERA_PORT"
echo "RTSP Path: $RTSP_PATH"
echo ""

log_step "1. Testing Camera Connectivity"

# Test direct RTSP connection
log_info "Testing direct RTSP connection..."
RTSP_URL="rtsp://${CAMERA_USERNAME}:${CAMERA_PASSWORD}@${CAMERA_IP}:${CAMERA_PORT}${RTSP_PATH}"

# Use FFprobe to test RTSP stream
if command -v ffprobe >/dev/null 2>&1; then
    log_info "Testing RTSP stream with FFprobe..."
    if timeout 10 ffprobe -v quiet -print_format json -show_streams "$RTSP_URL" >/dev/null 2>&1; then
        log_info "✅ Direct RTSP connection successful"
        DIRECT_ACCESS=true
    else
        log_warn "⚠️  Direct RTSP connection failed - will use VPN routing"
        DIRECT_ACCESS=false
    fi
else
    log_warn "FFprobe not available - skipping direct connection test"
    DIRECT_ACCESS=false
fi

log_step "2. Configuring V380 Camera Profile"

# Create camera configuration
CAMERA_CONFIG_FILE="/opt/siteguard/media-server/external-v380-${CAMERA_ID}.json"

cat > "$CAMERA_CONFIG_FILE" << EOF
{
  "version": "1.0",
  "lastUpdated": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
  "cameras": {
    "${CAMERA_ID}": {
      "id": "${CAMERA_ID}",
      "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
      "updatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
      "name": "V380 External Camera ${CAMERA_ID}",
      "ip": "${CAMERA_IP}",
      "port": ${CAMERA_PORT},
      "model": "V380 Pro",
      "firmware": "1.0.0",
      "credentials": {
        "username": "${CAMERA_USERNAME}",
        "encryptedPassword": "$(echo -n "${CAMERA_PASSWORD}" | openssl enc -aes-256-cbc -a -salt -pass pass:siteguard2024)"
      },
      "streamSettings": {
        "rtspPath": "${RTSP_PATH}",
        "quality": "high",
        "resolution": "1920x1080",
        "frameRate": 25,
        "bitrate": 2000,
        "audioEnabled": true
      },
      "protocolSettings": {
        "version": "1.0",
        "encryption": false,
        "compression": true,
        "heartbeatInterval": 30000,
        "reconnectInterval": 5000,
        "maxRetries": 3
      },
      "networkSettings": {
        "externalAccess": true,
        "directAccess": ${DIRECT_ACCESS},
        "routerId": "glinet-external-001",
        "localIp": "${CAMERA_IP}",
        "zerotierIp": null,
        "networkId": null,
        "portForwarding": {
          "enabled": true,
          "externalPort": ${CAMERA_PORT},
          "internalPort": ${CAMERA_PORT}
        }
      },
      "capabilities": {
        "ptz": false,
        "nightVision": true,
        "motionDetection": true,
        "audioSupport": true,
        "recordingSupport": true
      },
      "status": {
        "enabled": true,
        "lastSeen": null,
        "connectionStatus": "configured"
      }
    }
  }
}
EOF

log_info "✅ Camera configuration saved to: $CAMERA_CONFIG_FILE"

log_step "3. Updating Environment Configuration"

# Update .env file with camera-specific settings
ENV_FILE="/opt/siteguard/.env"

if [ -f "$ENV_FILE" ]; then
    # Add V380 external camera settings
    if ! grep -q "V380_EXTERNAL_CAMERA_ID" "$ENV_FILE"; then
        echo "" >> "$ENV_FILE"
        echo "# V380 External Camera Configuration" >> "$ENV_FILE"
        echo "V380_EXTERNAL_CAMERA_ID=${CAMERA_ID}" >> "$ENV_FILE"
        echo "V380_EXTERNAL_CAMERA_IP=${CAMERA_IP}" >> "$ENV_FILE"
        echo "V380_EXTERNAL_CAMERA_PORT=${CAMERA_PORT}" >> "$ENV_FILE"
        echo "V380_EXTERNAL_RTSP_PATH=${RTSP_PATH}" >> "$ENV_FILE"
        echo "V380_EXTERNAL_DIRECT_ACCESS=${DIRECT_ACCESS}" >> "$ENV_FILE"
        log_info "✅ Environment variables added"
    else
        log_info "✅ Environment variables already configured"
    fi
else
    log_error "Environment file not found: $ENV_FILE"
    exit 1
fi

log_step "4. Testing Stream Configuration"

# Test the configured stream
log_info "Testing configured stream..."

# Create test RTSP URL
TEST_RTSP_URL="rtsp://${CAMERA_USERNAME}:${CAMERA_PASSWORD}@${CAMERA_IP}:${CAMERA_PORT}${RTSP_PATH}"

# Test with curl (basic connectivity)
if curl -s --connect-timeout 5 "rtsp://${CAMERA_IP}:${CAMERA_PORT}" >/dev/null 2>&1; then
    log_info "✅ Camera port is accessible"
else
    log_warn "⚠️  Camera port not directly accessible - VPN routing required"
fi

log_step "5. Configuration Summary"

echo ""
echo "📋 Configuration Summary:"
echo "========================="
echo "Camera ID: $CAMERA_ID"
echo "RTSP URL: rtsp://***:***@${CAMERA_IP}:${CAMERA_PORT}${RTSP_PATH}"
echo "Direct Access: $DIRECT_ACCESS"
echo "Config File: $CAMERA_CONFIG_FILE"
echo ""

log_info "✅ V380 External Camera Configuration Complete"
echo ""
echo "🚀 Next Steps:"
echo "1. Restart media server: pm2 restart siteguard-media-server"
echo "2. Test streaming: curl -X POST http://localhost:3001/api/streams/${CAMERA_ID}/start \\"
echo "   -H 'Content-Type: application/json' \\"
echo "   -d '{\"rtspUrl\":\"${TEST_RTSP_URL}\",\"username\":\"${CAMERA_USERNAME}\",\"password\":\"${CAMERA_PASSWORD}\",\"externalAccess\":true}'"
echo "3. Access stream: https://api.aiconstructpro.com/live/camera_${CAMERA_ID}/index.m3u8"
echo ""
echo "=================================================="
