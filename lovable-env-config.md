# Lovable Environment Configuration for SiteGuard

This document provides the environment variables you need to configure in your Lovable project to connect to your Contabo VPS backend.

## 🔧 Environment Variables for Lovable

Add these environment variables in your Lovable project settings:

### API Configuration
```
VITE_API_BASE_URL=https://api.aiconstructpro.com
VITE_MEDIA_SERVER_URL=https://api.aiconstructpro.com/api/media
VITE_ONVIF_SERVER_URL=https://api.aiconstructpro.com/api/onvif
VITE_NETWORK_SERVER_URL=https://api.aiconstructpro.com/api/network
VITE_SECURITY_SERVER_URL=https://api.aiconstructpro.com/api/security
```

### WebSocket Configuration
```
VITE_WEBSOCKET_URL=wss://api.aiconstructpro.com
```

### Feature Flags
```
VITE_ENABLE_REAL_TIME_FEATURES=true
VITE_ENABLE_VIDEO_STREAMING=true
VITE_ENABLE_ONVIF_INTEGRATION=true
VITE_ENABLE_NETWORK_MANAGEMENT=true
```

### Development Settings (Optional)
```
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=info
```

## 📋 How to Add Environment Variables in Lovable

1. **Open your Lovable project**
2. **Go to Project Settings**
3. **Navigate to Environment Variables section**
4. **Add each variable one by one:**
   - Variable Name: `VITE_API_BASE_URL`
   - Variable Value: `https://api.aiconstructpro.com`
   - Click "Add Variable"
   - Repeat for all variables above

## 🔄 After Adding Environment Variables

1. **Redeploy your project** - Lovable will automatically redeploy with the new environment variables
2. **Test the connection** - Check browser console for any CORS or connection errors
3. **Verify API calls** - Use browser developer tools to ensure API calls are going to the correct URLs

## 🧪 Testing the Configuration

After deployment, you can test the configuration by:

1. **Opening browser developer tools**
2. **Going to the Network tab**
3. **Interacting with your SiteGuard application**
4. **Verifying that API calls are made to `https://api.aiconstructpro.com`**

## 🔍 Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Ensure the CORS configuration script has been run on your VPS
   - Check that your Lovable domain is in the allowed origins list

2. **API Connection Errors**
   - Verify that your VPS backend services are running
   - Check that SSL certificates are properly configured
   - Ensure firewall allows HTTPS traffic

3. **WebSocket Connection Issues**
   - Verify WebSocket URL is correct
   - Check that WebSocket connections are allowed through your firewall
   - Ensure SSL is properly configured for WebSocket connections

### Testing Commands (Run on your VPS):

```bash
# Check if services are running
pm2 status

# Test API endpoints
curl https://api.aiconstructpro.com/api/media/health
curl https://api.aiconstructpro.com/api/onvif/health
curl https://api.aiconstructpro.com/api/network/health
curl https://api.aiconstructpro.com/api/security/health

# Check CORS headers
curl -H "Origin: https://aiconstructpro.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://api.aiconstructpro.com/api/media/health
```

## 📝 Notes

- All environment variables starting with `VITE_` are exposed to the client-side code
- Never put sensitive information (like API keys) in VITE_ environment variables
- The backend handles authentication and sensitive operations
- Environment variables are applied during build time, so you need to redeploy after changes

## 🚀 Next Steps

After configuring the environment variables:

1. **Update CORS configuration** on your VPS (run the update-cors-config.sh script)
2. **Test API connectivity** from your frontend
3. **Verify real-time features** (WebSocket connections, video streaming)
4. **Test ONVIF camera integration**
5. **Configure monitoring and alerts**
