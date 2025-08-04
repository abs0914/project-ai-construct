#!/bin/bash

# Deploy Live Feeds Fix to VPS
# This script uploads the fixed backend files to the Contabo VPS and restarts services

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="api.aiconstructpro.com"
VPS_USER="root"
VPS_PATH="/opt/siteguard"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if SSH key exists
if [[ ! -f ~/.ssh/id_rsa ]]; then
    log_error "SSH key not found. Please set up SSH key authentication first."
    exit 1
fi

log_info "🚀 Deploying live feeds fix to VPS..."

# Test SSH connection
log_info "Testing SSH connection to VPS..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$VPS_USER@$VPS_HOST" exit 2>/dev/null; then
    log_error "Cannot connect to VPS. Please check your SSH configuration."
    exit 1
fi
log_success "SSH connection successful."

# Create backup directory on VPS
log_info "Creating backup directory on VPS..."
ssh "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_PATH/backups/$(date +%Y%m%d_%H%M%S)"

# Upload fixed files
log_info "📁 Uploading fixed backend files..."

# Upload media server files
log_info "Uploading media server fixes..."
scp media-server/server.js "$VPS_USER@$VPS_HOST:$VPS_PATH/media-server/"
scp media-server/config.js "$VPS_USER@$VPS_HOST:$VPS_PATH/media-server/"

# Upload security server files
log_info "Uploading security server fixes..."
scp security-server/auth-middleware.js "$VPS_USER@$VPS_HOST:$VPS_PATH/security-server/"

# Upload ONVIF server files
log_info "Uploading ONVIF server fixes..."
scp onvif-server/server.js "$VPS_USER@$VPS_HOST:$VPS_PATH/onvif-server/"

# Upload network server files
log_info "Uploading network server fixes..."
scp network-server/server.js "$VPS_USER@$VPS_HOST:$VPS_PATH/network-server/"

# Upload the comprehensive fix script
log_info "Uploading fix script..."
scp fix-live-feeds.sh "$VPS_USER@$VPS_HOST:$VPS_PATH/"

log_success "All files uploaded successfully."

# Execute the fix script on VPS
log_info "🔧 Executing live feeds fix on VPS..."
ssh "$VPS_USER@$VPS_HOST" << 'EOF'
cd /opt/siteguard
chmod +x fix-live-feeds.sh

# Set environment variables for the fix
export PUBLIC_URL="https://api.aiconstructpro.com"
export DOMAIN="api.aiconstructpro.com"

# Update environment file
if [[ -f .env ]]; then
    # Add or update PUBLIC_URL and DOMAIN
    if grep -q "^PUBLIC_URL=" .env; then
        sed -i "s|^PUBLIC_URL=.*|PUBLIC_URL=https://api.aiconstructpro.com|" .env
    else
        echo "PUBLIC_URL=https://api.aiconstructpro.com" >> .env
    fi
    
    if grep -q "^DOMAIN=" .env; then
        sed -i "s|^DOMAIN=.*|DOMAIN=api.aiconstructpro.com|" .env
    else
        echo "DOMAIN=api.aiconstructpro.com" >> .env
    fi
    
    # Update CORS settings
    sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://aiconstructpro.com|" .env
    sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://aiconstructpro.com,https://www.aiconstructpro.com,https://preview--project-ai-construct.lovable.app|" .env
fi

# Restart PM2 processes
echo "🔄 Restarting PM2 processes..."
pm2 restart all

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status

# Test health endpoints
echo "🏥 Testing health endpoints..."
sleep 5

curl -s http://localhost:3001/health || echo "Media server health check failed"
curl -s http://localhost:3002/health || echo "ONVIF server health check failed"
curl -s http://localhost:3003/health || echo "Network server health check failed"
curl -s http://localhost:3004/health || echo "Security server health check failed"

echo "✅ Live feeds fix deployment completed!"
EOF

log_success "🎉 Live feeds fix deployed successfully!"

# Test the API endpoints
log_info "🧪 Testing API endpoints..."

# Test health endpoint
log_info "Testing health endpoint..."
if curl -s -f "https://$VPS_HOST/api/health" > /dev/null; then
    log_success "Health endpoint is working."
else
    log_warn "Health endpoint test failed."
fi

# Test media server endpoint
log_info "Testing media server endpoint..."
if curl -s -f "https://$VPS_HOST/api/media/health" > /dev/null; then
    log_success "Media server endpoint is working."
else
    log_warn "Media server endpoint test failed."
fi

log_info "🎬 Testing stream functionality..."
log_info "You can now test the live feeds in your frontend application."
log_info ""
log_info "Expected fixes:"
log_info "  ✅ CORS headers should allow requests from https://aiconstructpro.com"
log_info "  ✅ Stream URLs should use https://api.aiconstructpro.com instead of localhost"
log_info "  ✅ All backend services should have proper CORS configuration"
log_info ""
log_info "If you still encounter issues, check the PM2 logs:"
log_info "  ssh $VPS_USER@$VPS_HOST 'pm2 logs'"

log_success "🚀 Deployment complete! Please test your live feeds now."
