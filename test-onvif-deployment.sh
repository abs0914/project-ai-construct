#!/bin/bash
# Complete SiteGuard Deployment Testing Script
# Comprehensive testing suite for all SiteGuard services including ONVIF

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

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

test_pass() {
    echo -e "${GREEN}✅ PASS${NC} $1"
}

test_fail() {
    echo -e "${RED}❌ FAIL${NC} $1"
}

test_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC} $1"
}

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_WARNED=0

run_test() {
    local test_name="$1"
    local test_command="$2"

    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_test "$test_name"

    if eval "$test_command"; then
        test_pass "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        test_fail "$test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

run_test_warn() {
    local test_name="$1"
    local test_command="$2"

    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    log_test "$test_name"

    if eval "$test_command"; then
        test_pass "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        test_warn "$test_name"
        TESTS_WARNED=$((TESTS_WARNED + 1))
        return 1
    fi
}

# Configuration
API_DOMAIN="api.aiconstructpro.com"

echo "🧪 Complete SiteGuard Deployment Testing Suite"
echo "=================================================="
echo "Server: $API_DOMAIN"
echo "Date: $(date)"
echo ""

log_info "Starting comprehensive SiteGuard deployment tests..."
echo ""

# Test 1: Basic System Tests
log_info "=== SYSTEM TESTS ==="

run_test "Node.js Installation" "command -v node >/dev/null 2>&1"
run_test "PM2 Installation" "command -v pm2 >/dev/null 2>&1"
run_test "Nginx Installation" "command -v nginx >/dev/null 2>&1"
run_test "Application Directory" "[ -d '/opt/siteguard' ]"
run_test "Environment File" "[ -f '/opt/siteguard/.env' ]"
run_test "PM2 Ecosystem File" "[ -f '/opt/siteguard/ecosystem.config.js' ]"

echo ""

# Test 2: PM2 Service Tests
log_info "=== PM2 SERVICE TESTS ==="

run_test "PM2 Process List" "pm2 list >/dev/null 2>&1"

# Test all SiteGuard services
services=("siteguard-media-server" "siteguard-onvif-server" "siteguard-network-server" "siteguard-security-server")
for service in "${services[@]}"; do
    run_test "$service in PM2" "pm2 describe $service >/dev/null 2>&1"

    if pm2 describe "$service" >/dev/null 2>&1; then
        status=$(pm2 jlist | jq -r ".[] | select(.name==\"$service\") | .pm2_env.status" 2>/dev/null || echo "unknown")
        run_test "$service Status: $status" "[ '$status' = 'online' ]"
    fi
done

echo ""

# Test 3: Network and Port Tests
log_info "=== NETWORK TESTS ==="

# Test all service ports
ports=("3001:Media Server" "3002:ONVIF Server" "3003:Network Server" "3004:Security Server")
for port_info in "${ports[@]}"; do
    port=$(echo $port_info | cut -d: -f1)
    service=$(echo $port_info | cut -d: -f2)
    run_test "$service Port $port" "netstat -tlnp | grep -q ':$port '"
done

run_test_warn "WS-Discovery Port 3702" "netstat -ulnp | grep -q ':3702 '"
run_test "Nginx Running" "systemctl is-active --quiet nginx"
run_test_warn "SSL Certificate" "[ -f '/etc/letsencrypt/live/$API_DOMAIN/fullchain.pem' ]"

echo ""

# Test 4: Local API Tests
log_info "=== LOCAL API TESTS ==="

# Test all service endpoints locally
endpoints=("3001:/api/media/health:Media Server" "3002:/api/onvif/devices:ONVIF Server" "3003:/api/network/status:Network Server" "3004:/api/security/health:Security Server")

for endpoint_info in "${endpoints[@]}"; do
    port=$(echo $endpoint_info | cut -d: -f1)
    path=$(echo $endpoint_info | cut -d: -f2)
    service=$(echo $endpoint_info | cut -d: -f3)

    run_test "$service Local API" "curl -f -s -m 10 http://localhost:$port$path >/dev/null"
done

# Test ONVIF discovery endpoint specifically
log_test "ONVIF Discovery Endpoint"
if discovery_response=$(curl -s -m 15 -X POST http://localhost:3002/api/onvif/discover 2>/dev/null); then
    if echo "$discovery_response" | grep -q "devices\|message"; then
        test_pass "ONVIF Discovery Endpoint"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "Discovery response: $discovery_response"
    else
        test_fail "ONVIF Discovery Endpoint - Invalid response"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    test_fail "ONVIF Discovery Endpoint - No response"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

echo ""

# Test 5: External HTTPS API Tests
log_info "=== EXTERNAL HTTPS API TESTS ==="

if [ -f "/etc/letsencrypt/live/$API_DOMAIN/fullchain.pem" ]; then
    # Test external access to all services
    external_endpoints=("/api/media/health:Media Server" "/api/onvif/devices:ONVIF Server" "/api/network/status:Network Server" "/api/security/health:Security Server" "/health:Health Check")

    for endpoint_info in "${external_endpoints[@]}"; do
        path=$(echo $endpoint_info | cut -d: -f1)
        service=$(echo $endpoint_info | cut -d: -f2)

        run_test_warn "$service External HTTPS" "curl -f -s -m 10 https://$API_DOMAIN$path >/dev/null"
    done
else
    test_warn "SSL not configured - skipping external HTTPS tests"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_WARNED=$((TESTS_WARNED + 1))
fi

echo ""

# Test 5: Firewall Tests
log_info "=== FIREWALL TESTS ==="

if command -v ufw >/dev/null 2>&1; then
    run_test "UFW Firewall Active" "ufw status | grep -q 'Status: active'"
    run_test "ONVIF Port 3002 Allowed" "ufw status | grep -q '3002'"
    run_test_warn "WS-Discovery Port 3702 Allowed" "ufw status | grep -q '3702'"
else
    test_warn "UFW not installed"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TESTS_WARNED=$((TESTS_WARNED + 1))
fi

echo ""

# Test 6: Environment Configuration Tests
log_info "=== ENVIRONMENT TESTS ==="

if [ -f "/opt/siteguard/.env" ]; then
    env_vars=("ONVIF_SERVER_PORT" "ONVIF_DISCOVERY_TIMEOUT" "ONVIF_USERNAME" "ONVIF_PASSWORD")
    for var in "${env_vars[@]}"; do
        run_test "Environment Variable: $var" "grep -q '^$var=' /opt/siteguard/.env"
    done
fi

echo ""

# Test 7: Log Tests
log_info "=== LOG TESTS ==="

run_test "ONVIF Log Directory" "[ -d '/var/log/siteguard' ]"
run_test_warn "ONVIF Server Logs" "[ -f '/var/log/siteguard/onvif-server.log' ]"

if [ -f "/var/log/siteguard/onvif-server-error.log" ]; then
    error_count=$(wc -l < /var/log/siteguard/onvif-server-error.log 2>/dev/null || echo "0")
    if [ "$error_count" -eq 0 ]; then
        test_pass "No ONVIF Server Errors"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        test_warn "ONVIF Server Errors Found: $error_count lines"
        TESTS_WARNED=$((TESTS_WARNED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
fi

echo ""

# Test 8: Integration Tests
log_info "=== INTEGRATION TESTS ==="

# Test if other services are still running
services=("siteguard-media-server" "siteguard-network-server" "siteguard-security-server")
for service in "${services[@]}"; do
    if pm2 describe "$service" >/dev/null 2>&1; then
        status=$(pm2 jlist | jq -r ".[] | select(.name==\"$service\") | .pm2_env.status" 2>/dev/null || echo "unknown")
        run_test "$service Status: $status" "[ '$status' = 'online' ]"
    else
        test_warn "$service not found in PM2"
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        TESTS_WARNED=$((TESTS_WARNED + 1))
    fi
done

echo ""

# Test 9: Performance Tests
log_info "=== PERFORMANCE TESTS ==="

# Memory usage test
if pm2 describe siteguard-onvif-server >/dev/null 2>&1; then
    memory_mb=$(pm2 jlist | jq -r '.[] | select(.name=="siteguard-onvif-server") | .monit.memory' 2>/dev/null | awk '{print int($1/1024/1024)}')
    if [ -n "$memory_mb" ] && [ "$memory_mb" -lt 256 ]; then
        test_pass "ONVIF Server Memory Usage: ${memory_mb}MB"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        test_warn "ONVIF Server Memory Usage: ${memory_mb}MB (high)"
        TESTS_WARNED=$((TESTS_WARNED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
fi

# Response time test
log_test "ONVIF API Response Time"
response_time=$(curl -o /dev/null -s -w '%{time_total}' -m 10 http://localhost:3002/api/onvif/devices 2>/dev/null || echo "timeout")
if [ "$response_time" != "timeout" ] && [ "$(echo "$response_time < 2.0" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
    test_pass "ONVIF API Response Time: ${response_time}s"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    test_warn "ONVIF API Response Time: ${response_time}s (slow)"
    TESTS_WARNED=$((TESTS_WARNED + 1))
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

echo ""

# Final Results
echo "=================================================="
log_info "🏁 TEST RESULTS SUMMARY"
echo "=================================================="
echo "Total Tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo -e "${YELLOW}Warnings: $TESTS_WARNED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    if [ $TESTS_WARNED -eq 0 ]; then
        log_info "🎉 ALL TESTS PASSED! ONVIF server deployment is successful."
    else
        log_warn "✅ DEPLOYMENT SUCCESSFUL with $TESTS_WARNED warnings."
        log_info "Review warnings above - they may not affect functionality."
    fi
    echo ""
    log_info "ONVIF Server is ready for use!"
    echo "- API Base URL: https://api.aiconstructpro.com/api/onvif/"
    echo "- Local URL: http://localhost:3002/api/onvif/"
    echo "- Monitor: pm2 logs siteguard-onvif-server"
else
    log_error "❌ DEPLOYMENT HAS ISSUES - $TESTS_FAILED tests failed."
    log_info "Please review failed tests and resolve issues before using ONVIF server."
    exit 1
fi

echo "=================================================="
