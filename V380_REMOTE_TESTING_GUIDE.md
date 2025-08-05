# V380 Remote Camera Testing Guide

## Testing Scenario: You're on a Different Network

This guide walks you through testing V380 cameras that are connected via GL.iNET router and ZeroTier when you're accessing from a different network location.

## 🌐 Network Topology

```
[Your Location]          [ZeroTier VPN]          [Camera Location]
     |                        |                        |
[Your Device] ←→ [Internet] ←→ [ZeroTier] ←→ [GL.iNET Router] ←→ [V380 Camera]
  (Network A)                                    (Network B)        (192.168.8.100)
```

## 🧪 Testing Steps

### Step 1: Access the V380 Remote Test Interface

1. **Navigate to SiteGuard Dashboard**
2. **Go to Camera Management**
3. **Select "V380 Remote Test"** (new component)
4. **You'll see the testing interface with 3 tabs**: Setup, Testing, Results

### Step 2: Configure Remote Camera Settings

In the **Setup Tab**, enter your camera details:

#### Required Information:
- **Camera Name**: `Remote Site Camera`
- **GL.iNET Router**: Select from dropdown (e.g., "GL.iNET Router 001 - Site A")
- **ZeroTier IP**: `10.147.17.100` (camera's ZeroTier IP)
- **Camera Local IP**: `192.168.8.100` (camera's IP behind the router)
- **Username**: `admin`
- **Password**: `your_camera_password`

#### Optional (for fallback):
- **Direct IP**: Leave empty (since you're on different network)

### Step 3: Run the Remote Test

Click **"Start Remote Test"** to begin the 6-phase testing process:

#### Phase 1: Network Discovery
- ✅ **Expected**: Discovers ZeroTier networks and GL.iNET routers
- ⏱️ **Duration**: ~2 seconds
- 📊 **Results**: Shows number of networks and routers found

#### Phase 2: Router Connectivity  
- ✅ **Expected**: Connects to selected GL.iNET router via ZeroTier
- ⏱️ **Duration**: ~1.5 seconds
- 📊 **Results**: Router status, location, ZeroTier IP, latency

#### Phase 3: ZeroTier Connection
- ✅ **Expected**: Establishes VPN tunnel to camera network
- ⏱️ **Duration**: ~2 seconds  
- 📊 **Results**: ZeroTier IP, network ID, latency, bandwidth

#### Phase 4: Camera Reachability
- ✅ **Expected**: Tests multiple connection paths to camera
- ⏱️ **Duration**: ~3 seconds
- 📊 **Results**: Selected connection method, IP, port, latency
- 🔄 **Connection Priority**:
  1. Direct (will fail - different networks)
  2. **ZeroTier** (should succeed)
  3. Router Forward (backup)

#### Phase 5: Stream Connection
- ✅ **Expected**: Establishes V380 stream connection
- ⏱️ **Duration**: ~2.5 seconds
- 📊 **Results**: Stream URLs (HLS, RTSP, WebRTC), quality settings

#### Phase 6: Route Optimization
- ✅ **Expected**: Optimizes connection for best performance
- ⏱️ **Duration**: ~1.5 seconds
- 📊 **Results**: Optimal route, latency, bandwidth, reliability

### Step 4: Review Test Results

In the **Results Tab**, you'll see:

#### ✅ Successful Test Results:
```
✅ Network Discovery: 2 networks, 3 routers found
✅ Router Connectivity: Connected to GL.iNET-001 (45ms)
✅ ZeroTier Connection: 10.147.17.100 connected (78ms)
✅ Camera Reachability: ZeroTier method selected (82ms)
✅ Stream Connection: All formats available
✅ Route Optimization: 98% reliability, 2 fallback routes
```

#### 📺 Stream URLs Generated:
- **HLS**: `https://api.aiconstructpro.com/v380-streams/hls/remote-v380-test/index.m3u8`
- **RTSP**: `rtsp://api.aiconstructpro.com:554/remote-v380-test`
- **WebRTC**: `https://api.aiconstructpro.com/v380-streams/webrtc/remote-v380-test.webm`

### Step 5: Start Remote Streaming

1. **Click "Start Remote Stream"**
2. **System will**:
   - Use the tested connection path (ZeroTier)
   - Start V380 capture service
   - Begin stream relay to standard formats
   - Provide live stream URLs

3. **You can now view the stream** in your dashboard using any of the generated URLs

## 🔧 Troubleshooting Common Issues

### ❌ Test Failures and Solutions:

#### "Router Connectivity Failed"
- **Cause**: GL.iNET router not accessible via ZeroTier
- **Solution**: 
  - Check router's ZeroTier status
  - Verify router is online and connected to ZeroTier network
  - Ensure firewall allows ZeroTier traffic

#### "ZeroTier Connection Failed"  
- **Cause**: ZeroTier network issues
- **Solution**:
  - Verify ZeroTier client is running on your device
  - Check if you're authorized on the ZeroTier network
  - Confirm camera's ZeroTier IP is correct

#### "Camera Reachability Failed"
- **Cause**: Camera not accessible through any connection method
- **Solution**:
  - Verify camera is powered on and connected to router
  - Check camera's local IP address (192.168.8.100)
  - Test camera access from router's local network first

#### "Stream Connection Failed"
- **Cause**: V380 protocol or authentication issues
- **Solution**:
  - Verify camera username/password
  - Check if camera supports RTSP streaming
  - Ensure camera firmware is compatible

## 📱 Mobile Testing

The same interface works on mobile devices:

1. **Access via mobile browser**: `https://your-siteguard-domain.com`
2. **Navigate to V380 Remote Test**
3. **Follow the same testing steps**
4. **Stream will work on mobile** using HLS format

## 🎥 Video Stream Testing

After successful test and stream start:

### Browser Testing:
```html
<!-- HLS Stream (recommended for web) -->
<video controls>
  <source src="https://api.aiconstructpro.com/v380-streams/hls/remote-v380-test/index.m3u8" type="application/x-mpegURL">
</video>
```

### VLC Testing:
1. **Open VLC Media Player**
2. **Media → Open Network Stream**
3. **Enter RTSP URL**: `rtsp://api.aiconstructpro.com:554/remote-v380-test`
4. **Click Play**

### Mobile App Testing:
- **iOS**: Use built-in video player with HLS URL
- **Android**: Use VLC or MX Player with RTSP URL

## 📊 Performance Expectations

### Typical Results for Cross-Network Streaming:
- **Latency**: 80-150ms (via ZeroTier)
- **Bandwidth**: 2-5 Mbps (depending on quality)
- **Reliability**: 95-99% uptime
- **Startup Time**: 3-8 seconds for initial connection

### Quality Settings Impact:
- **High Quality (1080p)**: ~3-5 Mbps, higher latency
- **Medium Quality (720p)**: ~1-3 Mbps, balanced
- **Low Quality (480p)**: ~0.5-1 Mbps, lowest latency

## 🔄 Automatic Failover Testing

To test the failover system:

1. **Start streaming successfully**
2. **Simulate network issues**:
   - Disconnect ZeroTier temporarily
   - Block router access
3. **System should**:
   - Detect connection failure
   - Attempt fallback routes
   - Restore connection when available
4. **Monitor in dashboard** for failover events

## 📈 Monitoring and Logs

### Real-time Monitoring:
- **Connection Status**: Green/Red indicators
- **Stream Health**: Bitrate, frame rate, errors
- **Network Path**: Current route being used
- **Latency**: Real-time ping measurements

### Log Files:
- **Media Server**: `media-server/logs/v380-remote.log`
- **Network Events**: `network-server/logs/zerotier.log`
- **Router Status**: `network-server/logs/glinet.log`

## 🚀 Production Deployment

Once testing is successful:

1. **Save camera configuration** in the system
2. **Set up monitoring alerts** for connection failures
3. **Configure automatic restart** for failed streams
4. **Document the working configuration** for future reference

## 📞 Support Information

If you encounter issues during testing:

1. **Check the test results** for specific failure points
2. **Review network connectivity** between all components
3. **Verify camera and router configurations**
4. **Contact support** with test results and error logs

The V380 Remote Test interface provides comprehensive diagnostics to identify and resolve any connectivity issues when accessing cameras across different networks via GL.iNET routers and ZeroTier VPN.
