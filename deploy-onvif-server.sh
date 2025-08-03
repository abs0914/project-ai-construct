#!/bin/bash
# ONVIF Server Deployment Script for Contabo VPS
# Deploys/updates the ONVIF server while preserving existing services

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
BACKUP_DIR="/opt/siteguard-backup-$(date +%Y%m%d-%H%M%S)"
API_DOMAIN="api.aiconstructpro.com"

# Check if running as siteguard user
if [ "$USER" != "siteguard" ]; then
    log_error "This script must be run as the siteguard user"
    log_info "Switch to siteguard user: sudo su - siteguard"
    exit 1
fi

echo "🔧 ONVIF Server Deployment for SiteGuard"
echo "=================================================="
log_info "Target: $API_DOMAIN"
log_info "Application Directory: $APP_DIR"
echo ""

log_step "1. Creating backup of current deployment..."
if [ -d "$APP_DIR" ]; then
    cp -r "$APP_DIR" "$BACKUP_DIR"
    log_info "Backup created at: $BACKUP_DIR"
else
    log_warn "No existing deployment found to backup"
fi

log_step "2. Updating application code..."
cd /opt
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
    log_info "Code updated from repository"
else
    git clone "$REPO_URL" siteguard
    cd "$APP_DIR"
    log_info "Repository cloned"
fi

log_step "3. Installing/updating dependencies..."
npm ci --production=false
log_info "Dependencies installed"

log_step "4. Checking current PM2 services..."
pm2 list

log_step "5. Updating ONVIF server configuration..."
# Check if ONVIF server is already running
if pm2 describe siteguard-onvif-server >/dev/null 2>&1; then
    log_info "ONVIF server found in PM2, restarting..."
    pm2 restart siteguard-onvif-server
else
    log_info "ONVIF server not found in PM2, starting new instance..."
    pm2 start onvif-server/server.js --name siteguard-onvif-server \
        --cwd "$APP_DIR" \
        --env NODE_ENV=production \
        --env PORT=3002 \
        --max-memory-restart 256M \
        --log /var/log/siteguard/onvif-server.log \
        --error /var/log/siteguard/onvif-server-error.log \
        --out /var/log/siteguard/onvif-server-out.log \
        --time
fi

log_step "6. Saving PM2 configuration..."
pm2 save

log_step "7. Testing ONVIF server deployment..."
sleep 5

# Test if ONVIF server is responding
if curl -f -s "http://localhost:3002/api/onvif/devices" >/dev/null; then
    log_info "✅ ONVIF server is responding on port 3002"
else
    log_error "❌ ONVIF server is not responding"
    log_info "Check logs: pm2 logs siteguard-onvif-server"
    exit 1
fi

log_step "8. Verifying all services are running..."
pm2 list

echo ""
echo "=================================================="
log_info "✅ ONVIF Server deployment completed successfully!"
echo ""
log_info "Service Status:"
echo "- ONVIF Server: http://localhost:3002"
echo "- API Endpoint: https://$API_DOMAIN/api/onvif/"
echo ""
log_info "Useful commands:"
echo "- View ONVIF logs: pm2 logs siteguard-onvif-server"
echo "- Restart ONVIF: pm2 restart siteguard-onvif-server"
echo "- Test ONVIF: node onvif-server/test-onvif.js"
echo "- Monitor all: pm2 monit"
echo ""
log_info "ONVIF API Endpoints:"
echo "- POST /api/onvif/discover - Start device discovery"
echo "- GET  /api/onvif/devices - List all devices"
echo "- POST /api/onvif/devices/:id/configure - Configure device"
echo "- GET  /api/onvif/devices/:id/stream-uri - Get stream URI"
echo "- POST /api/onvif/devices/:id/ptz/:action - PTZ control"
echo "=================================================="
