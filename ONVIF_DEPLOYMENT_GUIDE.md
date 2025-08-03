# ONVIF Server Deployment Guide for Contabo VPS

## Overview

This guide provides step-by-step instructions for deploying the ONVIF server implementation from the project-ai-construct repository to your Contabo VPS (api.aiconstructpro.com) alongside existing SiteGuard backend services.

## Prerequisites

- Contabo VPS with existing SiteGuard services running
- SSH access to the VPS as the `siteguard` user
- Existing PM2 configuration with media, network, and security services
- Domain configured: api.aiconstructpro.com

## Current ONVIF Implementation

Your project includes a comprehensive ONVIF server with:

- **ONVIF Server** (`onvif-server/server.js`) - REST API server on port 3002
- **Device Manager** - Handles ONVIF device discovery and management
- **WS-Discovery Service** - Multicast UDP discovery protocol
- **ONVIF SOAP Client** - Camera communication via SOAP
- **Test Suite** - Comprehensive testing tools

### API Endpoints

- `POST /api/onvif/discover` - Start device discovery
- `GET /api/onvif/devices` - List all devices
- `POST /api/onvif/devices/:id/configure` - Configure device
- `GET /api/onvif/devices/:id/stream-uri` - Get stream URI
- `POST /api/onvif/devices/:id/ptz/:action` - PTZ control

## Deployment Steps

### Step 1: Verify Current VPS State

First, check the current state of your VPS and existing services:

```bash
# SSH to your VPS as siteguard user
ssh siteguard@api.aiconstructpro.com

# Run the verification script
chmod +x verify-vps-state.sh
./verify-vps-state.sh
```

This will check:
- System status and resources
- Existing PM2 services
- Network configuration
- Environment setup

### Step 2: Configure ONVIF Environment

Set up environment variables and configuration:

```bash
# Configure ONVIF environment variables
chmod +x configure-onvif-environment.sh
./configure-onvif-environment.sh

# Edit the environment file to customize settings
nano /opt/siteguard/.env
```

**Important**: Update the `ONVIF_PASSWORD` to a secure value in the `.env` file.

### Step 3: Configure Network and Firewall

Configure firewall rules and network settings for ONVIF (requires root access):

```bash
# Run as root to configure network settings
sudo chmod +x configure-onvif-network.sh
sudo ./configure-onvif-network.sh
```

This configures:
- UFW firewall rules for ONVIF ports
- Multicast routing for WS-Discovery
- Network interface settings
- Persistent network configuration

### Step 4: Deploy ONVIF Server

Deploy the ONVIF server to PM2:

```bash
# Deploy ONVIF server
chmod +x deploy-onvif-server.sh
./deploy-onvif-server.sh
```

This will:
- Update application code from repository
- Install/update dependencies
- Configure PM2 service for ONVIF server
- Start the ONVIF server
- Verify deployment

### Step 5: Test Deployment

Run comprehensive tests to verify the deployment:

```bash
# Run deployment tests
chmod +x test-onvif-deployment.sh
./test-onvif-deployment.sh
```

The test suite checks:
- System requirements
- PM2 service status
- Network connectivity
- API endpoints
- Firewall configuration
- Integration with existing services

## Network Configuration

### Firewall Ports

The following ports are configured for ONVIF:

- **3002/tcp** - ONVIF Server API
- **3702/udp** - WS-Discovery multicast
- **80/tcp** - ONVIF HTTP communication
- **554/tcp** - RTSP streaming
- **8080/tcp** - ONVIF alternative HTTP
- **1024-65535/tcp** - ONVIF dynamic ports

### Multicast Configuration

ONVIF uses multicast for device discovery:
- Multicast address: 239.255.255.250
- Multicast port: 3702/udp
- Automatic multicast routing configured

## Environment Variables

Key ONVIF environment variables in `/opt/siteguard/.env`:

```bash
# ONVIF Server Configuration
ONVIF_SERVER_PORT=3002
ONVIF_DISCOVERY_TIMEOUT=10000
ONVIF_CONNECTION_TIMEOUT=15000
ONVIF_USERNAME=admin
ONVIF_PASSWORD=your_secure_password_here

# Network Configuration
ONVIF_MULTICAST_ADDRESS=239.255.255.250
ONVIF_MULTICAST_PORT=3702
ONVIF_SOAP_TIMEOUT=30000

# Device Management
ONVIF_MAX_DEVICES=50
ONVIF_DEVICE_REFRESH_INTERVAL=300000
ONVIF_AUTO_DISCOVERY=true
```

## Monitoring and Maintenance

### PM2 Commands

```bash
# View all services
pm2 list

# View ONVIF server logs
pm2 logs siteguard-onvif-server

# Restart ONVIF server
pm2 restart siteguard-onvif-server

# Monitor all services
pm2 monit
```

### Log Files

- Main log: `/var/log/siteguard/onvif-server.log`
- Error log: `/var/log/siteguard/onvif-server-error.log`
- Output log: `/var/log/siteguard/onvif-server-out.log`

### Diagnostic Tools

```bash
# Network diagnostics
./diagnose-onvif-network.sh

# Test ONVIF functionality
node onvif-server/test-onvif.js

# Check deployment status
./test-onvif-deployment.sh
```

## API Access

### Local Access
- Base URL: `http://localhost:3002/api/onvif/`

### External Access
- Base URL: `https://api.aiconstructpro.com/api/onvif/`

### Example API Calls

```bash
# Discover ONVIF devices
curl -X POST https://api.aiconstructpro.com/api/onvif/discover

# List discovered devices
curl https://api.aiconstructpro.com/api/onvif/devices

# Configure a device
curl -X POST https://api.aiconstructpro.com/api/onvif/devices/DEVICE_ID/configure \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

## Troubleshooting

### Common Issues

1. **ONVIF server not starting**
   - Check logs: `pm2 logs siteguard-onvif-server`
   - Verify environment variables
   - Check port availability

2. **Device discovery not working**
   - Verify multicast configuration
   - Check firewall rules for UDP 3702
   - Ensure cameras are on same network

3. **API not accessible externally**
   - Check Nginx configuration
   - Verify SSL certificate
   - Check firewall rules

### Log Analysis

```bash
# Check for errors
grep -i error /var/log/siteguard/onvif-server-error.log

# Monitor real-time logs
pm2 logs siteguard-onvif-server --lines 50

# Check system logs
journalctl -u nginx -f
```

## Security Considerations

1. **Change default ONVIF credentials** in environment file
2. **Use strong passwords** for ONVIF device authentication
3. **Monitor access logs** regularly
4. **Keep firewall rules** restrictive
5. **Update SSL certificates** regularly

## Integration with Existing Services

The ONVIF server integrates with your existing SiteGuard services:

- **Media Server** (port 3001) - Handles video streaming
- **Network Server** (port 3003) - Network management
- **Security Server** (port 3004) - Authentication and security

All services run under PM2 and share the same environment configuration.

## Support and Maintenance

For ongoing support:
1. Monitor PM2 services regularly
2. Check logs for errors
3. Update environment variables as needed
4. Run diagnostic scripts periodically
5. Keep system and dependencies updated
