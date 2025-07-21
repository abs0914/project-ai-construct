#!/bin/bash
# SSL Certificate Setup Script for SiteGuard
# Run this script after deploying the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if domain is provided
if [ -z "$1" ]; then
    log_error "Usage: $0 <domain>"
    log_info "Example: $0 siteguard.yourdomain.com"
    exit 1
fi

DOMAIN="$1"
EMAIL="${2:-admin@$DOMAIN}"

echo "🔒 Setting up SSL Certificate for SiteGuard"
echo "=================================================="
log_info "Domain: $DOMAIN"
log_info "Email: $EMAIL"
echo "=================================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

log_info "Testing Nginx configuration..."
nginx -t

log_info "Obtaining SSL certificate from Let's Encrypt..."
certbot --nginx \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domains "$DOMAIN" \
    --redirect

log_info "Setting up automatic certificate renewal..."
# Create renewal hook
cat > /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF

chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh

# Test automatic renewal
log_info "Testing certificate renewal..."
certbot renew --dry-run

log_info "Configuring enhanced security headers..."
# Create security configuration snippet
cat > /etc/nginx/snippets/ssl-security.conf << 'EOF'
# SSL Security Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;

# Security Headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options DENY always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none';" always;
EOF

# Update Nginx configuration to include security headers
sed -i '/ssl_certificate_key/a\\n    # Include SSL security configuration\n    include /etc/nginx/snippets/ssl-security.conf;' /etc/nginx/sites-available/siteguard

log_info "Reloading Nginx with new configuration..."
nginx -t && systemctl reload nginx

log_info "Setting up monitoring for certificate expiration..."
# Create certificate monitoring script
cat > /usr/local/bin/check-ssl-cert.sh << 'EOF'
#!/bin/bash
# SSL Certificate Monitoring Script

DOMAIN="$1"
THRESHOLD_DAYS=30

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain>"
    exit 1
fi

# Get certificate expiration date
EXPIRY_DATE=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)

# Convert to epoch time
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)

# Calculate days until expiration
DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

echo "SSL Certificate for $DOMAIN expires in $DAYS_UNTIL_EXPIRY days"

if [ $DAYS_UNTIL_EXPIRY -lt $THRESHOLD_DAYS ]; then
    echo "WARNING: SSL certificate expires soon!"
    # Here you could add email notification or other alerting
fi
EOF

chmod +x /usr/local/bin/check-ssl-cert.sh

# Add to crontab for daily monitoring
(crontab -l 2>/dev/null; echo "0 6 * * * /usr/local/bin/check-ssl-cert.sh $DOMAIN") | crontab -

log_info "Creating SSL certificate backup script..."
cat > /usr/local/bin/backup-ssl-certs.sh << 'EOF'
#!/bin/bash
# SSL Certificate Backup Script

BACKUP_DIR="/opt/siteguard/backups/ssl"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup Let's Encrypt certificates
tar -czf "$BACKUP_DIR/letsencrypt_backup_$DATE.tar.gz" -C /etc/letsencrypt .

# Keep only last 7 backups
find "$BACKUP_DIR" -name "letsencrypt_backup_*.tar.gz" -mtime +7 -delete

echo "SSL certificates backed up to $BACKUP_DIR/letsencrypt_backup_$DATE.tar.gz"
EOF

chmod +x /usr/local/bin/backup-ssl-certs.sh

# Add to crontab for weekly backups
(crontab -l 2>/dev/null; echo "0 2 * * 0 /usr/local/bin/backup-ssl-certs.sh") | crontab -

echo "=================================================="
log_info "✅ SSL setup completed successfully!"
echo ""
log_info "Certificate details:"
certbot certificates

echo ""
log_info "Your SiteGuard application is now secured with SSL!"
log_info "Access your application at: https://$DOMAIN"
echo ""
log_info "SSL monitoring:"
echo "- Certificate check: /usr/local/bin/check-ssl-cert.sh $DOMAIN"
echo "- Backup certificates: /usr/local/bin/backup-ssl-certs.sh"
echo "- Auto-renewal test: certbot renew --dry-run"
echo "=================================================="
