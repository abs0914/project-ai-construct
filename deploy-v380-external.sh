#!/bin/bash
# V380 External Streaming Deployment Script
# Deploys V380 external streaming configuration to VPS

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

# Configuration
VPS_HOST="api.aiconstructpro.com"
VPS_USER="siteguard"
APP_DIR="/opt/siteguard"
REPO_URL="https://github.com/abs0914/project-ai-construct.git"

echo "🎥 V380 External Streaming Deployment"
echo "=================================================="
echo "VPS Host: $VPS_HOST"
echo "VPS User: $VPS_USER"
echo "App Directory: $APP_DIR"
echo ""

log_step "1. Checking VPS Connection"

# Test SSH connection
if ssh -o ConnectTimeout=10 -o BatchMode=yes $VPS_USER@$VPS_HOST exit 2>/dev/null; then
    log_info "✅ SSH connection successful"
else
    log_error "❌ SSH connection failed"
    echo "Please ensure:"
    echo "1. SSH key is configured for $VPS_USER@$VPS_HOST"
    echo "2. VPS is accessible"
    echo "3. User has proper permissions"
    exit 1
fi

log_step "2. Backing Up Current Configuration"

ssh $VPS_USER@$VPS_HOST << 'EOF'
    cd /opt/siteguard
    
    # Create backup directory
    BACKUP_DIR="backups/v380-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup current configurations
    if [ -f "media-server/v380-config-manager.js" ]; then
        cp media-server/v380-config-manager.js "$BACKUP_DIR/"
        echo "✅ Backed up v380-config-manager.js"
    fi
    
    if [ -f "src/lib/services/v380-service.ts" ]; then
        cp src/lib/services/v380-service.ts "$BACKUP_DIR/"
        echo "✅ Backed up v380-service.ts"
    fi
    
    if [ -f "media-server/server.js" ]; then
        cp media-server/server.js "$BACKUP_DIR/"
        echo "✅ Backed up media-server/server.js"
    fi
    
    if [ -f "media-server/v380-vpn-router.js" ]; then
        cp media-server/v380-vpn-router.js "$BACKUP_DIR/"
        echo "✅ Backed up v380-vpn-router.js"
    fi
    
    echo "📦 Backup created in: $BACKUP_DIR"
EOF

log_step "3. Updating Repository"

ssh $VPS_USER@$VPS_HOST << 'EOF'
    cd /opt/siteguard
    
    echo "🔄 Pulling latest changes..."
    git fetch origin
    git pull origin main
    
    echo "✅ Repository updated"
EOF

log_step "4. Installing Dependencies"

ssh $VPS_USER@$VPS_HOST << 'EOF'
    cd /opt/siteguard
    
    echo "📦 Installing/updating dependencies..."
    npm ci --production
    
    echo "✅ Dependencies updated"
EOF

log_step "5. Setting Up V380 External Configuration"

ssh $VPS_USER@$VPS_HOST << 'EOF'
    cd /opt/siteguard
    
    # Make scripts executable
    chmod +x configure-v380-external.sh
    chmod +x test-v380-external-streaming.sh
    
    echo "✅ Scripts made executable"
EOF

log_step "6. Running V380 Configuration"

ssh $VPS_USER@$VPS_HOST << 'EOF'
    cd /opt/siteguard
    
    echo "🎥 Configuring V380 external camera..."
    ./configure-v380-external.sh
    
    echo "✅ V380 configuration completed"
EOF

log_step "7. Building Application"

ssh $VPS_USER@$VPS_HOST << 'EOF'
    cd /opt/siteguard
    
    echo "🔨 Building application..."
    npm run build
    
    echo "✅ Application built successfully"
EOF

log_step "8. Restarting Services"

ssh $VPS_USER@$VPS_HOST << 'EOF'
    echo "🔄 Restarting SiteGuard services..."
    
    # Restart media server
    pm2 restart siteguard-media-server
    echo "✅ Media server restarted"
    
    # Restart network server
    pm2 restart siteguard-network-server
    echo "✅ Network server restarted"
    
    # Restart other services
    pm2 restart siteguard-onvif-server
    pm2 restart siteguard-security-server
    
    echo "✅ All services restarted"
    
    # Show service status
    echo ""
    echo "📊 Service Status:"
    pm2 status
EOF

log_step "9. Testing V380 External Streaming"

ssh $VPS_USER@$VPS_HOST << 'EOF'
    cd /opt/siteguard
    
    echo "🧪 Running V380 external streaming test..."
    ./test-v380-external-streaming.sh
EOF

log_step "10. Deployment Summary"

echo ""
echo "📋 Deployment Summary"
echo "===================="
echo "✅ Repository updated"
echo "✅ V380 external configuration deployed"
echo "✅ Services restarted"
echo "✅ Streaming test completed"
echo ""

log_info "🎉 V380 External Streaming Deployment Complete!"
echo ""
echo "🎥 Your V380 camera should now be accessible at:"
echo "   HLS: https://api.aiconstructpro.com/live/camera_85725752/index.m3u8"
echo "   WebRTC: wss://api.aiconstructpro.com/webrtc/camera_85725752"
echo "   RTSP: rtsp://api.aiconstructpro.com:554/camera_85725752"
echo ""
echo "🔧 To monitor services:"
echo "   ssh $VPS_USER@$VPS_HOST"
echo "   pm2 monit"
echo ""
echo "📊 To check logs:"
echo "   pm2 logs siteguard-media-server"
echo ""
echo "=================================================="
