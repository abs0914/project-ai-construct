#!/bin/bash

# Update CORS Configuration for SiteGuard Backend Services
# This script updates CORS settings to allow requests from Lovable frontend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    log_warn "Running as root. Consider running as siteguard user."
fi

# Define the allowed origins for CORS
LOVABLE_ORIGINS=(
    "https://aiconstructpro.com"
    "https://www.aiconstructpro.com"
    "https://preview--project-ai-construct.lovable.app"
    "http://localhost:5173"
    "http://localhost:3000"
)

# Convert array to JavaScript array format
ORIGINS_JS_ARRAY=$(printf "'%s'," "${LOVABLE_ORIGINS[@]}")
ORIGINS_JS_ARRAY="[${ORIGINS_JS_ARRAY%,}]"

log_info "Updating CORS configuration for SiteGuard backend services..."
log_info "Allowed origins: ${LOVABLE_ORIGINS[*]}"

# Update Security Server CORS configuration
SECURITY_AUTH_MIDDLEWARE="/opt/siteguard/security-server/auth-middleware.js"
if [[ -f "$SECURITY_AUTH_MIDDLEWARE" ]]; then
    log_info "Updating Security Server CORS configuration..."
    
    # Create backup
    cp "$SECURITY_AUTH_MIDDLEWARE" "$SECURITY_AUTH_MIDDLEWARE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update the allowedOrigins array
    sed -i "s/const allowedOrigins = \[.*\];/const allowedOrigins = $ORIGINS_JS_ARRAY;/" "$SECURITY_AUTH_MIDDLEWARE"
    
    log_info "Security Server CORS configuration updated."
else
    log_warn "Security Server auth-middleware.js not found at $SECURITY_AUTH_MIDDLEWARE"
fi

# Update Media Server configuration
MEDIA_CONFIG="/opt/siteguard/media-server/config.js"
if [[ -f "$MEDIA_CONFIG" ]]; then
    log_info "Updating Media Server CORS configuration..."
    
    # Create backup
    cp "$MEDIA_CONFIG" "$MEDIA_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update allowedOrigins in security section
    sed -i "s/allowedOrigins: \[.*\]/allowedOrigins: $ORIGINS_JS_ARRAY/" "$MEDIA_CONFIG"
    
    log_info "Media Server CORS configuration updated."
else
    log_warn "Media Server config.js not found at $MEDIA_CONFIG"
fi

# Update ONVIF Server CORS configuration
ONVIF_SERVER="/opt/siteguard/onvif-server/server.js"
if [[ -f "$ONVIF_SERVER" ]]; then
    log_info "Updating ONVIF Server CORS configuration..."
    
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
    
    # Clean up temp file
    rm /tmp/onvif_cors_config.js
    
    log_info "ONVIF Server CORS configuration updated."
else
    log_warn "ONVIF Server server.js not found at $ONVIF_SERVER"
fi

# Update Network Server CORS configuration
NETWORK_SERVER="/opt/siteguard/network-server/server.js"
if [[ -f "$NETWORK_SERVER" ]]; then
    log_info "Updating Network Server CORS configuration..."
    
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
    
    # Clean up temp file
    rm /tmp/network_cors_config.js
    
    log_info "Network Server CORS configuration updated."
else
    log_warn "Network Server server.js not found at $NETWORK_SERVER"
fi

# Update environment file
ENV_FILE="/opt/siteguard/.env"
if [[ -f "$ENV_FILE" ]]; then
    log_info "Updating environment file CORS settings..."
    
    # Create backup
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update CORS_ORIGIN and ALLOWED_ORIGINS
    sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://aiconstructpro.com|" "$ENV_FILE"
    sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$(IFS=,; echo "${LOVABLE_ORIGINS[*]}")|" "$ENV_FILE"
    
    log_info "Environment file CORS settings updated."
else
    log_warn "Environment file not found at $ENV_FILE"
fi

# Restart PM2 services to apply changes
if command -v pm2 &> /dev/null; then
    log_info "Restarting PM2 services to apply CORS changes..."
    pm2 restart all
    log_info "PM2 services restarted."
else
    log_warn "PM2 not found. Please restart the services manually."
fi

log_info "CORS configuration update completed!"
log_info "The following origins are now allowed:"
for origin in "${LOVABLE_ORIGINS[@]}"; do
    echo "  - $origin"
done

log_info "Backup files created with timestamp suffix for rollback if needed."
