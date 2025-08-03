#!/bin/bash
# VPS State Verification Script
# Checks current status of SiteGuard services on Contabo VPS

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

echo "🔍 SiteGuard VPS State Verification"
echo "=================================================="
echo "Server: api.aiconstructpro.com"
echo "Date: $(date)"
echo ""

log_step "1. System Information"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Uptime: $(uptime -p)"
echo "Load: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

log_step "2. User and Directory Check"
echo "Current user: $USER"
echo "Home directory: $HOME"
echo "Application directory: /opt/siteguard"

if [ -d "/opt/siteguard" ]; then
    log_info "✅ Application directory exists"
    echo "Directory size: $(du -sh /opt/siteguard | cut -f1)"
    echo "Directory owner: $(ls -ld /opt/siteguard | awk '{print $3":"$4}')"
else
    log_error "❌ Application directory not found"
fi
echo ""

log_step "3. Node.js and PM2 Status"
if command -v node >/dev/null 2>&1; then
    echo "Node.js version: $(node --version)"
    log_info "✅ Node.js installed"
else
    log_error "❌ Node.js not found"
fi

if command -v pm2 >/dev/null 2>&1; then
    echo "PM2 version: $(pm2 --version)"
    log_info "✅ PM2 installed"
else
    log_error "❌ PM2 not found"
fi
echo ""

log_step "4. PM2 Services Status"
if command -v pm2 >/dev/null 2>&1; then
    echo "PM2 Process List:"
    pm2 list
    echo ""
    
    # Check specific SiteGuard services
    services=("siteguard-media-server" "siteguard-onvif-server" "siteguard-network-server" "siteguard-security-server")
    
    for service in "${services[@]}"; do
        if pm2 describe "$service" >/dev/null 2>&1; then
            status=$(pm2 jlist | jq -r ".[] | select(.name==\"$service\") | .pm2_env.status" 2>/dev/null || echo "unknown")
            if [ "$status" = "online" ]; then
                log_info "✅ $service: $status"
            else
                log_warn "⚠️  $service: $status"
            fi
        else
            log_error "❌ $service: not found"
        fi
    done
else
    log_error "Cannot check PM2 services - PM2 not installed"
fi
echo ""

log_step "5. Port Status Check"
echo "Checking SiteGuard service ports:"

ports=("3001:Media Server" "3002:ONVIF Server" "3003:Network Server" "3004:Security Server")

for port_info in "${ports[@]}"; do
    port=$(echo $port_info | cut -d: -f1)
    service=$(echo $port_info | cut -d: -f2)
    
    if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        log_info "✅ Port $port ($service): Listening"
    else
        log_warn "⚠️  Port $port ($service): Not listening"
    fi
done
echo ""

log_step "6. Nginx Status"
if systemctl is-active --quiet nginx; then
    log_info "✅ Nginx: Active"
    echo "Nginx version: $(nginx -v 2>&1 | cut -d' ' -f3)"
    
    # Check SiteGuard nginx configuration
    if [ -f "/etc/nginx/sites-available/siteguard-api" ]; then
        log_info "✅ SiteGuard API nginx config exists"
    else
        log_warn "⚠️  SiteGuard API nginx config not found"
    fi
    
    if [ -L "/etc/nginx/sites-enabled/siteguard-api" ]; then
        log_info "✅ SiteGuard API nginx config enabled"
    else
        log_warn "⚠️  SiteGuard API nginx config not enabled"
    fi
else
    log_error "❌ Nginx: Inactive"
fi
echo ""

log_step "7. SSL Certificate Status"
if [ -f "/etc/letsencrypt/live/api.aiconstructpro.com/fullchain.pem" ]; then
    log_info "✅ SSL certificate exists"
    cert_expiry=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/api.aiconstructpro.com/cert.pem | cut -d= -f2)
    echo "Certificate expires: $cert_expiry"
else
    log_warn "⚠️  SSL certificate not found"
fi
echo ""

log_step "8. Firewall Status"
if command -v ufw >/dev/null 2>&1; then
    echo "UFW Status:"
    ufw status | head -20
else
    log_warn "UFW not installed"
fi
echo ""

log_step "9. Environment Configuration"
if [ -f "/opt/siteguard/.env" ]; then
    log_info "✅ Environment file exists"
    echo "Environment file size: $(ls -lh /opt/siteguard/.env | awk '{print $5}')"
    
    # Check for key environment variables (without showing values)
    env_vars=("NODE_ENV" "SUPABASE_URL" "ONVIF_SERVER_PORT" "MEDIA_SERVER_PORT")
    for var in "${env_vars[@]}"; do
        if grep -q "^$var=" /opt/siteguard/.env; then
            log_info "✅ $var: Configured"
        else
            log_warn "⚠️  $var: Not found"
        fi
    done
else
    log_error "❌ Environment file not found"
fi
echo ""

log_step "10. Disk Space and Memory"
echo "Disk Usage:"
df -h / | tail -1
echo ""
echo "Memory Usage:"
free -h
echo ""
echo "Application Directory Usage:"
if [ -d "/opt/siteguard" ]; then
    du -sh /opt/siteguard/* 2>/dev/null | sort -hr | head -10
fi
echo ""

log_step "11. Recent Logs"
echo "Recent PM2 logs (last 10 lines):"
if command -v pm2 >/dev/null 2>&1; then
    pm2 logs --lines 10 --nostream 2>/dev/null || echo "No recent logs available"
else
    echo "PM2 not available"
fi
echo ""

log_step "12. Network Connectivity Test"
echo "Testing external connectivity:"
if curl -s -m 5 https://api.github.com >/dev/null; then
    log_info "✅ External HTTPS connectivity: OK"
else
    log_warn "⚠️  External HTTPS connectivity: Failed"
fi

if curl -s -m 5 http://httpbin.org/ip >/dev/null; then
    log_info "✅ External HTTP connectivity: OK"
else
    log_warn "⚠️  External HTTP connectivity: Failed"
fi
echo ""

echo "=================================================="
log_info "VPS State Verification completed"
echo ""
log_info "Summary:"
echo "- Check the status indicators above"
echo "- Address any ❌ or ⚠️  items before ONVIF deployment"
echo "- Ensure all required services are ✅ online"
echo ""
log_info "Next Steps:"
echo "1. If issues found, resolve them first"
echo "2. Run: ./configure-onvif-environment.sh"
echo "3. Run: sudo ./configure-onvif-network.sh"
echo "4. Run: ./deploy-onvif-server.sh"
echo "=================================================="
