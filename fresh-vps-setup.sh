#!/bin/bash
# Fresh Contabo VPS Setup Script for SiteGuard
# Complete initial setup from scratch including ONVIF server

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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   log_info "Run: sudo bash fresh-vps-setup.sh"
   exit 1
fi

echo "🚀 Fresh Contabo VPS Setup for SiteGuard"
echo "=================================================="
echo "Server: Singapore VPS 4 Cores"
echo "Target Domain: api.aiconstructpro.com"
echo "Date: $(date)"
echo ""

log_step "1. System Update and Essential Packages"
log_info "Updating system packages..."
apt update && apt upgrade -y

log_info "Installing essential packages..."
apt install -y curl wget git unzip software-properties-common \
    build-essential python3-pip htop tree nano vim \
    certbot python3-certbot-nginx ufw fail2ban \
    net-tools bc jq

log_step "2. Creating SiteGuard User"
if ! id "siteguard" &>/dev/null; then
    adduser --disabled-password --gecos "" siteguard
    usermod -aG sudo siteguard
    log_info "✅ User 'siteguard' created successfully"
    
    # Set up SSH key access for siteguard user
    mkdir -p /home/siteguard/.ssh
    cp /root/.ssh/authorized_keys /home/siteguard/.ssh/ 2>/dev/null || true
    chown -R siteguard:siteguard /home/siteguard/.ssh
    chmod 700 /home/siteguard/.ssh
    chmod 600 /home/siteguard/.ssh/authorized_keys 2>/dev/null || true
else
    log_warn "User 'siteguard' already exists"
fi

log_step "3. Configuring Firewall"
log_info "Setting up UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001:3004/tcp  # SiteGuard backend services
ufw allow 3702/udp       # ONVIF WS-Discovery
ufw allow 554/tcp        # RTSP streaming
ufw allow 8080/tcp       # ONVIF alternative HTTP
ufw --force enable

log_step "4. Installing Node.js 18"
log_info "Installing Node.js 18 LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node_version=$(node --version)
npm_version=$(npm --version)
log_info "✅ Node.js version: $node_version"
log_info "✅ npm version: $npm_version"

log_step "5. Installing PM2 Process Manager"
npm install -g pm2
log_info "✅ PM2 installed globally"

log_step "6. Installing FFmpeg for Media Processing"
apt install -y ffmpeg
log_info "✅ FFmpeg installed"

log_step "7. Installing and Configuring Nginx"
apt install -y nginx
systemctl enable nginx
systemctl start nginx
log_info "✅ Nginx installed and started"

log_step "8. Setting up Directory Structure"
mkdir -p /opt/siteguard
mkdir -p /var/log/siteguard
mkdir -p /opt/siteguard/recordings
chown -R siteguard:siteguard /opt/siteguard
chown -R siteguard:siteguard /var/log/siteguard

log_step "9. Configuring System Limits"
cat >> /etc/security/limits.conf << EOF
siteguard soft nofile 65536
siteguard hard nofile 65536
siteguard soft nproc 32768
siteguard hard nproc 32768
EOF

log_step "10. Configuring Fail2Ban"
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

log_step "11. Configuring Network for ONVIF"
log_info "Enabling IP forwarding and multicast..."
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
echo "net.ipv4.conf.all.mc_forwarding=1" >> /etc/sysctl.conf
sysctl -p

# Get primary network interface
PRIMARY_INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n1)
log_info "Primary network interface: $PRIMARY_INTERFACE"

# Enable multicast on primary interface
if [ -n "$PRIMARY_INTERFACE" ]; then
    ip link set dev $PRIMARY_INTERFACE multicast on
    log_info "✅ Multicast enabled on $PRIMARY_INTERFACE"
fi

log_step "12. Creating Startup Services"
# Create ONVIF network setup service
cat > /etc/systemd/system/onvif-network-setup.service << EOF
[Unit]
Description=ONVIF Network Configuration
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'ip link set dev $PRIMARY_INTERFACE multicast on && ip route add 239.255.255.250/32 dev $PRIMARY_INTERFACE || true'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable onvif-network-setup.service

log_step "13. Setting up PM2 Startup"
# Configure PM2 to start on boot
sudo -u siteguard pm2 startup
log_warn "Please run the PM2 startup command shown above after this script completes"

echo ""
echo "=================================================="
log_info "✅ Fresh VPS Setup Completed Successfully!"
echo ""
log_info "System Summary:"
echo "- OS: $(lsb_release -d | cut -f2)"
echo "- Node.js: $node_version"
echo "- PM2: Installed"
echo "- Nginx: Running"
echo "- UFW Firewall: Active"
echo "- Fail2Ban: Active"
echo ""
log_info "Next Steps:"
echo "1. Switch to siteguard user: sudo su - siteguard"
echo "2. Run the SiteGuard deployment script"
echo "3. Configure domain and SSL certificates"
echo ""
log_info "Important Information:"
echo "- SSH access: ssh siteguard@your-server-ip"
echo "- Application directory: /opt/siteguard"
echo "- Logs directory: /var/log/siteguard"
echo "- Firewall ports opened: 22, 80, 443, 3001-3004, 3702, 554, 8080"
echo ""
log_warn "Security Notes:"
echo "- Change default passwords"
echo "- Configure SSH key authentication"
echo "- Review firewall rules"
echo "- Set up regular backups"
echo "=================================================="
