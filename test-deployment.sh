#!/bin/bash
# SiteGuard Deployment Testing Script
# Run this script to validate your SiteGuard deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $test_name"
        if [ -n "$details" ]; then
            echo -e "  ${RED}Details:${NC} $details"
        fi
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test system requirements
test_system_requirements() {
    log_test "Testing system requirements..."
    
    # Check Node.js version
    if command -v node >/dev/null 2>&1; then
        node_version=$(node --version | cut -d'v' -f2)
        if [ "$(printf '%s\n' "18.0.0" "$node_version" | sort -V | head -n1)" = "18.0.0" ]; then
            test_result "Node.js version (>= 18.0.0)" "PASS"
        else
            test_result "Node.js version (>= 18.0.0)" "FAIL" "Found version $node_version"
        fi
    else
        test_result "Node.js installation" "FAIL" "Node.js not found"
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        test_result "npm installation" "PASS"
    else
        test_result "npm installation" "FAIL"
    fi
    
    # Check PM2
    if command -v pm2 >/dev/null 2>&1; then
        test_result "PM2 installation" "PASS"
    else
        test_result "PM2 installation" "FAIL"
    fi
    
    # Check FFmpeg
    if command -v ffmpeg >/dev/null 2>&1; then
        test_result "FFmpeg installation" "PASS"
    else
        test_result "FFmpeg installation" "FAIL"
    fi
    
    # Check Nginx
    if command -v nginx >/dev/null 2>&1; then
        test_result "Nginx installation" "PASS"
    else
        test_result "Nginx installation" "FAIL"
    fi
}

# Test application files
test_application_files() {
    log_test "Testing application files..."
    
    # Check application directory
    if [ -d "/opt/siteguard" ]; then
        test_result "Application directory exists" "PASS"
    else
        test_result "Application directory exists" "FAIL" "/opt/siteguard not found"
        return
    fi
    
    # Check key files
    local files=(
        "/opt/siteguard/package.json"
        "/opt/siteguard/.env"
        "/opt/siteguard/ecosystem.config.js"
        "/opt/siteguard/dist/index.html"
    )
    
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            test_result "File exists: $(basename $file)" "PASS"
        else
            test_result "File exists: $(basename $file)" "FAIL" "$file not found"
        fi
    done
    
    # Check directories
    local dirs=(
        "/opt/siteguard/media-server"
        "/opt/siteguard/onvif-server"
        "/opt/siteguard/network-server"
        "/opt/siteguard/security-server"
        "/opt/siteguard/recordings"
        "/var/log/siteguard"
    )
    
    for dir in "${dirs[@]}"; do
        if [ -d "$dir" ]; then
            test_result "Directory exists: $(basename $dir)" "PASS"
        else
            test_result "Directory exists: $(basename $dir)" "FAIL" "$dir not found"
        fi
    done
}

# Test PM2 services
test_pm2_services() {
    log_test "Testing PM2 services..."
    
    local services=(
        "siteguard-frontend"
        "siteguard-media-server"
        "siteguard-onvif-server"
        "siteguard-network-server"
        "siteguard-security-server"
    )
    
    for service in "${services[@]}"; do
        if sudo -u siteguard pm2 describe "$service" >/dev/null 2>&1; then
            local status=$(sudo -u siteguard pm2 jlist | jq -r ".[] | select(.name==\"$service\") | .pm2_env.status" 2>/dev/null)
            if [ "$status" = "online" ]; then
                test_result "PM2 service: $service" "PASS"
            else
                test_result "PM2 service: $service" "FAIL" "Status: $status"
            fi
        else
            test_result "PM2 service: $service" "FAIL" "Service not found"
        fi
    done
}

# Test network connectivity
test_network_connectivity() {
    log_test "Testing network connectivity..."
    
    local ports=(
        "3000:Frontend"
        "3001:Media Server"
        "3002:ONVIF Server"
        "3003:Network Server"
        "3004:Security Server"
    )
    
    for port_info in "${ports[@]}"; do
        local port=$(echo $port_info | cut -d':' -f1)
        local service=$(echo $port_info | cut -d':' -f2)
        
        if netstat -tlnp | grep ":$port " >/dev/null 2>&1; then
            test_result "Port $port ($service) listening" "PASS"
        else
            test_result "Port $port ($service) listening" "FAIL"
        fi
    done
    
    # Test HTTP responses
    local endpoints=(
        "http://localhost:3000:Frontend"
        "http://localhost:3001/health:Media Server"
        "http://localhost:3002/health:ONVIF Server"
        "http://localhost:3003/health:Network Server"
        "http://localhost:3004/health:Security Server"
    )
    
    for endpoint_info in "${endpoints[@]}"; do
        local endpoint=$(echo $endpoint_info | cut -d':' -f1,2)
        local service=$(echo $endpoint_info | cut -d':' -f3)
        
        if curl -s -o /dev/null -w "%{http_code}" "$endpoint" --connect-timeout 5 | grep -q "200\|404"; then
            test_result "HTTP response: $service" "PASS"
        else
            test_result "HTTP response: $service" "FAIL" "No response from $endpoint"
        fi
    done
}

# Test Nginx configuration
test_nginx_configuration() {
    log_test "Testing Nginx configuration..."
    
    # Check Nginx status
    if systemctl is-active --quiet nginx; then
        test_result "Nginx service running" "PASS"
    else
        test_result "Nginx service running" "FAIL"
    fi
    
    # Check Nginx configuration
    if nginx -t >/dev/null 2>&1; then
        test_result "Nginx configuration valid" "PASS"
    else
        test_result "Nginx configuration valid" "FAIL"
    fi
    
    # Check site configuration
    if [ -f "/etc/nginx/sites-available/siteguard" ]; then
        test_result "SiteGuard Nginx config exists" "PASS"
    else
        test_result "SiteGuard Nginx config exists" "FAIL"
    fi
    
    if [ -L "/etc/nginx/sites-enabled/siteguard" ]; then
        test_result "SiteGuard Nginx config enabled" "PASS"
    else
        test_result "SiteGuard Nginx config enabled" "FAIL"
    fi
}

# Test SSL configuration
test_ssl_configuration() {
    log_test "Testing SSL configuration..."
    
    # Check if SSL is configured
    if [ -f "/opt/siteguard/.env" ]; then
        local domain=$(grep "DOMAIN=" /opt/siteguard/.env | cut -d'=' -f2)
        
        if [ -n "$domain" ] && [ "$domain" != "localhost" ]; then
            # Check SSL certificate
            if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
                test_result "SSL certificate exists" "PASS"
                
                # Check certificate validity
                if openssl x509 -in "/etc/letsencrypt/live/$domain/fullchain.pem" -noout -checkend 2592000 >/dev/null 2>&1; then
                    test_result "SSL certificate valid (30+ days)" "PASS"
                else
                    test_result "SSL certificate valid (30+ days)" "FAIL" "Certificate expires soon"
                fi
            else
                test_result "SSL certificate exists" "FAIL" "Certificate not found for $domain"
            fi
            
            # Test HTTPS response
            if curl -s -k "https://$domain" >/dev/null 2>&1; then
                test_result "HTTPS response" "PASS"
            else
                test_result "HTTPS response" "FAIL"
            fi
        else
            test_result "SSL configuration" "SKIP" "Using localhost domain"
        fi
    else
        test_result "SSL configuration" "FAIL" "Environment file not found"
    fi
}

# Test database connectivity
test_database_connectivity() {
    log_test "Testing database connectivity..."
    
    if [ -f "/opt/siteguard/.env" ]; then
        local supabase_url=$(grep "SUPABASE_URL=" /opt/siteguard/.env | cut -d'=' -f2)
        
        if [ -n "$supabase_url" ] && [ "$supabase_url" != "your_supabase_url_here" ]; then
            # Test Supabase connectivity
            if curl -s "$supabase_url/rest/v1/" >/dev/null 2>&1; then
                test_result "Supabase connectivity" "PASS"
            else
                test_result "Supabase connectivity" "FAIL" "Cannot reach $supabase_url"
            fi
        else
            test_result "Database configuration" "FAIL" "Supabase URL not configured"
        fi
    else
        test_result "Database configuration" "FAIL" "Environment file not found"
    fi
}

# Test monitoring scripts
test_monitoring_scripts() {
    log_test "Testing monitoring scripts..."
    
    local scripts=(
        "/usr/local/bin/siteguard-status.sh"
        "/usr/local/bin/siteguard-monitor.sh"
        "/usr/local/bin/siteguard-backup.sh"
        "/usr/local/bin/siteguard-maintenance.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ] && [ -x "$script" ]; then
            test_result "Monitoring script: $(basename $script)" "PASS"
        else
            test_result "Monitoring script: $(basename $script)" "FAIL"
        fi
    done
    
    # Test cron jobs
    if crontab -l | grep -q "siteguard-monitor.sh"; then
        test_result "Monitoring cron job configured" "PASS"
    else
        test_result "Monitoring cron job configured" "FAIL"
    fi
}

# Test security configuration
test_security_configuration() {
    log_test "Testing security configuration..."
    
    # Check firewall status
    if ufw status | grep -q "Status: active"; then
        test_result "UFW firewall active" "PASS"
    else
        test_result "UFW firewall active" "FAIL"
    fi
    
    # Check fail2ban
    if systemctl is-active --quiet fail2ban; then
        test_result "Fail2ban service running" "PASS"
    else
        test_result "Fail2ban service running" "FAIL"
    fi
    
    # Check siteguard user
    if id "siteguard" >/dev/null 2>&1; then
        test_result "Siteguard user exists" "PASS"
    else
        test_result "Siteguard user exists" "FAIL"
    fi
    
    # Check file permissions
    if [ "$(stat -c %U /opt/siteguard)" = "siteguard" ]; then
        test_result "Application directory ownership" "PASS"
    else
        test_result "Application directory ownership" "FAIL"
    fi
}

# Main test execution
main() {
    echo "🧪 SiteGuard Deployment Testing"
    echo "=================================="
    echo "Starting comprehensive deployment tests..."
    echo ""
    
    test_system_requirements
    echo ""
    
    test_application_files
    echo ""
    
    test_pm2_services
    echo ""
    
    test_network_connectivity
    echo ""
    
    test_nginx_configuration
    echo ""
    
    test_ssl_configuration
    echo ""
    
    test_database_connectivity
    echo ""
    
    test_monitoring_scripts
    echo ""
    
    test_security_configuration
    echo ""
    
    # Test summary
    echo "=================================="
    echo "🧪 Test Results Summary"
    echo "=================================="
    echo "Total tests: $TESTS_TOTAL"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo ""
        echo -e "${GREEN}🎉 All tests passed! Your SiteGuard deployment is ready.${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Access your application at the configured domain"
        echo "2. Configure cameras and network devices"
        echo "3. Set up user accounts and permissions"
        echo "4. Test recording and streaming functionality"
        exit 0
    else
        echo ""
        echo -e "${RED}❌ Some tests failed. Please review the issues above.${NC}"
        echo ""
        echo "Common solutions:"
        echo "1. Check service logs: pm2 logs"
        echo "2. Verify environment configuration: cat /opt/siteguard/.env"
        echo "3. Restart services: pm2 restart all"
        echo "4. Check system status: /usr/local/bin/siteguard-status.sh"
        exit 1
    fi
}

# Run tests
main "$@"
