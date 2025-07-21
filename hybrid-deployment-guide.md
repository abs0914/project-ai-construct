# SiteGuard Hybrid Deployment Guide
## Frontend on Lovable + Backend on Contabo VPS

This guide explains how to set up a hybrid deployment where your SiteGuard frontend remains on Lovable (aiconstructpro.com) while the backend services run on your Contabo VPS.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    HYBRID ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (Lovable)              Backend (Contabo VPS)     │
│  ┌─────────────────────┐         ┌─────────────────────┐   │
│  │  aiconstructpro.com │◄────────┤ api.aiconstructpro.com│   │
│  │                     │         │                     │   │
│  │  - React App        │         │ - Media Server      │   │
│  │  - Static Assets    │         │ - ONVIF Server      │   │
│  │  - CDN Delivery     │         │ - Network Server    │   │
│  │  - Auto SSL         │         │ - Security Server   │   │
│  └─────────────────────┘         └─────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Step 1: Configure Backend on Contabo VPS

### 1.1 Deploy Backend Services Only

Create a backend-only deployment script:

```bash
# Download the backend deployment script
wget https://raw.githubusercontent.com/abs0914/project-ai-construct/main/deploy-backend-only.sh
chmod +x deploy-backend-only.sh
sudo ./deploy-backend-only.sh api.aiconstructpro.com
```

### 1.2 Configure DNS for API Subdomain

Add an A record for your API subdomain:
- **Host:** `api`
- **Type:** `A`
- **Value:** `YOUR_CONTABO_VPS_IP`
- **TTL:** `300`

## 🔧 Step 2: Update Frontend Configuration

### 2.1 Update Environment Variables in Lovable

In your Lovable project, update the environment configuration to point to your VPS backend:

```env
# API Configuration
VITE_API_BASE_URL=https://api.aiconstructpro.com
VITE_MEDIA_SERVER_URL=https://api.aiconstructpro.com:3001
VITE_ONVIF_SERVER_URL=https://api.aiconstructpro.com:3002
VITE_NETWORK_SERVER_URL=https://api.aiconstructpro.com:3003
VITE_SECURITY_SERVER_URL=https://api.aiconstructpro.com:3004

# WebSocket Configuration
VITE_WEBSOCKET_URL=wss://api.aiconstructpro.com
```

### 2.2 Update API Client Configuration

Update your API client to use the VPS backend:

```typescript
// src/lib/api-client.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.aiconstructpro.com';

export const apiClient = {
  baseURL: API_BASE_URL,
  mediaServer: `${API_BASE_URL}:3001`,
  onvifServer: `${API_BASE_URL}:3002`,
  networkServer: `${API_BASE_URL}:3003`,
  securityServer: `${API_BASE_URL}:3004`,
};
```

## 🛡️ Step 3: Configure CORS and Security

### 3.1 Update Backend CORS Configuration

On your Contabo VPS, update the CORS settings to allow requests from your Lovable frontend:

```javascript
// In each server file, update CORS configuration
const corsOptions = {
  origin: [
    'https://aiconstructpro.com',
    'https://www.aiconstructpro.com',
    'https://preview--project-ai-construct.lovable.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
```

### 3.2 Configure SSL for API Subdomain

```bash
# On your Contabo VPS
sudo certbot --nginx -d api.aiconstructpro.com
```

## 📊 Step 4: Benefits of This Approach

### ✅ Advantages

1. **Best of Both Worlds**
   - Frontend: Lovable's ease of use and automatic deployments
   - Backend: Full control over server capabilities

2. **Cost Effective**
   - Frontend hosting included with Lovable
   - Only pay for VPS resources for backend

3. **Scalability**
   - Frontend scales automatically with Lovable
   - Backend can be scaled on VPS as needed

4. **Maintenance**
   - Frontend updates through Lovable
   - Backend maintenance only on VPS

5. **Performance**
   - Frontend served via CDN
   - Backend optimized for real-time operations

### ⚠️ Considerations

1. **Latency**: Cross-origin requests may have slight latency
2. **Complexity**: Managing two deployment environments
3. **CORS**: Need to properly configure cross-origin requests

## 🔄 Alternative: Full Migration to Contabo VPS

If you prefer complete control, you can migrate everything to Contabo VPS:

### Pros:
- Single deployment environment
- Complete control over all services
- No cross-origin complexity
- Better integration between frontend and backend

### Cons:
- Need to manage frontend deployment
- SSL certificate management
- CDN setup for static assets
- More server maintenance

## 🎯 Recommendation

**For SiteGuard specifically, I recommend the hybrid approach** because:

1. **SiteGuard requires real-time features** (video streaming, camera integration)
2. **Backend services are essential** for core functionality
3. **Frontend is already working well** on Lovable
4. **Easier maintenance** with separated concerns

## 📋 Implementation Checklist

- [ ] Set up Contabo VPS with backend services
- [ ] Configure DNS for api.aiconstructpro.com
- [ ] Update frontend environment variables in Lovable
- [ ] Configure CORS on backend services
- [ ] Set up SSL certificate for API subdomain
- [ ] Test cross-origin requests
- [ ] Verify video streaming functionality
- [ ] Test ONVIF camera integration
- [ ] Configure monitoring for backend services
- [ ] Set up backup procedures for VPS

## 🆘 Troubleshooting

### Common Issues:

1. **CORS Errors**: Ensure backend CORS is configured for aiconstructpro.com
2. **SSL Issues**: Verify SSL certificate for api.aiconstructpro.com
3. **WebSocket Connection**: Check firewall rules for WebSocket ports
4. **Video Streaming**: Ensure media server is accessible from frontend

### Testing Commands:

```bash
# Test API connectivity
curl https://api.aiconstructpro.com:3001/health

# Test WebSocket connection
wscat -c wss://api.aiconstructpro.com

# Check SSL certificate
openssl s_client -connect api.aiconstructpro.com:443
```

This hybrid approach gives you the best of both worlds while maintaining the functionality that SiteGuard requires for surveillance and security management.
