#!/bin/bash
# Enhanced initial setup script for Contabo VPS - SiteGuard Deployment
# Run this script as root user

set -e  # Exit on any error

echo "🚀 Setting up SiteGuard on Contabo VPS..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

log_info "Starting system update..."
# Update system packages
apt update && apt upgrade -y

log_info "Installing essential packages..."
# Install essential packages
apt install -y curl wget git unzip software-properties-common \
    build-essential python3-pip htop tree nano vim \
    certbot python3-certbot-nginx

log_info "Creating siteguard user..."
# Create a non-root user for security
if ! id "siteguard" &>/dev/null; then
    adduser --disabled-password --gecos "" siteguard
    usermod -aG sudo siteguard
    log_info "User 'siteguard' created successfully"
else
    log_warn "User 'siteguard' already exists"
fi

log_info "Configuring firewall..."
# Configure firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001:3004/tcp  # Backend services
ufw allow 5432/tcp       # PostgreSQL (if using local DB)
ufw --force enable

log_info "Installing and configuring fail2ban..."
# Install fail2ban for security
apt install -y fail2ban

# Create custom fail2ban configuration
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl start fail2ban

log_info "Installing Node.js 18..."
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
npm_version=$(npm --version)
log_info "Node.js version: $node_version"
log_info "npm version: $npm_version"

log_info "Installing PM2 process manager..."
# Install PM2 globally
npm install -g pm2

log_info "Installing FFmpeg for media processing..."
# Install FFmpeg for media streaming
apt install -y ffmpeg

log_info "Installing Nginx..."
# Install Nginx
apt install -y nginx
systemctl enable nginx
systemctl start nginx

log_info "Setting up directory structure..."
# Create application directory
mkdir -p /opt/siteguard
chown siteguard:siteguard /opt/siteguard

# Create logs directory
mkdir -p /var/log/siteguard
chown siteguard:siteguard /var/log/siteguard

# Create recordings directory
mkdir -p /opt/siteguard/recordings
chown siteguard:siteguard /opt/siteguard/recordings

log_info "Configuring system limits..."
# Configure system limits for better performance
cat >> /etc/security/limits.conf << EOF
siteguard soft nofile 65536
siteguard hard nofile 65536
siteguard soft nproc 32768
siteguard hard nproc 32768
EOF

log_info "Setting up log rotation..."
# Setup log rotation for SiteGuard
cat > /etc/logrotate.d/siteguard << EOF
/var/log/siteguard/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 siteguard siteguard
    postrotate
        pm2 reload all
    endscript
}
EOF

echo "=================================================="
log_info "✅ Basic VPS setup completed successfully!"
echo ""
log_info "Next steps:"
echo "1. Switch to siteguard user: sudo su - siteguard"
echo "2. Run the application deployment script"
echo "3. Configure your domain and SSL certificates"
echo ""
log_warn "Please save the following information:"
echo "- SSH access: ssh siteguard@your-server-ip"
echo "- Application directory: /opt/siteguard"
echo "- Logs directory: /var/log/siteguard"
echo "=================================================="