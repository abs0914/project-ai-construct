#!/bin/bash
# SiteGuard Monitoring and Maintenance Setup Script
# Run this script as root after application deployment

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

echo "📊 Setting up SiteGuard Monitoring and Maintenance"
echo "=================================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

log_step "1. Installing monitoring tools..."
apt update
apt install -y htop iotop nethogs ncdu logrotate

log_step "2. Creating system monitoring script..."
cat > /usr/local/bin/siteguard-monitor.sh << 'EOF'
#!/bin/bash
# SiteGuard System Monitoring Script

# Configuration
LOG_FILE="/var/log/siteguard/monitoring.log"
ALERT_EMAIL="admin@yourdomain.com"  # Update this
CPU_THRESHOLD=80
MEMORY_THRESHOLD=80
DISK_THRESHOLD=85
LOAD_THRESHOLD=4.0

# Create log file if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

send_alert() {
    local subject="$1"
    local message="$2"
    
    # Log the alert
    log_message "ALERT: $subject - $message"
    
    # Send email if mail is configured
    if command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "SiteGuard Alert: $subject" "$ALERT_EMAIL"
    fi
}

# Check CPU usage
check_cpu() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    cpu_usage=${cpu_usage%.*}  # Remove decimal part
    
    if [ "$cpu_usage" -gt "$CPU_THRESHOLD" ]; then
        send_alert "High CPU Usage" "CPU usage is ${cpu_usage}% (threshold: ${CPU_THRESHOLD}%)"
    fi
}

# Check memory usage
check_memory() {
    local memory_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
    
    if [ "$memory_usage" -gt "$MEMORY_THRESHOLD" ]; then
        send_alert "High Memory Usage" "Memory usage is ${memory_usage}% (threshold: ${MEMORY_THRESHOLD}%)"
    fi
}

# Check disk usage
check_disk() {
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
    
    if [ "$disk_usage" -gt "$DISK_THRESHOLD" ]; then
        send_alert "High Disk Usage" "Disk usage is ${disk_usage}% (threshold: ${DISK_THRESHOLD}%)"
    fi
}

# Check load average
check_load() {
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | cut -d',' -f1)
    
    if (( $(echo "$load_avg > $LOAD_THRESHOLD" | bc -l) )); then
        send_alert "High Load Average" "Load average is $load_avg (threshold: $LOAD_THRESHOLD)"
    fi
}

# Check SiteGuard services
check_services() {
    local services=("siteguard-frontend" "siteguard-media-server" "siteguard-onvif-server" "siteguard-network-server" "siteguard-security-server")
    
    for service in "${services[@]}"; do
        if ! pm2 describe "$service" >/dev/null 2>&1; then
            send_alert "Service Down" "SiteGuard service '$service' is not running"
        fi
    done
}

# Check Nginx status
check_nginx() {
    if ! systemctl is-active --quiet nginx; then
        send_alert "Nginx Down" "Nginx web server is not running"
    fi
}

# Check SSL certificate expiration
check_ssl() {
    local domain="$1"
    if [ -n "$domain" ]; then
        local days_until_expiry=$(/usr/local/bin/check-ssl-cert.sh "$domain" 2>/dev/null | grep -o '[0-9]\+' | head -1)
        
        if [ -n "$days_until_expiry" ] && [ "$days_until_expiry" -lt 30 ]; then
            send_alert "SSL Certificate Expiring" "SSL certificate for $domain expires in $days_until_expiry days"
        fi
    fi
}

# Main monitoring function
main() {
    log_message "Starting system monitoring check"
    
    check_cpu
    check_memory
    check_disk
    check_load
    check_services
    check_nginx
    
    # Check SSL if domain is configured
    if [ -f "/opt/siteguard/.env" ]; then
        local domain=$(grep "DOMAIN=" /opt/siteguard/.env | cut -d'=' -f2)
        if [ -n "$domain" ] && [ "$domain" != "localhost" ]; then
            check_ssl "$domain"
        fi
    fi
    
    log_message "Monitoring check completed"
}

# Run monitoring
main "$@"
EOF

chmod +x /usr/local/bin/siteguard-monitor.sh

log_step "3. Creating backup script..."
cat > /usr/local/bin/siteguard-backup.sh << 'EOF'
#!/bin/bash
# SiteGuard Backup Script

BACKUP_DIR="/opt/siteguard/backups"
APP_DIR="/opt/siteguard"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_message "Starting SiteGuard backup..."

# Backup application files (excluding node_modules and recordings)
log_message "Backing up application files..."
tar --exclude='node_modules' \
    --exclude='recordings' \
    --exclude='backups' \
    --exclude='.git' \
    -czf "$BACKUP_DIR/siteguard_app_$DATE.tar.gz" \
    -C "$(dirname "$APP_DIR")" \
    "$(basename "$APP_DIR")"

# Backup configuration files
log_message "Backing up configuration files..."
tar -czf "$BACKUP_DIR/siteguard_config_$DATE.tar.gz" \
    /etc/nginx/sites-available/siteguard \
    /opt/siteguard/.env \
    /opt/siteguard/ecosystem.config.js

# Backup logs (last 7 days)
log_message "Backing up recent logs..."
find /var/log/siteguard -name "*.log" -mtime -7 -exec tar -czf "$BACKUP_DIR/siteguard_logs_$DATE.tar.gz" {} +

# Backup PM2 configuration
log_message "Backing up PM2 configuration..."
sudo -u siteguard pm2 save
tar -czf "$BACKUP_DIR/siteguard_pm2_$DATE.tar.gz" /home/siteguard/.pm2

# Clean old backups (keep last 7 days)
log_message "Cleaning old backups..."
find "$BACKUP_DIR" -name "siteguard_*_*.tar.gz" -mtime +7 -delete

# Create backup summary
cat > "$BACKUP_DIR/backup_summary_$DATE.txt" << EOL
SiteGuard Backup Summary
Date: $(date)
Backup Location: $BACKUP_DIR

Files backed up:
- Application: siteguard_app_$DATE.tar.gz
- Configuration: siteguard_config_$DATE.tar.gz
- Logs: siteguard_logs_$DATE.tar.gz
- PM2: siteguard_pm2_$DATE.tar.gz

Backup completed successfully.
EOL

log_message "Backup completed successfully"
log_message "Backup files created in: $BACKUP_DIR"
EOF

chmod +x /usr/local/bin/siteguard-backup.sh

log_step "4. Creating maintenance script..."
cat > /usr/local/bin/siteguard-maintenance.sh << 'EOF'
#!/bin/bash
# SiteGuard Maintenance Script

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_message "Starting SiteGuard maintenance..."

# Update system packages
log_message "Updating system packages..."
apt update && apt upgrade -y

# Clean package cache
log_message "Cleaning package cache..."
apt autoremove -y
apt autoclean

# Rotate logs
log_message "Rotating logs..."
logrotate -f /etc/logrotate.d/siteguard

# Clean old recordings (older than 30 days)
log_message "Cleaning old recordings..."
find /opt/siteguard/recordings -name "*.mp4" -mtime +30 -delete

# Restart PM2 processes to free memory
log_message "Restarting PM2 processes..."
sudo -u siteguard pm2 restart all

# Check disk space and clean if necessary
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
if [ "$DISK_USAGE" -gt 80 ]; then
    log_message "Disk usage high ($DISK_USAGE%), cleaning temporary files..."
    
    # Clean temporary files
    find /tmp -type f -mtime +7 -delete
    find /var/tmp -type f -mtime +7 -delete
    
    # Clean old logs
    find /var/log -name "*.log.*" -mtime +14 -delete
    
    # Clean npm cache
    sudo -u siteguard npm cache clean --force
fi

log_message "Maintenance completed"
EOF

chmod +x /usr/local/bin/siteguard-maintenance.sh

log_step "5. Setting up cron jobs..."
# Add monitoring cron job (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/siteguard-monitor.sh") | crontab -

# Add backup cron job (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/siteguard-backup.sh") | crontab -

# Add maintenance cron job (weekly on Sunday at 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * 0 /usr/local/bin/siteguard-maintenance.sh") | crontab -

log_step "6. Creating status dashboard script..."
cat > /usr/local/bin/siteguard-status.sh << 'EOF'
#!/bin/bash
# SiteGuard Status Dashboard

echo "🛡️  SiteGuard System Status Dashboard"
echo "========================================"
echo "Generated: $(date)"
echo ""

# System Information
echo "📊 System Information:"
echo "- Uptime: $(uptime -p)"
echo "- Load Average: $(uptime | awk -F'load average:' '{print $2}')"
echo "- CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')"
echo "- Memory Usage: $(free -h | grep Mem | awk '{printf "%.1f%% (%s/%s)", $3/$2*100, $3, $2}')"
echo "- Disk Usage: $(df -h / | tail -1 | awk '{printf "%s (%s)", $5, $4}')"
echo ""

# Service Status
echo "🔧 Service Status:"
sudo -u siteguard pm2 jlist | jq -r '.[] | "- \(.name): \(.pm2_env.status)"' 2>/dev/null || echo "PM2 status unavailable"
echo "- Nginx: $(systemctl is-active nginx)"
echo ""

# Network Status
echo "🌐 Network Status:"
echo "- Active Connections: $(netstat -an | grep ESTABLISHED | wc -l)"
echo "- Listening Ports: $(netstat -tlnp | grep LISTEN | wc -l)"
echo ""

# Recent Alerts
echo "🚨 Recent Alerts (last 24 hours):"
if [ -f "/var/log/siteguard/monitoring.log" ]; then
    grep "ALERT" /var/log/siteguard/monitoring.log | tail -5 || echo "No recent alerts"
else
    echo "No monitoring log found"
fi
echo ""

# Backup Status
echo "💾 Backup Status:"
if [ -d "/opt/siteguard/backups" ]; then
    echo "- Latest backup: $(ls -t /opt/siteguard/backups/siteguard_app_*.tar.gz 2>/dev/null | head -1 | xargs ls -lh 2>/dev/null | awk '{print $9 " (" $5 ", " $6 " " $7 ")"}')"
    echo "- Total backups: $(ls /opt/siteguard/backups/siteguard_app_*.tar.gz 2>/dev/null | wc -l)"
else
    echo "No backups found"
fi

echo "========================================"
EOF

chmod +x /usr/local/bin/siteguard-status.sh

log_step "7. Installing mail utilities for alerts..."
apt install -y mailutils

echo "=================================================="
log_info "✅ Monitoring and maintenance setup completed!"
echo ""
log_info "Available commands:"
echo "- System status: /usr/local/bin/siteguard-status.sh"
echo "- Manual monitoring: /usr/local/bin/siteguard-monitor.sh"
echo "- Manual backup: /usr/local/bin/siteguard-backup.sh"
echo "- Manual maintenance: /usr/local/bin/siteguard-maintenance.sh"
echo ""
log_info "Automated tasks:"
echo "- Monitoring: Every 5 minutes"
echo "- Backups: Daily at 2:00 AM"
echo "- Maintenance: Weekly on Sunday at 3:00 AM"
echo ""
log_warn "Don't forget to:"
echo "1. Configure email alerts in /usr/local/bin/siteguard-monitor.sh"
echo "2. Test the monitoring: /usr/local/bin/siteguard-monitor.sh"
echo "3. Check status: /usr/local/bin/siteguard-status.sh"
echo "=================================================="
