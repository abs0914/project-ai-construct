# 🔧 SiteGuard Hardware Setup & Testing Guide

## 📋 Overview

This guide provides step-by-step instructions for connecting hardware components to your SiteGuard surveillance system and running comprehensive tests to ensure everything works correctly.

## ✅ Prerequisites Verification

Your SiteGuard backend services are already deployed and running:
- ✅ **Media Server** (Port 3001): Video streaming and recording
- ✅ **ONVIF Server** (Port 3002): Camera discovery and management  
- ✅ **Network Server** (Port 3003): Network device management
- ✅ **Security Server** (Port 3004): Authentication and security

## 🎯 Hardware Connection Steps

### 1. **Camera Hardware Setup**

#### **Physical Connection:**
1. **Power Supply:**
   - Connect cameras to 12V DC power adapters
   - Ensure stable power supply (cameras may reboot during setup)
   - Use surge protectors for outdoor installations

2. **Network Connection:**
   - **Option A:** Ethernet cable to router/switch (recommended)
   - **Option B:** WiFi connection through camera web interface
   - Ensure cameras are on the same network as SiteGuard server

#### **Camera Configuration:**
1. **Find Camera IP Address:**
   ```bash
   # Scan network for cameras
   nmap -sn 192.168.1.0/24
   ```

2. **Access Camera Web Interface:**
   - Open browser: `http://camera-ip-address`
   - Default credentials: `admin/admin` or `admin/password`

3. **Enable ONVIF:**
   - Navigate to Network → ONVIF settings
   - Enable ONVIF service
   - Set ONVIF port (usually 80 or 8080)

4. **Set Static IP:**
   - Configure static IP address (e.g., 192.168.1.100-199)
   - Set subnet mask and gateway
   - Save and reboot camera

### 2. **Supported Camera Types**

| Camera Type | RTSP Path | Default Port | Credentials |
|-------------|-----------|--------------|-------------|
| V380 Pro/YK-23 | `/stream1` | 554 | admin/password |
| Generic ONVIF | `/onvif1` | 554 | admin/admin |
| Hikvision | `/Streaming/Channels/101` | 554 | admin/12345 |
| Dahua | `/cam/realmonitor?channel=1&subtype=0` | 554 | admin/admin |

### 3. **Network Configuration**

#### **Router Settings:**
- Enable UPnP for automatic port forwarding
- Configure port forwarding for RTSP (554) if needed
- Ensure multicast is enabled for ONVIF discovery

#### **Firewall Settings:**
- Allow ports 80, 554, 8080 for cameras
- Allow multicast traffic on port 3702 (ONVIF discovery)

## 🧪 Testing Procedures

### **Quick Test Commands**

1. **Test Backend Services:**
   ```bash
   # Test all services
   curl http://api.aiconstructpro.com:3001/health  # Media Server
   curl http://api.aiconstructpro.com:3002/health  # ONVIF Server
   curl http://api.aiconstructpro.com:3003/health  # Network Server
   curl http://api.aiconstructpro.com:3004/health  # Security Server
   ```

2. **Test Camera Discovery:**
   ```bash
   # Discover ONVIF cameras
   curl http://api.aiconstructpro.com:3002/discover
   ```

3. **Test Individual Camera:**
   ```bash
   # Test ONVIF service
   curl http://camera-ip/onvif/device_service
   
   # Test RTSP stream (requires ffmpeg)
   ffplay rtsp://username:password@camera-ip:554/stream1
   ```

### **Comprehensive Testing Script**

Run the automated hardware testing script:
```bash
node test-hardware-connection.js
```

This script will:
- ✅ Test network connectivity to all services
- 📹 Scan for ONVIF cameras (30-second timeout)
- 📡 Test camera connectivity
- 🎥 Verify streaming capabilities
- ➕ Test camera management API

## 🔍 Troubleshooting

### **Common Issues:**

1. **No Cameras Discovered:**
   - Verify cameras are powered on
   - Check network connectivity
   - Ensure ONVIF is enabled in camera settings
   - Verify cameras are on same subnet

2. **Camera Not Accessible:**
   - Check IP address configuration
   - Verify firewall settings
   - Test with ping: `ping camera-ip`
   - Check camera web interface accessibility

3. **Streaming Issues:**
   - Verify RTSP credentials
   - Check RTSP URL format
   - Test with VLC or ffplay
   - Ensure sufficient network bandwidth

4. **ONVIF Discovery Fails:**
   - Check multicast support on network
   - Verify port 3702 is open
   - Ensure cameras support ONVIF Profile S

### **Network Diagnostics:**
```bash
# Test multicast connectivity
ping 239.255.255.250

# Check open ports on camera
nmap -p 80,554,8080 camera-ip

# Test RTSP stream
ffprobe rtsp://username:password@camera-ip:554/stream1
```

## 📱 Web Interface Testing

1. **Access SiteGuard Web Interface:**
   - Open: `https://aiconstructpro.com`
   - Navigate to SiteGuard section

2. **Camera Management:**
   - Go to Settings → Camera Settings
   - Add cameras manually if auto-discovery fails
   - Configure recording settings

3. **Live Feed Testing:**
   - View live camera feeds
   - Test PTZ controls (if supported)
   - Verify recording functionality

## 🎯 Next Steps After Hardware Setup

1. **Configure Recording:**
   - Set recording schedules
   - Configure motion detection
   - Set storage limits

2. **Set Up Alerts:**
   - Configure motion detection alerts
   - Set up email/SMS notifications
   - Test alert system

3. **Security Configuration:**
   - Change default passwords
   - Set up user access controls
   - Configure SSL certificates

4. **Monitoring Setup:**
   - Configure system monitoring
   - Set up backup procedures
   - Test failover scenarios

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Run the diagnostic scripts
3. Review system logs: `/var/log/siteguard/`
4. Contact support with test results and log files

---

**Note:** This guide assumes your SiteGuard backend services are already deployed and running on your Contabo VPS. If you need to deploy the backend services, refer to the `DEPLOYMENT_GUIDE.md` first.
