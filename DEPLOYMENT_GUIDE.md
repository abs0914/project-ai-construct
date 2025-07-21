# SiteGuard Deployment Guide for Contabo VPS

This guide provides step-by-step instructions for deploying the SiteGuard surveillance and security management system on a Contabo VPS.

## 📋 Prerequisites

- Contabo VPS with Ubuntu 20.04+ or Debian 11+
- Root access to the server
- Domain name pointed to your server IP (optional but recommended)
- Basic knowledge of Linux command line

## 🚀 Quick Deployment

### Step 1: Initial VPS Setup

1. **Connect to your VPS:**
   ```bash
   ssh root@your-server-ip
   ```

2. **Run the initial setup script:**
   ```bash
   wget https://raw.githubusercontent.com/abs0914/project-ai-construct/main/contabo-initial-setup.sh
   chmod +x contabo-initial-setup.sh
   ./contabo-initial-setup.sh
   ```

   This script will:
   - Update system packages
   - Install essential tools and dependencies
   - Create a `siteguard` user for security
   - Configure firewall rules
   - Install fail2ban for security
   - Install Node.js, PM2, FFmpeg, and Nginx

### Step 2: Deploy SiteGuard Application

1. **Switch to the siteguard user:**
   ```bash
   sudo su - siteguard
   ```

2. **Run the deployment script:**
   ```bash
   wget https://raw.githubusercontent.com/abs0914/project-ai-construct/main/deploy-siteguard.sh
   chmod +x deploy-siteguard.sh
   ./deploy-siteguard.sh your-domain.com
   ```

   Replace `your-domain.com` with your actual domain name, or use `localhost` for local testing.

### Step 3: Configure Environment Variables

1. **Edit the environment file:**
   ```bash
   cd /opt/siteguard
   nano .env
   ```

2. **Update the following critical variables:**
   ```env
   # Database Configuration
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
   
   # Network Configuration
   ZEROTIER_NETWORK_ID=your_zerotier_network_id
   ZEROTIER_API_TOKEN=your_zerotier_api_token
   
   # ONVIF Configuration
   ONVIF_USERNAME=admin
   ONVIF_PASSWORD=your_onvif_password
   
   # Domain Configuration
   DOMAIN=your-domain.com
   CORS_ORIGIN=https://your-domain.com
   ```

### Step 4: Setup SSL Certificate (Optional but Recommended)

1. **Run the SSL setup script as root:**
   ```bash
   sudo su -
   wget https://raw.githubusercontent.com/abs0914/project-ai-construct/main/setup-ssl.sh
   chmod +x setup-ssl.sh
   ./setup-ssl.sh your-domain.com admin@your-domain.com
   ```

### Step 5: Setup Monitoring and Maintenance

1. **Run the monitoring setup script as root:**
   ```bash
   wget https://raw.githubusercontent.com/abs0914/project-ai-construct/main/monitoring-setup.sh
   chmod +x monitoring-setup.sh
   ./monitoring-setup.sh
   ```

2. **Configure email alerts:**
   ```bash
   nano /usr/local/bin/siteguard-monitor.sh
   # Update ALERT_EMAIL variable
   ```

## 🔧 Service Management

### PM2 Process Management

- **View all services:** `pm2 status`
- **View logs:** `pm2 logs`
- **Restart all services:** `pm2 restart all`
- **Stop all services:** `pm2 stop all`
- **Monitor services:** `pm2 monit`

### Individual Service Management

- **Frontend:** `pm2 restart siteguard-frontend`
- **Media Server:** `pm2 restart siteguard-media-server`
- **ONVIF Server:** `pm2 restart siteguard-onvif-server`
- **Network Server:** `pm2 restart siteguard-network-server`
- **Security Server:** `pm2 restart siteguard-security-server`

### System Services

- **Nginx:** `sudo systemctl restart nginx`
- **SiteGuard (all services):** `sudo systemctl restart siteguard`

## 📊 Monitoring and Maintenance

### Status Dashboard
```bash
/usr/local/bin/siteguard-status.sh
```

### Manual Operations
- **System monitoring:** `/usr/local/bin/siteguard-monitor.sh`
- **Create backup:** `/usr/local/bin/siteguard-backup.sh`
- **Run maintenance:** `/usr/local/bin/siteguard-maintenance.sh`

### Automated Tasks
- **Monitoring:** Every 5 minutes
- **Backups:** Daily at 2:00 AM
- **Maintenance:** Weekly on Sunday at 3:00 AM
- **SSL renewal:** Automatic via certbot

## 🌐 Service Endpoints

- **Frontend:** `https://your-domain.com`
- **Media Server API:** `http://localhost:3001`
- **ONVIF Server API:** `http://localhost:3002`
- **Network Server API:** `http://localhost:3003`
- **Security Server API:** `http://localhost:3004`

## 🔒 Security Features

### Firewall Configuration
- SSH (22/tcp)
- HTTP (80/tcp) - redirects to HTTPS
- HTTPS (443/tcp)
- Backend services (3001-3004/tcp)

### Security Measures
- Non-root user execution
- Fail2ban intrusion prevention
- SSL/TLS encryption
- Security headers
- Rate limiting
- Input validation

## 📁 Directory Structure

```
/opt/siteguard/                 # Application root
├── dist/                       # Built frontend assets
├── media-server/               # Media streaming service
├── onvif-server/              # ONVIF camera integration
├── network-server/            # Network management
├── security-server/           # Security and authentication
├── recordings/                # Video recordings storage
├── backups/                   # System backups
├── .env                       # Environment configuration
└── ecosystem.config.js        # PM2 configuration

/var/log/siteguard/            # Application logs
├── frontend.log
├── media-server.log
├── onvif-server.log
├── network-server.log
├── security-server.log
└── monitoring.log

/etc/nginx/sites-available/    # Nginx configuration
└── siteguard
```

## 🔧 Troubleshooting

### Common Issues

1. **Services not starting:**
   ```bash
   pm2 logs
   # Check for configuration errors in logs
   ```

2. **Nginx configuration errors:**
   ```bash
   sudo nginx -t
   # Test configuration before reloading
   ```

3. **SSL certificate issues:**
   ```bash
   sudo certbot certificates
   sudo certbot renew --dry-run
   ```

4. **Database connection issues:**
   ```bash
   # Check environment variables
   cat /opt/siteguard/.env | grep SUPABASE
   ```

### Log Locations
- **Application logs:** `/var/log/siteguard/`
- **Nginx logs:** `/var/log/nginx/`
- **System logs:** `/var/log/syslog`
- **PM2 logs:** `~/.pm2/logs/`

### Performance Optimization

1. **Monitor resource usage:**
   ```bash
   htop
   iotop
   nethogs
   ```

2. **Optimize PM2 settings:**
   ```bash
   # Edit ecosystem.config.js
   nano /opt/siteguard/ecosystem.config.js
   ```

3. **Database optimization:**
   - Enable connection pooling
   - Optimize queries
   - Regular maintenance

## 📞 Support

For issues and support:
1. Check the troubleshooting section above
2. Review application logs
3. Check system status with monitoring tools
4. Consult the project documentation

## 🔄 Updates and Maintenance

### Updating SiteGuard
```bash
cd /opt/siteguard
git pull origin main
npm ci
npm run build
pm2 restart all
```

### System Updates
```bash
sudo apt update && sudo apt upgrade -y
sudo reboot  # If kernel updates were installed
```

### Backup and Recovery
- Backups are created automatically daily
- Manual backup: `/usr/local/bin/siteguard-backup.sh`
- Backups stored in: `/opt/siteguard/backups/`

---

**Note:** This deployment guide assumes a production environment. For development or testing, you may skip SSL setup and use localhost as the domain.
