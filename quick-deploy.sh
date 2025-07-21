#!/bin/bash
# SiteGuard Quick Deployment Script for Contabo VPS
# This script automates the entire deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
REPO_URL="https://github.com/abs0914/project-ai-construct.git"
APP_DIR="/opt/siteguard"

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

log_header() {
    echo -e "${CYAN}$1${NC}"
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -d, --domain DOMAIN     Domain name for the deployment (required)"
    echo "  -e, --email EMAIL       Email for SSL certificate (optional)"
    echo "  -s, --skip-ssl          Skip SSL certificate setup"
    echo "  -m, --skip-monitoring   Skip monitoring setup"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -d siteguard.example.com -e admin@example.com"
    echo "  $0 -d localhost -s -m  # Local development setup"
}

# Parse command line arguments
DOMAIN=""
EMAIL=""
SKIP_SSL=false
SKIP_MONITORING=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -e|--email)
            EMAIL="$2"
            shift 2
            ;;
        -s|--skip-ssl)
            SKIP_SSL=true
            shift
            ;;
        -m|--skip-monitoring)
            SKIP_MONITORING=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$DOMAIN" ]; then
    log_error "Domain is required. Use -d or --domain to specify."
    show_usage
    exit 1
fi

# Set default email if not provided
if [ -z "$EMAIL" ]; then
    EMAIL="admin@$DOMAIN"
fi

# Welcome message
clear
log_header "🛡️  SiteGuard Quick Deployment for Contabo VPS"
log_header "=================================================="
echo ""
log_info "Configuration:"
echo "  Domain: $DOMAIN"
echo "  Email: $EMAIL"
echo "  Skip SSL: $SKIP_SSL"
echo "  Skip Monitoring: $SKIP_MONITORING"
echo ""

# Confirmation
read -p "Do you want to proceed with the deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Deployment cancelled."
    exit 0
fi

echo ""
log_header "Starting SiteGuard deployment..."
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root for initial setup"
    log_info "Please run: sudo $0 $*"
    exit 1
fi

# Step 1: Initial VPS Setup
log_step "1/6 - Running initial VPS setup..."
if [ -f "./contabo-initial-setup.sh" ]; then
    chmod +x ./contabo-initial-setup.sh
    ./contabo-initial-setup.sh
else
    log_warn "Initial setup script not found, downloading..."
    wget -q https://raw.githubusercontent.com/abs0914/project-ai-construct/main/contabo-initial-setup.sh
    chmod +x contabo-initial-setup.sh
    ./contabo-initial-setup.sh
fi

log_info "✅ Initial VPS setup completed"
echo ""

# Step 2: Deploy Application
log_step "2/6 - Deploying SiteGuard application..."
if [ -f "./deploy-siteguard.sh" ]; then
    chmod +x ./deploy-siteguard.sh
else
    log_warn "Deployment script not found, downloading..."
    wget -q https://raw.githubusercontent.com/abs0914/project-ai-construct/main/deploy-siteguard.sh
    chmod +x deploy-siteguard.sh
fi

# Run deployment as siteguard user
sudo -u siteguard bash -c "cd /home/siteguard && ./deploy-siteguard.sh $DOMAIN"

log_info "✅ Application deployment completed"
echo ""

# Step 3: Configure SSL (if not skipped)
if [ "$SKIP_SSL" = false ] && [ "$DOMAIN" != "localhost" ]; then
    log_step "3/6 - Setting up SSL certificate..."
    if [ -f "./setup-ssl.sh" ]; then
        chmod +x ./setup-ssl.sh
    else
        log_warn "SSL setup script not found, downloading..."
        wget -q https://raw.githubusercontent.com/abs0914/project-ai-construct/main/setup-ssl.sh
        chmod +x setup-ssl.sh
    fi
    
    ./setup-ssl.sh "$DOMAIN" "$EMAIL"
    log_info "✅ SSL certificate setup completed"
else
    log_warn "⏭️  SSL setup skipped"
fi
echo ""

# Step 4: Setup Monitoring (if not skipped)
if [ "$SKIP_MONITORING" = false ]; then
    log_step "4/6 - Setting up monitoring and maintenance..."
    if [ -f "./monitoring-setup.sh" ]; then
        chmod +x ./monitoring-setup.sh
    else
        log_warn "Monitoring setup script not found, downloading..."
        wget -q https://raw.githubusercontent.com/abs0914/project-ai-construct/main/monitoring-setup.sh
        chmod +x monitoring-setup.sh
    fi
    
    ./monitoring-setup.sh
    log_info "✅ Monitoring and maintenance setup completed"
else
    log_warn "⏭️  Monitoring setup skipped"
fi
echo ""

# Step 5: Configure Environment
log_step "5/6 - Configuring environment variables..."
log_warn "Please update the environment configuration:"
echo ""
echo "1. Edit the environment file:"
echo "   sudo -u siteguard nano $APP_DIR/.env"
echo ""
echo "2. Update these critical variables:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - ZEROTIER_NETWORK_ID (if using ZeroTier)"
echo "   - ONVIF_PASSWORD"
echo ""

read -p "Press Enter after updating the environment file..."
echo ""

# Restart services after configuration
log_info "Restarting services with new configuration..."
sudo -u siteguard pm2 restart all

log_info "✅ Environment configuration completed"
echo ""

# Step 6: Run Tests
log_step "6/6 - Running deployment tests..."
if [ -f "./test-deployment.sh" ]; then
    chmod +x ./test-deployment.sh
else
    log_warn "Test script not found, downloading..."
    wget -q https://raw.githubusercontent.com/abs0914/project-ai-construct/main/test-deployment.sh
    chmod +x test-deployment.sh
fi

./test-deployment.sh

# Final status check
log_info "Getting final system status..."
if [ -f "/usr/local/bin/siteguard-status.sh" ]; then
    /usr/local/bin/siteguard-status.sh
fi

# Deployment summary
echo ""
log_header "🎉 SiteGuard Deployment Completed!"
log_header "=================================="
echo ""
log_info "Your SiteGuard system is now deployed and running!"
echo ""

if [ "$DOMAIN" != "localhost" ]; then
    if [ "$SKIP_SSL" = false ]; then
        log_info "🌐 Access your application at: https://$DOMAIN"
    else
        log_info "🌐 Access your application at: http://$DOMAIN"
    fi
else
    log_info "🌐 Access your application at: http://localhost"
fi

echo ""
log_info "📊 Service endpoints:"
echo "  - Frontend: Port 3000"
echo "  - Media Server: Port 3001"
echo "  - ONVIF Server: Port 3002"
echo "  - Network Server: Port 3003"
echo "  - Security Server: Port 3004"
echo ""

log_info "🔧 Useful commands:"
echo "  - View status: /usr/local/bin/siteguard-status.sh"
echo "  - View logs: sudo -u siteguard pm2 logs"
echo "  - Restart services: sudo -u siteguard pm2 restart all"
echo "  - Monitor services: sudo -u siteguard pm2 monit"
echo ""

if [ "$SKIP_MONITORING" = false ]; then
    log_info "📈 Monitoring:"
    echo "  - System monitoring: Every 5 minutes"
    echo "  - Automated backups: Daily at 2:00 AM"
    echo "  - Maintenance: Weekly on Sunday at 3:00 AM"
    echo ""
fi

log_info "📚 Next steps:"
echo "1. Configure cameras and network devices"
echo "2. Set up user accounts and permissions"
echo "3. Test recording and streaming functionality"
echo "4. Configure alerts and notifications"
echo ""

log_warn "🔒 Security reminders:"
echo "1. Change default passwords"
echo "2. Configure firewall rules for your network"
echo "3. Set up regular backups"
echo "4. Monitor system logs regularly"
echo ""

log_info "📖 For detailed documentation, see: DEPLOYMENT_GUIDE.md"
log_info "🆘 For support, check the troubleshooting section in the guide"

echo ""
log_header "Happy monitoring with SiteGuard! 🛡️"
