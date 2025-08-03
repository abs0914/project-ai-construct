# Fresh Contabo VPS Deployment Guide for SiteGuard

## Overview

This guide provides complete step-by-step instructions for setting up SiteGuard backend services (including ONVIF server) on a fresh Contabo VPS from scratch.

## VPS Information

- **Provider**: Contabo
- **Location**: Singapore
- **Specs**: VPS 4 Cores SSD
- **Target Domain**: api.aiconstructpro.com
- **Services**: Media, ONVIF, Network, Security servers

## Prerequisites

1. Fresh Contabo VPS with Ubuntu/Debian
2. Root SSH access to the VPS
3. Domain `api.aiconstructpro.com` pointing to your VPS IP
4. Email address for SSL certificate registration

## Step-by-Step Deployment

### Step 1: Initial VPS Setup

First, connect to your VPS as root and run the initial setup:

```bash
# SSH to your VPS as root
ssh root@YOUR_VPS_IP

# Download and run the fresh VPS setup script
wget https://raw.githubusercontent.com/abs0914/project-ai-construct/main/fresh-vps-setup.sh
chmod +x fresh-vps-setup.sh
sudo bash fresh-vps-setup.sh
```

This script will:
- Update system packages
- Create `siteguard` user
- Configure firewall (UFW)
- Install Node.js 18, PM2, Nginx, FFmpeg
- Set up directory structure
- Configure security (fail2ban)
- Enable ONVIF network settings

### Step 2: Deploy SiteGuard Services

Switch to the siteguard user and deploy all services:

```bash
# Switch to siteguard user
sudo su - siteguard

# Download and run the deployment script
wget https://raw.githubusercontent.com/abs0914/project-ai-construct/main/deploy-siteguard-fresh.sh
chmod +x deploy-siteguard-fresh.sh
./deploy-siteguard-fresh.sh
```

This will:
- Clone the project repository
- Install Node.js dependencies
- Create environment configuration
- Set up PM2 ecosystem for all services
- Start all backend services

### Step 3: Configure Environment Variables

Edit the environment file to add your specific configuration:

```bash
nano /opt/siteguard/.env
```

**Critical variables to update:**
```bash
# Database Configuration (Required)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# ONVIF Security (Recommended)
ONVIF_PASSWORD=your_secure_password_here

# Network Configuration (Optional)
ZEROTIER_NETWORK_ID=your_zerotier_network_id
ZEROTIER_API_TOKEN=your_zerotier_api_token
```

After updating, restart services:
```bash
pm2 restart all
```

### Step 4: Configure Domain and SSL

Set up your domain and SSL certificate:

```bash
# Download and run the domain/SSL configuration script (as root)
wget https://raw.githubusercontent.com/abs0914/project-ai-construct/main/configure-domain-ssl.sh
chmod +x configure-domain-ssl.sh
sudo ./configure-domain-ssl.sh
```

This will:
- Configure Nginx reverse proxy
- Obtain Let's Encrypt SSL certificate
- Set up HTTPS with security headers
- Configure rate limiting and CORS

### Step 5: Test Complete Deployment

Run comprehensive tests to verify everything is working:

```bash
# Download and run the testing script
wget https://raw.githubusercontent.com/abs0914/project-ai-construct/main/test-onvif-deployment.sh
chmod +x test-onvif-deployment.sh
./test-onvif-deployment.sh
```

## Services Overview

After successful deployment, you'll have these services running:

### 1. Media Server (Port 3001)
- **Purpose**: Video streaming and recording
- **Endpoints**: `/api/media/`
- **Features**: HLS streaming, recording management

### 2. ONVIF Server (Port 3002)
- **Purpose**: ONVIF camera discovery and management
- **Endpoints**: `/api/onvif/`
- **Features**: Device discovery, PTZ control, stream URIs

### 3. Network Server (Port 3003)
- **Purpose**: Network management and monitoring
- **Endpoints**: `/api/network/`
- **Features**: Device scanning, network topology

### 4. Security Server (Port 3004)
- **Purpose**: Authentication and security
- **Endpoints**: `/api/security/`
- **Features**: User management, access control

## API Endpoints

All services are accessible via HTTPS through your domain:

### ONVIF Server Endpoints
- `POST https://api.aiconstructpro.com/api/onvif/discover` - Start device discovery
- `GET https://api.aiconstructpro.com/api/onvif/devices` - List discovered devices
- `POST https://api.aiconstructpro.com/api/onvif/devices/:id/configure` - Configure device
- `GET https://api.aiconstructpro.com/api/onvif/devices/:id/stream-uri` - Get stream URI
- `POST https://api.aiconstructpro.com/api/onvif/devices/:id/ptz/:action` - PTZ control

### Other Service Endpoints
- `GET https://api.aiconstructpro.com/api/media/health` - Media server health
- `GET https://api.aiconstructpro.com/api/network/status` - Network server status
- `GET https://api.aiconstructpro.com/api/security/health` - Security server health
- `GET https://api.aiconstructpro.com/health` - Overall health check

## Network Configuration

### Firewall Ports (UFW)
- **22** - SSH
- **80** - HTTP (redirects to HTTPS)
- **443** - HTTPS
- **3001-3004** - Backend services (internal)
- **3702/udp** - ONVIF WS-Discovery
- **554** - RTSP streaming
- **8080** - ONVIF alternative HTTP

### ONVIF Network Settings
- **Multicast Address**: 239.255.255.250
- **Discovery Port**: 3702/udp
- **Multicast Routing**: Enabled
- **IP Forwarding**: Enabled

## Monitoring and Maintenance

### PM2 Commands
```bash
# View all services
pm2 list

# View logs for specific service
pm2 logs siteguard-onvif-server

# Restart specific service
pm2 restart siteguard-onvif-server

# Restart all services
pm2 restart all

# Monitor services
pm2 monit
```

### Log Files
- **Application Logs**: `/var/log/siteguard/`
- **Nginx Logs**: `/var/log/nginx/`
- **System Logs**: `journalctl -u nginx`

### SSL Certificate Management
```bash
# Check certificate status
certbot certificates

# Test renewal
certbot renew --dry-run

# Manual renewal (if needed)
certbot renew
```

## Troubleshooting

### Common Issues

1. **Services not starting**
   ```bash
   # Check PM2 logs
   pm2 logs
   
   # Check environment variables
   cat /opt/siteguard/.env
   
   # Restart services
   pm2 restart all
   ```

2. **ONVIF discovery not working**
   ```bash
   # Check multicast configuration
   ip route show | grep 239.255.255.250
   
   # Check firewall
   ufw status | grep 3702
   
   # Test discovery manually
   curl -X POST http://localhost:3002/api/onvif/discover
   ```

3. **SSL certificate issues**
   ```bash
   # Check certificate
   openssl x509 -text -in /etc/letsencrypt/live/api.aiconstructpro.com/cert.pem
   
   # Test Nginx configuration
   nginx -t
   
   # Reload Nginx
   systemctl reload nginx
   ```

4. **External API not accessible**
   ```bash
   # Check domain resolution
   dig api.aiconstructpro.com
   
   # Test local access
   curl http://localhost:3002/api/onvif/devices
   
   # Check Nginx status
   systemctl status nginx
   ```

## Security Considerations

1. **Change default passwords** in environment file
2. **Use strong Supabase credentials**
3. **Monitor access logs** regularly
4. **Keep system updated**
5. **Configure backup strategy**
6. **Review firewall rules** periodically

## Frontend Integration

Update your frontend environment variables:

```bash
# In your Lovable project
VITE_API_BASE_URL=https://api.aiconstructpro.com
VITE_WEBSOCKET_URL=wss://api.aiconstructpro.com
```

## Support and Maintenance

### Regular Maintenance Tasks
1. **Weekly**: Check service status and logs
2. **Monthly**: Update system packages
3. **Quarterly**: Review security settings
4. **As needed**: Update application code

### Backup Strategy
1. **Database**: Handled by Supabase
2. **Configuration**: Backup `/opt/siteguard/.env`
3. **SSL Certificates**: Auto-renewed by Let's Encrypt
4. **Application Code**: Stored in Git repository

## Next Steps

After successful deployment:

1. **Test all API endpoints** using the provided test script
2. **Configure your frontend** to use the new API domain
3. **Set up monitoring** and alerting
4. **Document any custom configurations**
5. **Plan regular maintenance schedule**

Your SiteGuard backend services with ONVIF server are now fully deployed and ready for production use!
