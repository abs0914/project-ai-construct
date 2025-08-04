#!/bin/bash

# SiteGuard Live Feeds Fix Script
# This script fixes CORS configuration and URL generation issues preventing live feeds from working

set -euo pipefail

# Color codes for output
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

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

log_info "🔧 Starting SiteGuard Live Feeds Fix..."

# Define the correct allowed origins
ALLOWED_ORIGINS=(
    "https://aiconstructpro.com"
    "https://www.aiconstructpro.com"
    "https://preview--project-ai-construct.lovable.app"
    "http://localhost:5173"
    "http://localhost:3000"
)

# Convert array to JavaScript array format
ORIGINS_JS_ARRAY=$(printf "'%s'," "${ALLOWED_ORIGINS[@]}")
ORIGINS_JS_ARRAY="[${ORIGINS_JS_ARRAY%,}]"

log_info "Allowed origins: ${ALLOWED_ORIGINS[*]}"

# 1. Fix Security Server CORS Configuration
log_info "🔒 Fixing Security Server CORS configuration..."
SECURITY_AUTH_MIDDLEWARE="/opt/siteguard/security-server/auth-middleware.js"
if [[ -f "$SECURITY_AUTH_MIDDLEWARE" ]]; then
    # Create backup
    cp "$SECURITY_AUTH_MIDDLEWARE" "$SECURITY_AUTH_MIDDLEWARE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update the allowedOrigins array
    sed -i "s/const allowedOrigins = \[.*\];/const allowedOrigins = $ORIGINS_JS_ARRAY;/" "$SECURITY_AUTH_MIDDLEWARE"
    
    log_success "Security Server CORS configuration updated."
else
    log_warn "Security Server auth-middleware.js not found at $SECURITY_AUTH_MIDDLEWARE"
fi

# 2. Fix Media Server CORS Configuration
log_info "🎥 Fixing Media Server CORS configuration..."
MEDIA_CONFIG="/opt/siteguard/media-server/config.js"
if [[ -f "$MEDIA_CONFIG" ]]; then
    # Create backup
    cp "$MEDIA_CONFIG" "$MEDIA_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update allowedOrigins in security section
    sed -i "s/allowedOrigins: \[.*\]/allowedOrigins: $ORIGINS_JS_ARRAY/" "$MEDIA_CONFIG"
    
    log_success "Media Server CORS configuration updated."
else
    log_warn "Media Server config.js not found at $MEDIA_CONFIG"
fi

# 3. Fix Media Server URL Generation
log_info "🌐 Fixing Media Server URL generation..."
MEDIA_SERVER="/opt/siteguard/media-server/server.js"
if [[ -f "$MEDIA_SERVER" ]]; then
    # Create backup
    cp "$MEDIA_SERVER" "$MEDIA_SERVER.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Replace localhost URLs with public domain URLs
    sed -i 's|http://localhost:8000|https://api.aiconstructpro.com|g' "$MEDIA_SERVER"
    sed -i 's|ws://localhost:8001|wss://api.aiconstructpro.com|g' "$MEDIA_SERVER"
    
    log_success "Media Server URL generation updated."
else
    log_warn "Media Server server.js not found at $MEDIA_SERVER"
fi

# 4. Fix ONVIF Server CORS Configuration
log_info "📹 Fixing ONVIF Server CORS configuration..."
ONVIF_SERVER="/opt/siteguard/onvif-server/server.js"
if [[ -f "$ONVIF_SERVER" ]]; then
    # Create backup
    cp "$ONVIF_SERVER" "$ONVIF_SERVER.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Replace the simple cors() with specific configuration
    cat > /tmp/onvif_cors_config.js << EOF
    this.app.use(cors({
      origin: $ORIGINS_JS_ARRAY,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));
EOF
    
    # Replace the cors() line
    sed -i '/this\.app\.use(cors());/r /tmp/onvif_cors_config.js' "$ONVIF_SERVER"
    sed -i '/this\.app\.use(cors());/d' "$ONVIF_SERVER"
    
    rm /tmp/onvif_cors_config.js
    
    log_success "ONVIF Server CORS configuration updated."
else
    log_warn "ONVIF Server server.js not found at $ONVIF_SERVER"
fi

# 5. Fix Network Server CORS Configuration
log_info "🌐 Fixing Network Server CORS configuration..."
NETWORK_SERVER="/opt/siteguard/network-server/server.js"
if [[ -f "$NETWORK_SERVER" ]]; then
    # Create backup
    cp "$NETWORK_SERVER" "$NETWORK_SERVER.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Replace the simple cors() with specific configuration
    cat > /tmp/network_cors_config.js << EOF
    this.app.use(cors({
      origin: $ORIGINS_JS_ARRAY,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));
EOF
    
    # Replace the cors() line
    sed -i '/this\.app\.use(cors());/r /tmp/network_cors_config.js' "$NETWORK_SERVER"
    sed -i '/this\.app\.use(cors());/d' "$NETWORK_SERVER"
    
    rm /tmp/network_cors_config.js
    
    log_success "Network Server CORS configuration updated."
else
    log_warn "Network Server server.js not found at $NETWORK_SERVER"
fi

# 6. Update environment file
log_info "📝 Updating environment file..."
ENV_FILE="/opt/siteguard/.env"
if [[ -f "$ENV_FILE" ]]; then
    # Create backup
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update CORS_ORIGIN and ALLOWED_ORIGINS
    sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://aiconstructpro.com|" "$ENV_FILE"
    sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$(IFS=,; echo "${ALLOWED_ORIGINS[*]}")|" "$ENV_FILE"
    
    # Add domain configuration if not present
    if ! grep -q "^DOMAIN=" "$ENV_FILE"; then
        echo "DOMAIN=api.aiconstructpro.com" >> "$ENV_FILE"
    fi
    
    if ! grep -q "^PUBLIC_URL=" "$ENV_FILE"; then
        echo "PUBLIC_URL=https://api.aiconstructpro.com" >> "$ENV_FILE"
    fi
    
    log_success "Environment file updated."
else
    log_warn "Environment file not found at $ENV_FILE"
fi

# 7. Update Nginx configuration to handle CORS properly
log_info "🌐 Updating Nginx CORS configuration..."
NGINX_CONFIG="/etc/nginx/sites-available/siteguard"
if [[ -f "$NGINX_CONFIG" ]]; then
    # Create backup
    cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Add comprehensive CORS headers
    cat > /tmp/nginx_cors.conf << 'EOF'
    # CORS headers for all requests
    add_header Access-Control-Allow-Origin "https://aiconstructpro.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, X-API-Key" always;
    add_header Access-Control-Allow-Credentials "true" always;
    add_header Access-Control-Max-Age "86400" always;
    
    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "https://aiconstructpro.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, X-API-Key" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Max-Age "86400" always;
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }
EOF
    
    # Insert CORS configuration into the server block
    sed -i '/server {/r /tmp/nginx_cors.conf' "$NGINX_CONFIG"
    
    rm /tmp/nginx_cors.conf
    
    log_success "Nginx CORS configuration updated."
else
    log_warn "Nginx configuration not found at $NGINX_CONFIG"
fi

# 8. Restart all services
log_info "🔄 Restarting all SiteGuard services..."

# Restart PM2 processes
if command -v pm2 &> /dev/null; then
    pm2 restart all
    log_success "PM2 processes restarted."
else
    log_warn "PM2 not found, skipping PM2 restart."
fi

# Restart Nginx
if systemctl is-active --quiet nginx; then
    systemctl reload nginx
    log_success "Nginx reloaded."
else
    log_warn "Nginx not running or not available."
fi

log_success "🎉 Live feeds fix completed!"
log_info "Please test the live feeds now. The following issues should be resolved:"
log_info "  ✅ CORS headers allowing requests from https://aiconstructpro.com"
log_info "  ✅ Media server generating correct public domain URLs"
log_info "  ✅ All backend services configured with proper CORS"
log_info ""
log_info "If issues persist, check the browser console and PM2 logs:"
log_info "  pm2 logs"
log_info "  pm2 status"
