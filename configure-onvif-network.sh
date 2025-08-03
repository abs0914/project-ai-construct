#!/bin/bash
# ONVIF Network and Firewall Configuration Script
# Configures network settings and firewall rules for ONVIF server

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
   log_error "This script must be run as root for network configuration"
   log_info "Run: sudo ./configure-onvif-network.sh"
   exit 1
fi

echo "🌐 ONVIF Network and Firewall Configuration"
echo "=================================================="

log_step "1. Configuring UFW firewall for ONVIF..."

# Enable UFW if not already enabled
if ! ufw status | grep -q "Status: active"; then
    log_info "Enabling UFW firewall..."
    ufw --force enable
fi

# ONVIF Server API port
log_info "Allowing ONVIF Server port 3002/tcp..."
ufw allow 3002/tcp comment "ONVIF Server API"

# WS-Discovery multicast port
log_info "Allowing WS-Discovery port 3702/udp..."
ufw allow 3702/udp comment "ONVIF WS-Discovery"

# Standard ONVIF device ports
log_info "Allowing ONVIF device communication ports..."
ufw allow 80/tcp comment "ONVIF HTTP"
ufw allow 8080/tcp comment "ONVIF Alt HTTP"
ufw allow 554/tcp comment "RTSP Streaming"
ufw allow 8554/tcp comment "RTSP Alt Port"

# Additional common ONVIF ports
ufw allow 1024:65535/tcp comment "ONVIF Dynamic Ports"

log_step "2. Configuring multicast routing..."

# Enable IP forwarding for multicast
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
echo "net.ipv4.conf.all.mc_forwarding=1" >> /etc/sysctl.conf

# Apply sysctl changes
sysctl -p

log_step "3. Configuring network interfaces for multicast..."

# Get primary network interface
PRIMARY_INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n1)
log_info "Primary network interface: $PRIMARY_INTERFACE"

# Enable multicast on primary interface
if [ -n "$PRIMARY_INTERFACE" ]; then
    ip link set dev $PRIMARY_INTERFACE multicast on
    log_info "Multicast enabled on $PRIMARY_INTERFACE"
fi

log_step "4. Adding multicast route for ONVIF discovery..."

# Add multicast route for ONVIF WS-Discovery
if [ -n "$PRIMARY_INTERFACE" ]; then
    # Remove existing route if present
    ip route del 239.255.255.250/32 2>/dev/null || true
    
    # Add new multicast route
    ip route add 239.255.255.250/32 dev $PRIMARY_INTERFACE
    log_info "Multicast route added for ONVIF discovery"
fi

log_step "5. Creating network configuration persistence..."

# Create script to restore network settings on boot
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

# Enable the service
systemctl daemon-reload
systemctl enable onvif-network-setup.service
log_info "ONVIF network setup service created and enabled"

log_step "6. Testing network configuration..."

# Test multicast capability
log_info "Testing multicast capability..."
if ping -c 1 -W 2 239.255.255.250 >/dev/null 2>&1; then
    log_info "✅ Multicast connectivity test passed"
else
    log_warn "⚠️  Multicast connectivity test failed (this may be normal)"
fi

# Test UDP port binding
log_info "Testing UDP port 3702 binding..."
if netstat -ulnp | grep -q ":3702 "; then
    log_warn "Port 3702 is already in use"
else
    log_info "✅ Port 3702 is available"
fi

log_step "7. Creating ONVIF network diagnostic script..."

cat > /opt/siteguard/diagnose-onvif-network.sh << 'EOF'
#!/bin/bash
# ONVIF Network Diagnostic Script

echo "🔍 ONVIF Network Diagnostics"
echo "============================"

echo "1. Network Interface Status:"
ip link show | grep -E "(UP|DOWN|multicast)"
echo ""

echo "2. Multicast Routes:"
ip route show | grep 239.255.255.250 || echo "No ONVIF multicast routes found"
echo ""

echo "3. Firewall Status:"
ufw status | grep -E "(3002|3702|554|8080)"
echo ""

echo "4. Port Listening Status:"
echo "ONVIF Server (3002/tcp):"
netstat -tlnp | grep :3002 || echo "Not listening"
echo "WS-Discovery (3702/udp):"
netstat -ulnp | grep :3702 || echo "Not listening"
echo ""

echo "5. Multicast Test:"
timeout 2 ping -c 1 239.255.255.250 >/dev/null 2>&1 && echo "✅ Multicast reachable" || echo "❌ Multicast not reachable"
echo ""

echo "6. ONVIF Server Test:"
curl -s -m 5 http://localhost:3002/api/onvif/devices >/dev/null 2>&1 && echo "✅ ONVIF Server responding" || echo "❌ ONVIF Server not responding"
echo ""

echo "============================"
EOF

chmod +x /opt/siteguard/diagnose-onvif-network.sh
chown siteguard:siteguard /opt/siteguard/diagnose-onvif-network.sh

log_step "8. Displaying current firewall status..."
ufw status numbered

echo ""
echo "=================================================="
log_info "✅ ONVIF Network Configuration completed!"
echo ""
log_info "Configuration Summary:"
echo "- Firewall rules added for ONVIF ports"
echo "- Multicast routing enabled"
echo "- Network interfaces configured for multicast"
echo "- Persistent network setup service created"
echo ""
log_info "ONVIF Ports Configured:"
echo "- 3002/tcp - ONVIF Server API"
echo "- 3702/udp - WS-Discovery multicast"
echo "- 80/tcp   - ONVIF HTTP"
echo "- 554/tcp  - RTSP streaming"
echo "- 8080/tcp - ONVIF alternative HTTP"
echo ""
log_info "Diagnostic Tools:"
echo "- Network diagnostics: /opt/siteguard/diagnose-onvif-network.sh"
echo "- View firewall: ufw status"
echo "- Check routes: ip route show"
echo ""
log_warn "Note: Some ONVIF cameras may use additional ports"
log_warn "Monitor logs and add rules as needed for specific devices"
echo "=================================================="
