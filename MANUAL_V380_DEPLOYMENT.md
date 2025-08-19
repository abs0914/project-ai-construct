# Manual V380 External Streaming Deployment Guide

## 🚀 **STEP-BY-STEP IMPLEMENTATION**

Since automated deployment requires SSH key setup, here's the manual deployment process you can execute directly on your VPS.

### **Prerequisites**
- SSH access to your VPS: `ssh siteguard@api.aiconstructpro.com`
- SiteGuard services running on the VPS

---

## **PHASE 1: CONNECT TO VPS AND BACKUP**

### Step 1: Connect to VPS
```bash
ssh siteguard@api.aiconstructpro.com
# Enter your password when prompted
```

### Step 2: Navigate to Application Directory
```bash
cd /opt/siteguard
pwd  # Should show: /opt/siteguard
```

### Step 3: Create Backup
```bash
# Create backup directory
BACKUP_DIR="backups/v380-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup current configurations
cp media-server/v380-config-manager.js "$BACKUP_DIR/" 2>/dev/null || echo "File not found, skipping"
cp src/lib/services/v380-service.ts "$BACKUP_DIR/" 2>/dev/null || echo "File not found, skipping"
cp media-server/server.js "$BACKUP_DIR/" 2>/dev/null || echo "File not found, skipping"
cp media-server/v380-vpn-router.js "$BACKUP_DIR/" 2>/dev/null || echo "File not found, skipping"

echo "✅ Backup created in: $BACKUP_DIR"
```

---

## **PHASE 2: UPDATE REPOSITORY AND INSTALL DEPENDENCIES**

### Step 4: Update Repository
```bash
cd /opt/siteguard

# Pull latest changes
git fetch origin
git pull origin main

echo "✅ Repository updated"
```

### Step 5: Install Dependencies
```bash
# Install/update dependencies
npm ci --production

echo "✅ Dependencies updated"
```

---

## **PHASE 3: CONFIGURE V380 EXTERNAL CAMERA**

### Step 6: Make Scripts Executable
```bash
chmod +x configure-v380-external.sh
chmod +x test-v380-external-streaming.sh

echo "✅ Scripts made executable"
```

### Step 7: Run V380 Configuration Script
```bash
./configure-v380-external.sh
```

**Expected Output:**
```
🎥 V380 External Network Configuration
==================================================
Camera ID: 85725752
Camera IP: 172.30.195.39
Camera Port: 554
RTSP Path: /live/ch00_0

[STEP] 1. Testing Camera Connectivity
[INFO] Testing direct RTSP connection...
[INFO] Testing RTSP stream with FFprobe...
✅ Direct RTSP connection successful (or ⚠️ will use VPN routing)

[STEP] 2. Configuring V380 Camera Profile
[INFO] ✅ Camera configuration saved to: /opt/siteguard/media-server/external-v380-85725752.json

[STEP] 3. Updating Environment Configuration
[INFO] ✅ Environment variables added

[STEP] 4. Testing Stream Configuration
[INFO] Testing configured stream...
✅ Camera port is accessible (or ⚠️ VPN routing required)

[STEP] 5. Configuration Summary
📋 Configuration Summary:
=========================
Camera ID: 85725752
RTSP URL: rtsp://***:***@172.30.195.39:554/live/ch00_0
Direct Access: true/false
Config File: /opt/siteguard/media-server/external-v380-85725752.json

✅ V380 External Camera Configuration Complete
```

---

## **PHASE 4: BUILD AND RESTART SERVICES**

### Step 8: Build Application
```bash
npm run build

echo "✅ Application built successfully"
```

### Step 9: Restart Services
```bash
# Restart media server
pm2 restart siteguard-media-server
echo "✅ Media server restarted"

# Restart network server
pm2 restart siteguard-network-server
echo "✅ Network server restarted"

# Restart other services
pm2 restart siteguard-onvif-server
pm2 restart siteguard-security-server

echo "✅ All services restarted"

# Check service status
pm2 status
```

**Expected PM2 Status:**
```
┌─────┬────────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name                   │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼────────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ siteguard-media-server │ default     │ 1.0.0   │ fork    │ 12345    │ 0s     │ 1    │ online    │ 0%       │ 50.0mb   │ siteguard│ disabled │
│ 1   │ siteguard-network-...  │ default     │ 1.0.0   │ fork    │ 12346    │ 0s     │ 1    │ online    │ 0%       │ 30.0mb   │ siteguard│ disabled │
│ 2   │ siteguard-onvif-server │ default     │ 1.0.0   │ fork    │ 12347    │ 0s     │ 1    │ online    │ 0%       │ 25.0mb   │ siteguard│ disabled │
│ 3   │ siteguard-security-... │ default     │ 1.0.0   │ fork    │ 12348    │ 0s     │ 1    │ online    │ 0%       │ 20.0mb   │ siteguard│ disabled │
└─────┴────────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

---

## **PHASE 5: TEST V380 EXTERNAL STREAMING**

### Step 10: Run Streaming Test
```bash
./test-v380-external-streaming.sh
```

**Expected Test Output:**
```
🧪 V380 External Streaming Test
==================================================
Camera ID: 85725752
Camera IP: 172.30.195.39
Media Server: http://localhost:3001
Public URL: https://api.aiconstructpro.com

[STEP] 1. Pre-flight Checks
[INFO] ✅ Media server is running
[INFO] ✅ FFmpeg is available

[STEP] 2. Testing Direct Camera Connection
[INFO] Testing RTSP URL: rtsp://***:***@172.30.195.39:554/live/ch00_0
[INFO] ✅ Direct RTSP connection successful

[STEP] 3. Starting Stream via Media Server
[INFO] Starting stream for camera 85725752...
Stream start response: {"success": true, "urls": {...}}
[INFO] ✅ Stream started successfully

[STEP] 4. Testing Stream Endpoints
[INFO] Waiting for stream to initialize...
[INFO] Testing HLS endpoint: https://api.aiconstructpro.com/live/camera_85725752/index.m3u8
[INFO] ✅ HLS endpoint is accessible
[INFO] Testing RTSP relay: rtsp://api.aiconstructpro.com:554/camera_85725752
[INFO] ✅ RTSP relay is working
[INFO] Testing WebRTC endpoint: https://api.aiconstructpro.com/webrtc/camera_85725752
[INFO] ✅ WebRTC endpoint is accessible

[STEP] 5. Stream Quality Test
[INFO] Testing stream quality...
[INFO] ✅ Stream quality test passed (segment size: XXXX bytes)

[STEP] 6. Performance Metrics
Stream statistics: {...}

[STEP] 7. Test Results Summary
📊 Test Results Summary
=======================
Direct RTSP Access: ✅ Working
Stream Started: ✅ Success
HLS Streaming: ✅ Working
RTSP Relay: ✅ Working
WebRTC: ✅ Working
Stream Quality: ✅ Good

🎥 Stream Access URLs:
=====================
HLS Stream: https://api.aiconstructpro.com/live/camera_85725752/index.m3u8
RTSP Relay: rtsp://api.aiconstructpro.com:554/camera_85725752
WebRTC: https://api.aiconstructpro.com/webrtc/camera_85725752

[INFO] 🎉 V380 External Streaming Test: PASSED

✅ Your V380 camera is successfully streaming from external network!
✅ Stream is accessible via multiple protocols
✅ Ready for production use
```

---

## **PHASE 6: VERIFICATION AND MONITORING**

### Step 11: Verify Stream Access
Test the stream URLs in your browser or media player:

1. **HLS Stream (Browser)**:
   ```
   https://api.aiconstructpro.com/live/camera_85725752/index.m3u8
   ```

2. **RTSP Stream (VLC/Media Player)**:
   ```
   rtsp://api.aiconstructpro.com:554/camera_85725752
   ```

### Step 12: Monitor Services
```bash
# Monitor all services
pm2 monit

# Check specific service logs
pm2 logs siteguard-media-server

# Check system resources
htop
```

---

## **🎉 SUCCESS INDICATORS**

If everything is working correctly, you should see:

✅ **All PM2 services online**
✅ **Stream test passes all checks**
✅ **HLS stream accessible in browser**
✅ **RTSP stream works in VLC**
✅ **No errors in service logs**

---

## **🔧 TROUBLESHOOTING**

If you encounter issues:

1. **Check service logs**:
   ```bash
   pm2 logs siteguard-media-server --lines 50
   ```

2. **Test camera connectivity**:
   ```bash
   ffprobe -v quiet rtsp://85725752:Ztatic@PV0sites@172.30.195.39:554/live/ch00_0
   ```

3. **Restart services**:
   ```bash
   pm2 restart all
   ```

4. **Check network connectivity**:
   ```bash
   curl -I https://api.aiconstructpro.com
   ```

---

**🚀 Ready to proceed? Start with Phase 1 and work through each step!**
