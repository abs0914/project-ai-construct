# Live Feeds Fix Summary

## 🎯 Issues Identified and Fixed

### 1. CORS Configuration Issues ✅ FIXED
- **Problem**: Backend services were not allowing requests from `https://aiconstructpro.com`
- **Solution**: Updated CORS configuration in all backend services:
  - `security-server/auth-middleware.js` - Updated allowedOrigins array
  - `media-server/config.js` - Updated security.allowedOrigins
  - `onvif-server/server.js` - Replaced simple cors() with specific configuration
  - `network-server/server.js` - Replaced simple cors() with specific configuration

### 2. URL Generation Issues ✅ FIXED
- **Problem**: Media server was generating localhost URLs instead of public domain URLs
- **Solution**: Updated `media-server/server.js` to use environment variables for domain:
  - HLS URLs now use `https://api.aiconstructpro.com/live/...`
  - WebRTC URLs now use `wss://api.aiconstructpro.com/webrtc/...`

## 📁 Files Modified

### Backend Configuration Files:
1. `media-server/server.js` - Fixed URL generation for streams
2. `media-server/config.js` - Updated CORS allowedOrigins
3. `security-server/auth-middleware.js` - Added aiconstructpro.com to allowed origins
4. `onvif-server/server.js` - Updated CORS configuration
5. `network-server/server.js` - Updated CORS configuration

### Deployment Scripts:
1. `fix-live-feeds.sh` - Comprehensive fix script for VPS
2. `deploy-live-feeds-fix.sh` - Deployment script to upload fixes

## 🚀 Deployment Instructions

### Option 1: Manual File Upload (Recommended)
1. Upload the modified files to your VPS:
   ```bash
   scp media-server/server.js root@api.aiconstructpro.com:/opt/siteguard/media-server/
   scp media-server/config.js root@api.aiconstructpro.com:/opt/siteguard/media-server/
   scp security-server/auth-middleware.js root@api.aiconstructpro.com:/opt/siteguard/security-server/
   scp onvif-server/server.js root@api.aiconstructpro.com:/opt/siteguard/onvif-server/
   scp network-server/server.js root@api.aiconstructpro.com:/opt/siteguard/network-server/
   ```

2. SSH into your VPS and restart services:
   ```bash
   ssh root@api.aiconstructpro.com
   cd /opt/siteguard
   
   # Update environment variables
   echo "PUBLIC_URL=https://api.aiconstructpro.com" >> .env
   echo "DOMAIN=api.aiconstructpro.com" >> .env
   
   # Restart all services
   pm2 restart all
   
   # Check status
   pm2 status
   pm2 logs
   ```

### Option 2: Automated Deployment Script
1. Make the script executable (Linux/Mac):
   ```bash
   chmod +x deploy-live-feeds-fix.sh
   ./deploy-live-feeds-fix.sh
   ```

2. For Windows users, run the commands manually or use WSL/Git Bash.

## 🧪 Testing the Fix

After deployment, test the following:

### 1. CORS Headers
Open browser console on `https://aiconstructpro.com` and check that API calls no longer show CORS errors:
```javascript
fetch('https://api.aiconstructpro.com/api/health')
  .then(response => response.json())
  .then(data => console.log('Health check:', data))
  .catch(error => console.error('CORS Error:', error));
```

### 2. Stream URL Generation
Test that stream URLs are generated correctly:
```javascript
fetch('https://api.aiconstructpro.com/api/streams/test-camera/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rtspUrl: 'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4'
  })
})
.then(response => response.json())
.then(data => {
  console.log('Stream URLs:', data.urls);
  // Should show:
  // hls: "https://api.aiconstructpro.com/live/camera_test-camera/index.m3u8"
  // webrtc: "wss://api.aiconstructpro.com/webrtc/camera_test-camera"
});
```

### 3. HLS Stream Access
Test that HLS streams are accessible:
```
https://api.aiconstructpro.com/live/camera_test-camera/index.m3u8
```

## 🔍 Troubleshooting

### If CORS errors persist:
1. Check PM2 logs: `pm2 logs`
2. Verify Nginx configuration includes CORS headers
3. Ensure all services restarted properly: `pm2 restart all`

### If stream URLs still show localhost:
1. Verify environment variables are set: `cat /opt/siteguard/.env`
2. Check that the media server is using the updated code: `pm2 logs media-server`

### If HLS streams return 404:
1. Check that FFmpeg is running: `ps aux | grep ffmpeg`
2. Verify media files are being generated: `ls -la /opt/siteguard/media-server/media/live/`
3. Check Nginx configuration for `/live/` location block

## 📊 Expected Results

After applying these fixes:
- ✅ No more CORS errors in browser console
- ✅ Stream URLs use `https://api.aiconstructpro.com` instead of `localhost`
- ✅ HLS manifest files are accessible at the correct URLs
- ✅ Live feeds display properly in the frontend application

## 🎉 Next Steps

1. Deploy the fixes using one of the methods above
2. Test the live feeds functionality in your frontend
3. Monitor PM2 logs for any remaining issues
4. If everything works, consider creating a backup of the working configuration

The live feeds should now be fully functional! 🚀
