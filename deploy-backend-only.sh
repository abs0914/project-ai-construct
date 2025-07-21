#!/bin/bash
# SiteGuard Backend-Only Deployment Script for Contabo VPS
# Use this when frontend is hosted on Lovable and you need backend services on VPS

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

# Configuration variables
APP_DIR="/opt/siteguard"
REPO_URL="https://github.com/abs0914/project-ai-construct.git"
API_DOMAIN="${1:-api.localhost}"
FRONTEND_DOMAIN="${2:-aiconstructpro.com}"
NODE_ENV="production"

echo "🚀 Deploying SiteGuard Backend Services Only"
echo "=================================================="
log_info "API Domain: $API_DOMAIN"
log_info "Frontend Domain: $FRONTEND_DOMAIN"
log_info "App Directory: $APP_DIR"
log_info "Environment: $NODE_ENV"
echo "=================================================="

# Check if running as siteguard user
if [[ $(whoami) != "siteguard" ]]; then
   log_error "This script must be run as the 'siteguard' user"
   log_info "Switch to siteguard user: sudo su - siteguard"
   exit 1
fi

log_step "1. Cloning repository..."
cd /opt
if [ -d "$APP_DIR" ]; then
    log_warn "Directory $APP_DIR already exists. Backing up..."
    sudo mv $APP_DIR ${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)
fi

git clone $REPO_URL siteguard
cd $APP_DIR

log_step "2. Installing backend dependencies only..."
npm ci --production=false

log_step "3. Creating backend environment configuration..."
cat > .env << EOF
# SiteGuard Backend Environment Configuration
NODE_ENV=production

# API Ports
MEDIA_SERVER_PORT=3001
ONVIF_SERVER_PORT=3002
NETWORK_SERVER_PORT=3003
SECURITY_SERVER_PORT=3004

# Database Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Security Configuration
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Media Configuration
RECORDINGS_PATH=/opt/siteguard/recordings
MAX_RECORDING_SIZE=10GB
STREAM_QUALITY=high

# Network Configuration
ZEROTIER_NETWORK_ID=your_zerotier_network_id
ZEROTIER_API_TOKEN=your_zerotier_api_token

# ONVIF Configuration
ONVIF_DISCOVERY_TIMEOUT=5000
ONVIF_USERNAME=admin
ONVIF_PASSWORD=your_onvif_password

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/siteguard/app.log

# CORS Configuration for Frontend
FRONTEND_DOMAIN=$FRONTEND_DOMAIN
CORS_ORIGIN=https://$FRONTEND_DOMAIN
ALLOWED_ORIGINS=https://$FRONTEND_DOMAIN,https://www.$FRONTEND_DOMAIN,https://preview--project-ai-construct.lovable.app

# API Domain
API_DOMAIN=$API_DOMAIN
EOF

log_info "Environment file created. Please update the placeholder values."

log_step "4. Creating PM2 ecosystem configuration for backend services only..."
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

log_step "5. Starting backend services with PM2..."
pm2 start ecosystem.config.js
pm2 save

log_step "6. Creating Nginx configuration for API subdomain..."
sudo tee /etc/nginx/sites-available/siteguard-api > /dev/null << EOF
# SiteGuard API Backend Configuration
upstream siteguard_media_server {
    server 127.0.0.1:3001;
}

upstream siteguard_onvif_server {
    server 127.0.0.1:3002;
}

upstream siteguard_network_server {
    server 127.0.0.1:3003;
}

upstream siteguard_security_server {
    server 127.0.0.1:3004;
}

server {
    listen 80;
    server_name $API_DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $API_DOMAIN;
    
    # SSL Configuration (will be configured by Certbot)
    # ssl_certificate /etc/letsencrypt/live/$API_DOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$API_DOMAIN/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # CORS headers for frontend
    add_header Access-Control-Allow-Origin "https://$FRONTEND_DOMAIN" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials "true" always;
    
    # Handle preflight requests
    location / {
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://$FRONTEND_DOMAIN";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With";
            add_header Access-Control-Allow-Credentials "true";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
        
        # Default proxy to security server for auth
        proxy_pass http://siteguard_security_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Media Server API
    location /api/media/ {
        proxy_pass http://siteguard_media_server/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # ONVIF Server API
    location /api/onvif/ {
        proxy_pass http://siteguard_onvif_server/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Network Server API
    location /api/network/ {
        proxy_pass http://siteguard_network_server/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Security Server API
    location /api/security/ {
        proxy_pass http://siteguard_security_server/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket support for all services
    location /socket.io/ {
        proxy_pass http://siteguard_security_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Recordings (protected endpoint)
    location /recordings/ {
        alias /opt/siteguard/recordings/;
        expires 1h;
    }
}
EOF

# Enable the API site
sudo ln -sf /etc/nginx/sites-available/siteguard-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo "=================================================="
log_info "✅ SiteGuard backend deployment completed successfully!"
echo ""
log_info "Next steps:"
echo "1. Update environment variables in: $APP_DIR/.env"
echo "2. Configure SSL certificate: sudo certbot --nginx -d $API_DOMAIN"
echo "3. Update frontend to use API domain: $API_DOMAIN"
echo "4. Test backend services: curl https://$API_DOMAIN/health"
echo ""
log_info "Backend Service URLs:"
echo "- API Base: https://$API_DOMAIN"
echo "- Media Server: https://$API_DOMAIN/api/media/"
echo "- ONVIF Server: https://$API_DOMAIN/api/onvif/"
echo "- Network Server: https://$API_DOMAIN/api/network/"
echo "- Security Server: https://$API_DOMAIN/api/security/"
echo ""
log_info "Frontend Configuration:"
echo "Update your Lovable project environment variables:"
echo "VITE_API_BASE_URL=https://$API_DOMAIN"
echo "VITE_WEBSOCKET_URL=wss://$API_DOMAIN"
echo ""
log_info "Useful commands:"
echo "- View logs: pm2 logs"
echo "- Restart services: pm2 restart all"
echo "- Monitor: pm2 monit"
echo "=================================================="
