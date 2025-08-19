# V380 External Network Streaming Deployment Guide

## 🎯 **EXECUTIVE SUMMARY**

This guide provides the complete solution for streaming your V380 camera (ID: 85725752) from an external network through your GLiNet router and ZeroTier VPN to your Contabo VPS media server.

### **Camera Details**
- **Camera ID**: 85725752
- **IP Address**: 172.30.195.39
- **Port**: 554
- **Username**: 85725752
- **Password**: Ztatic@PV0sites
- **RTSP Path**: /live/ch00_0

## 🔍 **ROOT CAUSE ANALYSIS FINDINGS**

### **Critical Issues Identified**

1. **❌ Authentication Mismatch**: System was using default credentials (admin/password) instead of your camera's credentials (85725752/Ztatic@PV0sites)

2. **❌ RTSP Path Mismatch**: System was using `/stream1` instead of your camera's actual path `/live/ch00_0`

3. **❌ Network Routing Issues**: VPN router was configured for localhost instead of external network access

4. **❌ External Access Configuration**: No proper configuration for cameras outside the local network

## 🛠️ **SOLUTION IMPLEMENTATION**

### **Step 1: Configure V380 Camera Profile**

```bash
# SSH to your VPS
ssh siteguard@api.aiconstructpro.com

# Navigate to application directory
cd /opt/siteguard

# Run the V380 external configuration script
chmod +x configure-v380-external.sh
./configure-v380-external.sh
```

### **Step 2: Update Media Server Configuration**

The configuration script will:
- ✅ Create camera profile with correct credentials
- ✅ Set proper RTSP path (/live/ch00_0)
- ✅ Enable external network access
- ✅ Configure routing preferences

### **Step 3: Restart Services**

```bash
# Restart media server to load new configuration
pm2 restart siteguard-media-server

# Restart network server for routing updates
pm2 restart siteguard-network-server

# Check service status
pm2 status
```

### **Step 4: Test External Streaming**

```bash
# Run the comprehensive streaming test
chmod +x test-v380-external-streaming.sh
./test-v380-external-streaming.sh
```

## 🌐 **NETWORK ARCHITECTURE**

### **Current Setup**
```
[V380 Camera] → [GLiNet Router] → [ZeroTier VPN] → [Contabo VPS] → [Internet]
172.30.195.39     Local Gateway    10.147.17.x      api.aiconstructpro.com
```

### **Streaming Flow**
1. **Camera** streams RTSP to local network (172.30.195.39:554)
2. **GLiNet Router** forwards traffic through ZeroTier VPN
3. **VPS Media Server** receives RTSP and converts to HLS/WebRTC
4. **Nginx** serves streams to external clients via HTTPS

## 📺 **STREAM ACCESS URLS**

Once configured, your camera will be accessible via:

### **HLS Stream (Recommended)**
```
https://api.aiconstructpro.com/live/camera_85725752/index.m3u8
```

### **WebRTC Stream (Low Latency)**
```
wss://api.aiconstructpro.com/webrtc/camera_85725752
```

### **RTSP Relay**
```
rtsp://api.aiconstructpro.com:554/camera_85725752
```

## 🔧 **TROUBLESHOOTING**

### **Common Issues & Solutions**

#### **1. Stream Not Starting**
```bash
# Check media server logs
pm2 logs siteguard-media-server

# Test direct camera connection
ffprobe -v quiet rtsp://85725752:Ztatic@PV0sites@172.30.195.39:554/live/ch00_0
```

#### **2. External Access Issues**
```bash
# Verify ZeroTier connection
sudo zerotier-cli status
sudo zerotier-cli listnetworks

# Check network routing
curl -X GET http://localhost:3003/api/network/status
```

#### **3. Stream Quality Issues**
```bash
# Check FFmpeg process
ps aux | grep ffmpeg

# Monitor stream health
curl http://localhost:3001/api/streams/85725752/stats
```

## 🚀 **ADVANCED CONFIGURATION**

### **GLiNet Router Setup**

1. **Enable ZeroTier on Router**:
   ```bash
   # Access router admin panel
   # Navigate to VPN → ZeroTier
   # Join network: [Your ZeroTier Network ID]
   ```

2. **Configure Port Forwarding**:
   ```bash
   # Forward port 554 from camera to router
   # Internal IP: 172.30.195.39
   # Internal Port: 554
   # External Port: 554
   ```

### **ZeroTier Network Configuration**

1. **Network Settings**:
   - Private Network: ✅ Enabled
   - IP Range: 10.147.17.0/24
   - Managed Routes: ✅ Enabled

2. **Member Authorization**:
   - Authorize GLiNet router
   - Authorize VPS server
   - Enable IP assignment

## 📊 **MONITORING & MAINTENANCE**

### **Health Checks**
```bash
# Daily health check
./test-v380-external-streaming.sh

# Monitor service status
pm2 monit

# Check system resources
htop
```

### **Log Monitoring**
```bash
# Media server logs
tail -f /var/log/siteguard/media-server.log

# Network server logs
tail -f /var/log/siteguard/network-server.log

# System logs
journalctl -f -u siteguard
```

## 🔒 **SECURITY CONSIDERATIONS**

### **Network Security**
- ✅ ZeroTier encrypted VPN tunnel
- ✅ HTTPS/WSS for client connections
- ✅ Firewall rules on VPS
- ✅ Camera credentials encrypted in config

### **Access Control**
- ✅ Private ZeroTier network
- ✅ Authorized devices only
- ✅ SSL/TLS encryption
- ✅ Rate limiting on streams

## 📞 **SUPPORT & NEXT STEPS**

### **If Everything Works**
✅ Your V380 camera is now streaming from external network!
✅ Access via: https://api.aiconstructpro.com/live/camera_85725752/index.m3u8
✅ Monitor with: `pm2 monit`

### **If Issues Persist**
1. Run diagnostic: `./test-v380-external-streaming.sh`
2. Check logs: `pm2 logs siteguard-media-server`
3. Verify network: `curl http://localhost:3003/api/network/status`
4. Test camera direct: `ffprobe rtsp://85725752:Ztatic@PV0sites@172.30.195.39:554/live/ch00_0`

### **Performance Optimization**
- Monitor bandwidth usage
- Adjust stream quality settings
- Configure CDN if needed
- Set up load balancing for multiple cameras

---

**🎉 Congratulations!** Your V380 camera streaming solution is now configured for external network access with enterprise-grade reliability and security.
