#!/bin/bash
# Complete SiteGuard Deployment Script for Fresh VPS
# Deploys all backend services including ONVIF server

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
REPO_URL="https://github.com/abs0914/project-ai-construct.git"
APP_DIR="/opt/siteguard"
API_DOMAIN="api.aiconstructpro.com"

# Check if running as siteguard user
if [ "$USER" != "siteguard" ]; then
    log_error "This script must be run as the siteguard user"
    log_info "Switch to siteguard user: sudo su - siteguard"
    exit 1
fi

echo "🚀 SiteGuard Complete Deployment"
echo "=================================================="
echo "Repository: $REPO_URL"
echo "Target Domain: $API_DOMAIN"
echo "Application Directory: $APP_DIR"
echo "Date: $(date)"
echo ""

log_step "1. Cloning SiteGuard Repository"
cd /opt
if [ -d "$APP_DIR" ]; then
    log_warn "Application directory exists, backing up..."
    mv "$APP_DIR" "${APP_DIR}-backup-$(date +%Y%m%d-%H%M%S)"
fi

git clone "$REPO_URL" siteguard
cd "$APP_DIR"
log_info "✅ Repository cloned successfully"

log_step "2. Installing Dependencies"
log_info "Installing Node.js dependencies..."
npm ci --production=false
log_info "✅ Dependencies installed"

log_step "3. Creating Environment Configuration"
cat > .env << EOF
# SiteGuard Production Environment Configuration
NODE_ENV=production

# API Server Ports
MEDIA_SERVER_PORT=3001
ONVIF_SERVER_PORT=3002
NETWORK_SERVER_PORT=3003
SECURITY_SERVER_PORT=3004

# Database Configuration (Supabase)
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Security Configuration
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
BCRYPT_ROUNDS=12

# Media Configuration
RECORDINGS_PATH=/opt/siteguard/recordings
MAX_RECORDING_SIZE=10GB
STREAM_QUALITY=high

# Network Configuration
ZEROTIER_NETWORK_ID=your_zerotier_network_id
ZEROTIER_API_TOKEN=your_zerotier_api_token

# ONVIF Configuration
ONVIF_DISCOVERY_TIMEOUT=10000
ONVIF_CONNECTION_TIMEOUT=15000
ONVIF_USERNAME=admin
ONVIF_PASSWORD=admin123
ONVIF_MULTICAST_ADDRESS=239.255.255.250
ONVIF_MULTICAST_PORT=3702
ONVIF_SOAP_TIMEOUT=30000
ONVIF_MAX_DEVICES=50
ONVIF_DEVICE_REFRESH_INTERVAL=300000
ONVIF_AUTO_DISCOVERY=true
ONVIF_ENABLE_AUTH=true
ONVIF_TOKEN_EXPIRY=3600
ONVIF_LOG_LEVEL=info
ONVIF_LOG_SOAP_MESSAGES=false

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=/var/log/siteguard/app.log

# CORS Configuration
FRONTEND_DOMAIN=preview--project-ai-construct.lovable.app
CORS_ORIGIN=https://preview--project-ai-construct.lovable.app
ALLOWED_ORIGINS=https://preview--project-ai-construct.lovable.app,https://$API_DOMAIN

# API Domain
API_DOMAIN=$API_DOMAIN
EOF

log_info "✅ Environment configuration created"
log_warn "Please update Supabase credentials and other settings in .env file"

log_step "4. Creating PM2 Ecosystem Configuration"
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'siteguard-media-server',
      script: 'media-server/server.js',
      cwd: '/opt/siteguard',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      log_file: '/var/log/siteguard/media-server.log',
      error_file: '/var/log/siteguard/media-server-error.log',
      out_file: '/var/log/siteguard/media-server-out.log',
      time: true
    },
    {
      name: 'siteguard-onvif-server',
      script: 'onvif-server/server.js',
      cwd: '/opt/siteguard',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '256M',
      log_file: '/var/log/siteguard/onvif-server.log',
      error_file: '/var/log/siteguard/onvif-server-error.log',
      out_file: '/var/log/siteguard/onvif-server-out.log',
      time: true
    },
    {
      name: 'siteguard-network-server',
      script: 'network-server/server.js',
      cwd: '/opt/siteguard',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '256M',
      log_file: '/var/log/siteguard/network-server.log',
      error_file: '/var/log/siteguard/network-server-error.log',
      out_file: '/var/log/siteguard/network-server-out.log',
      time: true
    },
    {
      name: 'siteguard-security-server',
      script: 'security-server/server.js',
      cwd: '/opt/siteguard',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '256M',
      log_file: '/var/log/siteguard/security-server.log',
      error_file: '/var/log/siteguard/security-server-error.log',
      out_file: '/var/log/siteguard/security-server-out.log',
      time: true
    }
  ]
};
EOF

log_info "✅ PM2 ecosystem configuration created"

log_step "5. Starting Services with PM2"
pm2 start ecosystem.config.js
pm2 save
log_info "✅ All services started with PM2"

log_step "6. Displaying Service Status"
pm2 list

echo ""
echo "=================================================="
log_info "✅ SiteGuard Deployment Completed!"
echo ""
log_info "Services Status:"
pm2 list --no-color | grep -E "(siteguard-|App name)" || echo "PM2 list not available"
echo ""
log_info "Service URLs (Local):"
echo "- Media Server: http://localhost:3001"
echo "- ONVIF Server: http://localhost:3002"
echo "- Network Server: http://localhost:3003"
echo "- Security Server: http://localhost:3004"
echo ""
log_info "Next Steps:"
echo "1. Configure domain and SSL: sudo ./configure-domain-ssl.sh"
echo "2. Update environment variables: nano .env"
echo "3. Test deployment: ./test-complete-deployment.sh"
echo ""
log_warn "Important:"
echo "- Update SUPABASE_* credentials in .env"
echo "- Change ONVIF_PASSWORD to a secure value"
echo "- Configure your domain DNS to point to this server"
echo "=================================================="
