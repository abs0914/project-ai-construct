#!/bin/bash
# SiteGuard Application Deployment Script
# Run this script as the 'siteguard' user after initial VPS setup

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
DOMAIN="${1:-localhost}"  # Accept domain as first argument
NODE_ENV="production"

echo "🚀 Deploying SiteGuard Application"
echo "=================================================="
log_info "Domain: $DOMAIN"
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

log_step "2. Installing dependencies..."
npm ci --production=false

log_step "3. Building production assets..."
npm run build

log_step "4. Creating environment configuration..."
cat > .env << EOF
# SiteGuard Production Environment Configuration
NODE_ENV=production
PORT=3000

# API Ports
MEDIA_SERVER_PORT=3001
ONVIF_SERVER_PORT=3002
NETWORK_SERVER_PORT=3003
SECURITY_SERVER_PORT=3004

# Database Configuration (Update with your Supabase credentials)
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

# Domain Configuration
DOMAIN=$DOMAIN
CORS_ORIGIN=https://$DOMAIN
EOF

log_info "Environment file created. Please update the placeholder values."

log_step "5. Creating PM2 ecosystem configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'siteguard-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: '/opt/siteguard',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      log_file: '/var/log/siteguard/frontend.log',
      error_file: '/var/log/siteguard/frontend-error.log',
      out_file: '/var/log/siteguard/frontend-out.log',
      time: true
    },
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

log_step "6. Setting up PM2 startup script..."
pm2 startup
log_warn "Please run the command shown above as root to enable PM2 startup"

log_step "7. Creating systemd service for PM2..."
sudo tee /etc/systemd/system/siteguard.service > /dev/null << EOF
[Unit]
Description=SiteGuard Application
After=network.target

[Service]
Type=forking
User=siteguard
WorkingDirectory=/opt/siteguard
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable siteguard

log_step "8. Starting applications with PM2..."
pm2 start ecosystem.config.js
pm2 save

log_step "9. Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/siteguard > /dev/null << EOF
# SiteGuard Nginx Configuration
upstream siteguard_frontend {
    server 127.0.0.1:3000;
}

upstream siteguard_api {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    server 127.0.0.1:3004;
}

server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration (will be configured by Certbot)
    # ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Frontend
    location / {
        proxy_pass http://siteguard_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://siteguard_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://siteguard_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files
    location /static/ {
        alias /opt/siteguard/dist/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Recordings (protected endpoint)
    location /recordings/ {
        alias /opt/siteguard/recordings/;
        # Add authentication here
        expires 1h;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/siteguard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "=================================================="
log_info "✅ SiteGuard deployment completed successfully!"
echo ""
log_info "Next steps:"
echo "1. Update environment variables in: $APP_DIR/.env"
echo "2. Configure SSL certificate: sudo certbot --nginx -d $DOMAIN"
echo "3. Test the application: curl http://localhost:3000"
echo "4. Monitor services: pm2 status"
echo ""
log_info "Application URLs:"
echo "- Frontend: https://$DOMAIN"
echo "- Media Server: http://localhost:3001"
echo "- ONVIF Server: http://localhost:3002"
echo "- Network Server: http://localhost:3003"
echo "- Security Server: http://localhost:3004"
echo ""
log_info "Useful commands:"
echo "- View logs: pm2 logs"
echo "- Restart services: pm2 restart all"
echo "- Monitor: pm2 monit"
echo "=================================================="
