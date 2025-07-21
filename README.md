# SiteGuard - Advanced Security & Surveillance Management System

🛡️ **SiteGuard** is a comprehensive security and surveillance management platform designed for construction sites, facilities, and remote locations. It provides real-time monitoring, ONVIF camera integration, network management, and advanced security features.

## 🌟 Features

- **Real-time Video Surveillance** - Live streaming and recording from ONVIF-compatible cameras
- **Network Management** - ZeroTier VPN integration and network device monitoring
- **Security Dashboard** - Centralized monitoring with alerts and analytics
- **Multi-Server Architecture** - Scalable backend services for different functionalities
- **Mobile-Responsive UI** - Modern React-based interface with real-time updates
- **Advanced Analytics** - Motion detection, facial recognition, and AI-powered insights

## 🏗️ Architecture

SiteGuard consists of multiple specialized services:

- **Frontend** (Port 3000) - React-based user interface
- **Media Server** (Port 3001) - Video streaming and recording management
- **ONVIF Server** (Port 3002) - Camera discovery and integration
- **Network Server** (Port 3003) - VPN and network device management
- **Security Server** (Port 3004) - Authentication and security features

## 🚀 Quick Deployment on Contabo VPS

### One-Command Deployment

```bash
# Download and run the quick deployment script
wget https://raw.githubusercontent.com/abs0914/project-ai-construct/main/quick-deploy.sh
chmod +x quick-deploy.sh
sudo ./quick-deploy.sh -d your-domain.com -e admin@your-domain.com
```

### Manual Step-by-Step Deployment

1. **Initial VPS Setup:**
   ```bash
   wget https://raw.githubusercontent.com/abs0914/project-ai-construct/main/contabo-initial-setup.sh
   chmod +x contabo-initial-setup.sh
   sudo ./contabo-initial-setup.sh
   ```

2. **Deploy Application:**
   ```bash
   sudo su - siteguard
   wget https://raw.githubusercontent.com/abs0914/project-ai-construct/main/deploy-siteguard.sh
   chmod +x deploy-siteguard.sh
   ./deploy-siteguard.sh your-domain.com
   ```

3. **Setup SSL Certificate:**
   ```bash
   sudo wget https://raw.githubusercontent.com/abs0914/project-ai-construct/main/setup-ssl.sh
   sudo chmod +x setup-ssl.sh
   sudo ./setup-ssl.sh your-domain.com admin@your-domain.com
   ```

4. **Configure Monitoring:**
   ```bash
   sudo wget https://raw.githubusercontent.com/abs0914/project-ai-construct/main/monitoring-setup.sh
   sudo chmod +x monitoring-setup.sh
   sudo ./monitoring-setup.sh
   ```

5. **Test Deployment:**
   ```bash
   wget https://raw.githubusercontent.com/abs0914/project-ai-construct/main/test-deployment.sh
   chmod +x test-deployment.sh
   ./test-deployment.sh
   ```

## 📖 Documentation

- **[Complete Deployment Guide](DEPLOYMENT_GUIDE.md)** - Detailed deployment instructions
- **[Security Implementation](SECURITY_IMPLEMENTATION.md)** - Security features and configuration
- **[Network Management](NETWORK_MANAGEMENT.md)** - VPN and network setup
- **[ONVIF Integration](ONVIF_INTEGRATION.md)** - Camera integration guide
- **[Streaming Infrastructure](STREAMING_INFRASTRUCTURE.md)** - Media streaming setup

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ and npm
- FFmpeg for media processing
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/abs0914/project-ai-construct.git
cd project-ai-construct

# Install dependencies
npm install

# Start all services in development mode
npm run dev
```

This will start:
- Frontend development server (http://localhost:5173)
- Media server (http://localhost:3001)
- ONVIF server (http://localhost:3002)
- Network server (http://localhost:3003)
- Security server (http://localhost:3004)

### Individual Service Development

```bash
# Frontend only
npm run dev:client

# Backend services
npm run dev:media-server
npm run dev:onvif-server
npm run dev:network-server
npm run dev:security-server
```

## 🧪 Testing

```bash
# Run individual service tests
npm run test:streaming
npm run test:onvif
npm run test:network
npm run test:security

# Test production deployment
./test-deployment.sh
```

## 🔧 Technologies Used

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **React Router** for navigation
- **TanStack Query** for data fetching

### Backend
- **Node.js** with Express
- **Socket.io** for real-time communication
- **FFmpeg** for media processing
- **ONVIF** for camera integration
- **PM2** for process management

### Infrastructure
- **Nginx** as reverse proxy
- **Let's Encrypt** for SSL certificates
- **Supabase** for database
- **ZeroTier** for VPN networking

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- End-to-end encryption
- Fail2ban intrusion prevention
- Rate limiting and DDoS protection
- Secure headers and CORS configuration

## 📊 Monitoring & Maintenance

SiteGuard includes comprehensive monitoring:

- **System Health Monitoring** - CPU, memory, disk usage
- **Service Monitoring** - All backend services status
- **Automated Backups** - Daily backups with retention
- **Log Management** - Centralized logging with rotation
- **SSL Certificate Monitoring** - Automatic renewal alerts

### Monitoring Commands

```bash
# System status dashboard
/usr/local/bin/siteguard-status.sh

# Manual monitoring check
/usr/local/bin/siteguard-monitor.sh

# Create backup
/usr/local/bin/siteguard-backup.sh

# Run maintenance
/usr/local/bin/siteguard-maintenance.sh
```

## 🆘 Support & Troubleshooting

### Common Issues

1. **Services not starting:** Check logs with `pm2 logs`
2. **Database connection:** Verify Supabase credentials in `.env`
3. **Camera discovery:** Check network connectivity and ONVIF credentials
4. **SSL issues:** Run `sudo certbot certificates` to check status

### Getting Help

- Check the [Deployment Guide](DEPLOYMENT_GUIDE.md) for detailed instructions
- Review service logs: `pm2 logs [service-name]`
- Monitor system status: `/usr/local/bin/siteguard-status.sh`
- Check network connectivity and firewall settings

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**SiteGuard** - Securing your sites with advanced surveillance technology 🛡️
