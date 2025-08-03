#!/bin/bash
# Domain and SSL Configuration Script for SiteGuard
# Configures Nginx and Let's Encrypt SSL for api.aiconstructpro.com

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
API_DOMAIN="api.aiconstructpro.com"
EMAIL="alrsantiago@gmail.com"  # Change this to your email

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   log_info "Run: sudo ./configure-domain-ssl.sh"
   exit 1
fi

echo "🌐 Domain and SSL Configuration for SiteGuard"
echo "=================================================="
echo "Domain: $API_DOMAIN"
echo "Email: $EMAIL"
echo "Date: $(date)"
echo ""

log_step "1. Testing Domain Resolution"
log_info "Checking if $API_DOMAIN resolves to this server..."
SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "unknown")
DOMAIN_IP=$(dig +short $API_DOMAIN | tail -n1)

echo "Server IP: $SERVER_IP"
echo "Domain IP: $DOMAIN_IP"

if [ "$SERVER_IP" = "$DOMAIN_IP" ]; then
    log_info "✅ Domain resolves correctly to this server"
else
    log_warn "⚠️  Domain does not resolve to this server"
    log_warn "Please update your DNS records to point $API_DOMAIN to $SERVER_IP"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

log_step "2. Creating Nginx Configuration"
log_info "Creating Nginx configuration for $API_DOMAIN..."

cat > /etc/nginx/sites-available/siteguard-api << EOF
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

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=onvif_limit:10m rate=5r/s;

server {
    listen 80;
    server_name $API_DOMAIN;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # CORS headers
    add_header Access-Control-Allow-Origin "https://preview--project-ai-construct.lovable.app" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
    add_header Access-Control-Allow-Credentials true always;
    
    # Handle preflight requests
    if (\$request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "https://preview--project-ai-construct.lovable.app";
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
        add_header Access-Control-Allow-Credentials true;
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }
    
    # Media Server Routes
    location /api/media/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://siteguard_media_server/api/media/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # ONVIF Server Routes
    location /api/onvif/ {
        limit_req zone=onvif_limit burst=10 nodelay;
        proxy_pass http://siteguard_onvif_server/api/onvif/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 30s;
    }
    
    # Network Server Routes
    location /api/network/ {
        limit_req zone=api_limit burst=15 nodelay;
        proxy_pass http://siteguard_network_server/api/network/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Security Server Routes
    location /api/security/ {
        limit_req zone=api_limit burst=15 nodelay;
        proxy_pass http://siteguard_security_server/api/security/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket Support
    location /socket.io/ {
        proxy_pass http://siteguard_media_server/socket.io/;
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
    
    # Default route
    location / {
        return 200 "SiteGuard API Server - $API_DOMAIN";
        add_header Content-Type text/plain;
    }
}
EOF

log_info "✅ Nginx configuration created"

log_step "3. Enabling Nginx Site"
ln -sf /etc/nginx/sites-available/siteguard-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
if [ $? -eq 0 ]; then
    log_info "✅ Nginx configuration is valid"
    systemctl reload nginx
else
    log_error "❌ Nginx configuration is invalid"
    exit 1
fi

log_step "4. Obtaining SSL Certificate"
log_info "Obtaining Let's Encrypt SSL certificate for $API_DOMAIN..."

# Stop nginx temporarily for standalone mode
systemctl stop nginx

# Obtain certificate
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$API_DOMAIN"

if [ $? -eq 0 ]; then
    log_info "✅ SSL certificate obtained successfully"
else
    log_error "❌ Failed to obtain SSL certificate"
    systemctl start nginx
    exit 1
fi

log_step "5. Updating Nginx Configuration for HTTPS"
cat > /etc/nginx/sites-available/siteguard-api << EOF
# SiteGuard API Backend Configuration with SSL
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

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=onvif_limit:10m rate=5r/s;

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $API_DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $API_DOMAIN;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$API_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$API_DOMAIN/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # CORS headers
    add_header Access-Control-Allow-Origin "https://preview--project-ai-construct.lovable.app" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
    add_header Access-Control-Allow-Credentials true always;
    
    # Handle preflight requests
    if (\$request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "https://preview--project-ai-construct.lovable.app";
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
        add_header Access-Control-Allow-Credentials true;
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }
    
    # Media Server Routes
    location /api/media/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://siteguard_media_server/api/media/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # ONVIF Server Routes
    location /api/onvif/ {
        limit_req zone=onvif_limit burst=10 nodelay;
        proxy_pass http://siteguard_onvif_server/api/onvif/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 30s;
    }
    
    # Network Server Routes
    location /api/network/ {
        limit_req zone=api_limit burst=15 nodelay;
        proxy_pass http://siteguard_network_server/api/network/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Security Server Routes
    location /api/security/ {
        limit_req zone=api_limit burst=15 nodelay;
        proxy_pass http://siteguard_security_server/api/security/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket Support
    location /socket.io/ {
        proxy_pass http://siteguard_media_server/socket.io/;
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
    
    # Default route
    location / {
        return 200 "SiteGuard API Server - $API_DOMAIN (HTTPS)";
        add_header Content-Type text/plain;
    }
}
EOF

# Test and reload Nginx
nginx -t && systemctl start nginx && systemctl reload nginx

log_step "6. Setting up SSL Certificate Auto-Renewal"
# Create renewal hook
cat > /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF
chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh

# Test renewal
certbot renew --dry-run

log_step "7. Testing Configuration"
log_info "Testing HTTPS configuration..."
sleep 2

if curl -f -s -k "https://$API_DOMAIN/health" >/dev/null; then
    log_info "✅ HTTPS is working correctly"
else
    log_warn "⚠️  HTTPS test failed, but configuration may still be correct"
fi

echo ""
echo "=================================================="
log_info "✅ Domain and SSL Configuration Completed!"
echo ""
log_info "Configuration Summary:"
echo "- Domain: $API_DOMAIN"
echo "- SSL Certificate: Let's Encrypt"
echo "- HTTPS: Enabled with HTTP redirect"
echo "- Security Headers: Configured"
echo "- Rate Limiting: Enabled"
echo ""
log_info "API Endpoints:"
echo "- Media Server: https://$API_DOMAIN/api/media/"
echo "- ONVIF Server: https://$API_DOMAIN/api/onvif/"
echo "- Network Server: https://$API_DOMAIN/api/network/"
echo "- Security Server: https://$API_DOMAIN/api/security/"
echo "- Health Check: https://$API_DOMAIN/health"
echo ""
log_info "SSL Certificate:"
echo "- Auto-renewal: Configured"
echo "- Expires: $(openssl x509 -enddate -noout -in /etc/letsencrypt/live/$API_DOMAIN/cert.pem | cut -d= -f2)"
echo ""
log_warn "Next Steps:"
echo "1. Test all endpoints: curl https://$API_DOMAIN/health"
echo "2. Update frontend environment: VITE_API_BASE_URL=https://$API_DOMAIN"
echo "3. Test ONVIF functionality: curl https://$API_DOMAIN/api/onvif/devices"
echo "=================================================="
