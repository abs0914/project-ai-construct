# V380 Remote Camera UI Testing Steps

## 🎯 Testing Scenario
**You are on Network A, Camera is on Network B via GL.iNET Router + ZeroTier**

## 📱 Step-by-Step UI Testing Guide

### Step 1: Access the V380 Remote Test Interface

1. **Open your SiteGuard dashboard** in a web browser
   ```
   https://your-siteguard-domain.com
   ```

2. **Navigate to Settings**
   - Click the **"Settings"** button in the top-right corner
   - Or go directly to: `https://your-siteguard-domain.com/siteguard/settings`

3. **Go to Camera Settings**
   - Click on the **"Cameras"** tab
   - You'll see 3 sub-tabs: **ONVIF Cameras**, **V380 Setup**, **V380 Remote Test**

4. **Select V380 Remote Test**
   - Click on the **"V380 Remote Test"** tab
   - You'll see the remote testing interface

### Step 2: Configure Your Remote Camera

In the **Setup Tab**, fill in your camera information:

#### 📋 Required Information:
```
Camera Name: "Remote Site A Camera"
GL.iNET Router: [Select from dropdown] → "GL.iNET Router 001 - Site A"
ZeroTier IP: "10.147.17.100"
Camera Local IP: "192.168.8.100"
Username: "admin"
Password: "your_camera_password"
```

#### 🔍 How to Find These Values:

**ZeroTier IP:**
- Check your ZeroTier Central dashboard
- Look for the camera's assigned IP in the network
- Usually in format: `10.147.17.xxx`

**Camera Local IP:**
- Check the router's admin panel
- Look in DHCP client list
- Usually in format: `192.168.8.xxx` or `192.168.1.xxx`

**GL.iNET Router:**
- Should appear in the dropdown automatically
- If not visible, check if router is online and connected to ZeroTier

### Step 3: Run the Remote Test

1. **Click "Start Remote Test"**
   - The interface switches to the **Testing Tab**
   - You'll see a progress bar and current test status

2. **Watch the Test Progress** (6 phases):
   ```
   Phase 1: Network Discovery      [~2 seconds]
   Phase 2: Router Connectivity    [~1.5 seconds]  
   Phase 3: ZeroTier Connection    [~2 seconds]
   Phase 4: Camera Reachability    [~3 seconds]
   Phase 5: Stream Connection      [~2.5 seconds]
   Phase 6: Route Optimization     [~1.5 seconds]
   ```

3. **Monitor Test Results**
   - Each phase shows **Pass** ✅ or **Fail** ❌
   - Failed tests show error details
   - Successful tests show connection metrics

### Step 4: Review Test Results

In the **Results Tab**, you'll see:

#### ✅ Expected Successful Results:
```
✅ Network Discovery
   - zerotierNetworks: 2
   - glinetRouters: 3
   - discoveryTime: 2.1s

✅ Router Connectivity  
   - routerName: GL.iNET Router 001
   - location: Site A
   - zerotierIp: 10.147.17.1
   - status: connected
   - latency: 45ms

✅ ZeroTier Connection
   - zerotierIp: 10.147.17.100
   - networkId: zt-network-001
   - status: connected
   - latency: 78ms
   - bandwidth: 50 Mbps

✅ Camera Reachability
   - selectedMethod: zerotier
   - ip: 10.147.17.100
   - port: 554
   - latency: 82ms
   - status: reachable

✅ Stream Connection
   - streamUrls: [HLS, RTSP, WebRTC URLs]
   - quality: high
   - resolution: 1920x1080
   - frameRate: 25
   - audioEnabled: true

✅ Route Optimization
   - optimalRoute: zerotier
   - latency: 78ms
   - bandwidth: 45 Mbps
   - reliability: 98%
   - fallbackRoutes: 2
```

#### 📺 Stream URLs Generated:
```
HLS:    https://api.aiconstructpro.com/v380-streams/hls/remote-v380-test/index.m3u8
RTSP:   rtsp://api.aiconstructpro.com:554/remote-v380-test  
WebRTC: https://api.aiconstructpro.com/v380-streams/webrtc/remote-v380-test.webm
```

### Step 5: Start Remote Streaming

1. **Click "Start Remote Stream"**
   - Button becomes available after successful tests
   - System establishes the actual stream connection

2. **Verify Stream Status**
   - Button changes to **"Stop Remote Stream"** (red)
   - Stream URLs are highlighted in green box
   - Success toast notification appears

3. **Test Stream Playback**
   - Copy the HLS URL
   - Open in a new browser tab
   - Or use VLC with the RTSP URL

### Step 6: View Live Stream

#### Option A: In SiteGuard Dashboard
1. **Go back to main dashboard**
2. **Navigate to "Live Feed" tab**
3. **Your remote camera should appear** in the camera grid
4. **Click to select and view** the live stream

#### Option B: Direct URL Testing
1. **Copy the HLS URL** from test results
2. **Open in browser**: 
   ```
   https://api.aiconstructpro.com/v380-streams/hls/remote-v380-test/index.m3u8
   ```
3. **Should start playing** the live video

#### Option C: VLC Player
1. **Open VLC Media Player**
2. **Media → Open Network Stream**
3. **Paste RTSP URL**:
   ```
   rtsp://api.aiconstructpro.com:554/remote-v380-test
   ```
4. **Click Play**

## 🔧 Troubleshooting Common UI Issues

### ❌ "Router Connectivity Failed"
**What you'll see in UI:**
- Red ❌ badge next to "Router Connectivity"
- Error message: "Selected router not found" or "Router unreachable"

**Solutions:**
1. **Check router selection** - Make sure you selected the correct router
2. **Verify router status** - Router should show as "connected" in dropdown
3. **Check ZeroTier** - Ensure your device is connected to ZeroTier network

### ❌ "Camera Reachability Failed"  
**What you'll see in UI:**
- Red ❌ badge next to "Camera Reachability"
- Error message: "Camera not reachable via any method"

**Solutions:**
1. **Verify camera IP** - Double-check the Camera Local IP (192.168.8.100)
2. **Check camera power** - Ensure camera is powered on and connected
3. **Test from router** - Try accessing camera from router's local network first

### ❌ "Stream Connection Failed"
**What you'll see in UI:**
- Red ❌ badge next to "Stream Connection"  
- Error message: "Stream connection failed" or "Authentication failed"

**Solutions:**
1. **Check credentials** - Verify username/password are correct
2. **Test camera directly** - Try accessing camera's web interface
3. **Check RTSP support** - Ensure camera supports RTSP streaming

### ⚠️ "Start Remote Stream" Button Disabled
**Cause:** One or more tests failed
**Solution:** 
1. **Review failed tests** in Results tab
2. **Fix the issues** identified
3. **Click "Run New Test"** to retry
4. **Button enables** when all tests pass

## 📱 Mobile Testing

The same interface works on mobile devices:

1. **Access on mobile browser**
2. **Interface adapts** to smaller screen
3. **All functionality** remains the same
4. **Touch-friendly** buttons and controls

## 🎥 Expected Performance

### Typical Results:
- **Total test time**: ~12 seconds
- **Stream startup**: 3-8 seconds  
- **Video latency**: 80-150ms
- **Stream quality**: 1080p @ 25fps
- **Bandwidth usage**: 2-5 Mbps

### Success Indicators:
- **All 6 tests pass** ✅
- **Stream URLs generated** 📺
- **"Start Remote Stream" enabled** 🟢
- **Live video plays** in browser/VLC 🎬

## 📞 Getting Help

If tests fail or streams don't work:

1. **Screenshot the test results** showing which tests failed
2. **Note the specific error messages** 
3. **Check network connectivity** between your location and the camera site
4. **Verify all configuration values** are correct
5. **Contact support** with screenshots and error details

The V380 Remote Test interface provides comprehensive diagnostics to identify exactly where connectivity issues occur when testing cameras across different networks.
