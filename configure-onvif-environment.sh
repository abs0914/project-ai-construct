#!/bin/bash
# ONVIF Environment Configuration Script
# Sets up environment variables and network configuration for ONVIF server

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

APP_DIR="/opt/siteguard"
ENV_FILE="$APP_DIR/.env"

echo "🔧 ONVIF Environment Configuration"
echo "=================================================="

log_step "1. Checking current environment configuration..."
if [ -f "$ENV_FILE" ]; then
    log_info "Environment file exists: $ENV_FILE"
    
    # Check if ONVIF variables already exist
    if grep -q "ONVIF_SERVER_PORT" "$ENV_FILE"; then
        log_info "ONVIF configuration found in environment file"
    else
        log_warn "ONVIF configuration not found, will add it"
    fi
else
    log_error "Environment file not found: $ENV_FILE"
    log_info "Please run the main deployment script first"
    exit 1
fi

log_step "2. Adding/updating ONVIF environment variables..."

# Create temporary file with ONVIF configuration
cat > /tmp/onvif_env << 'EOF'

# =============================================================================
# ONVIF SERVER CONFIGURATION
# =============================================================================
ONVIF_SERVER_PORT=3002
ONVIF_DISCOVERY_TIMEOUT=10000
ONVIF_CONNECTION_TIMEOUT=15000
ONVIF_USERNAME=admin
ONVIF_PASSWORD=admin123

# ONVIF Network Configuration
ONVIF_MULTICAST_ADDRESS=239.255.255.250
ONVIF_MULTICAST_PORT=3702
ONVIF_SOAP_TIMEOUT=30000

# ONVIF Device Management
ONVIF_MAX_DEVICES=50
ONVIF_DEVICE_REFRESH_INTERVAL=300000
ONVIF_AUTO_DISCOVERY=true

# ONVIF Security
ONVIF_ENABLE_AUTH=true
ONVIF_TOKEN_EXPIRY=3600

# ONVIF Logging
ONVIF_LOG_LEVEL=info
ONVIF_LOG_SOAP_MESSAGES=false
EOF

# Remove existing ONVIF configuration if present
sed -i '/# ONVIF SERVER CONFIGURATION/,/^$/d' "$ENV_FILE" 2>/dev/null || true

# Append new ONVIF configuration
cat /tmp/onvif_env >> "$ENV_FILE"
rm /tmp/onvif_env

log_info "ONVIF environment variables added to $ENV_FILE"

log_step "3. Configuring firewall for ONVIF..."
# Check if running as root or with sudo access
if [ "$EUID" -eq 0 ] || sudo -n true 2>/dev/null; then
    log_info "Configuring firewall rules for ONVIF..."
    
    # Allow ONVIF server port
    sudo ufw allow 3002/tcp comment "ONVIF Server"
    
    # Allow WS-Discovery multicast (UDP 3702)
    sudo ufw allow 3702/udp comment "ONVIF WS-Discovery"
    
    # Allow ONVIF device communication ports (common ranges)
    sudo ufw allow 80/tcp comment "ONVIF HTTP"
    sudo ufw allow 554/tcp comment "RTSP Streaming"
    sudo ufw allow 8080/tcp comment "ONVIF Alt HTTP"
    
    log_info "Firewall rules configured for ONVIF"
else
    log_warn "Cannot configure firewall (no sudo access)"
    log_info "Please run these commands as root:"
    echo "  sudo ufw allow 3002/tcp comment 'ONVIF Server'"
    echo "  sudo ufw allow 3702/udp comment 'ONVIF WS-Discovery'"
    echo "  sudo ufw allow 80/tcp comment 'ONVIF HTTP'"
    echo "  sudo ufw allow 554/tcp comment 'RTSP Streaming'"
    echo "  sudo ufw allow 8080/tcp comment 'ONVIF Alt HTTP'"
fi

log_step "4. Creating ONVIF server startup script..."
cat > "$APP_DIR/start-onvif.sh" << 'EOF'
#!/bin/bash
# ONVIF Server Startup Script

cd /opt/siteguard
source .env

echo "Starting ONVIF Server..."
echo "Port: $ONVIF_SERVER_PORT"
echo "Discovery Timeout: $ONVIF_DISCOVERY_TIMEOUT ms"
echo "Connection Timeout: $ONVIF_CONNECTION_TIMEOUT ms"

node onvif-server/server.js
EOF

chmod +x "$APP_DIR/start-onvif.sh"
log_info "ONVIF startup script created: $APP_DIR/start-onvif.sh"

log_step "5. Creating ONVIF test script..."
cat > "$APP_DIR/test-onvif-deployment.sh" << 'EOF'
#!/bin/bash
# ONVIF Deployment Test Script

echo "🧪 Testing ONVIF Server Deployment"
echo "=================================="

# Test 1: Check if server is running
echo "Test 1: Server Status"
if curl -f -s http://localhost:3002/api/onvif/devices >/dev/null; then
    echo "✅ ONVIF server is responding"
else
    echo "❌ ONVIF server is not responding"
    exit 1
fi

# Test 2: Test discovery endpoint
echo "Test 2: Discovery Endpoint"
response=$(curl -s -X POST http://localhost:3002/api/onvif/discover)
if [ $? -eq 0 ]; then
    echo "✅ Discovery endpoint accessible"
    echo "Response: $response"
else
    echo "❌ Discovery endpoint failed"
fi

# Test 3: Check PM2 status
echo "Test 3: PM2 Status"
if pm2 describe siteguard-onvif-server >/dev/null 2>&1; then
    echo "✅ ONVIF server found in PM2"
    pm2 describe siteguard-onvif-server | grep -E "(status|uptime|memory|cpu)"
else
    echo "❌ ONVIF server not found in PM2"
fi

echo "=================================="
echo "Test completed"
EOF

chmod +x "$APP_DIR/test-onvif-deployment.sh"
log_info "ONVIF test script created: $APP_DIR/test-onvif-deployment.sh"

echo ""
echo "=================================================="
log_info "✅ ONVIF Environment Configuration completed!"
echo ""
log_info "Configuration Summary:"
echo "- ONVIF Server Port: 3002"
echo "- Discovery Timeout: 10 seconds"
echo "- Connection Timeout: 15 seconds"
echo "- Default Credentials: admin/admin123"
echo ""
log_warn "Important: Update ONVIF_PASSWORD in $ENV_FILE"
echo ""
log_info "Next Steps:"
echo "1. Edit environment: nano $ENV_FILE"
echo "2. Update ONVIF_PASSWORD to a secure value"
echo "3. Run deployment: ./deploy-onvif-server.sh"
echo "4. Test deployment: ./test-onvif-deployment.sh"
echo "=================================================="
