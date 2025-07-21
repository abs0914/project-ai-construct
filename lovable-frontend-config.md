# SiteGuard Frontend Configuration for Lovable

This guide explains how to configure your SiteGuard frontend on Lovable to connect to backend services running on your Contabo VPS.

## 🔧 Environment Variables Configuration

### Step 1: Access Lovable Environment Settings

1. Go to your Lovable project dashboard
2. Navigate to **Project Settings** > **Environment Variables**
3. Add the following environment variables:

```
VITE_API_BASE_URL=https://api.aiconstructpro.com
VITE_MEDIA_SERVER_URL=https://api.aiconstructpro.com/api/media
VITE_ONVIF_SERVER_URL=https://api.aiconstructpro.com/api/onvif
VITE_NETWORK_SERVER_URL=https://api.aiconstructpro.com/api/network
VITE_SECURITY_SERVER_URL=https://api.aiconstructpro.com/api/security
VITE_WEBSOCKET_URL=wss://api.aiconstructpro.com
```

### Step 2: Create API Configuration File

Create or update the API client configuration file in your project:

```typescript
// src/lib/api-config.ts
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.aiconstructpro.com',
  mediaServer: import.meta.env.VITE_MEDIA_SERVER_URL || 'https://api.aiconstructpro.com/api/media',
  onvifServer: import.meta.env.VITE_ONVIF_SERVER_URL || 'https://api.aiconstructpro.com/api/onvif',
  networkServer: import.meta.env.VITE_NETWORK_SERVER_URL || 'https://api.aiconstructpro.com/api/network',
  securityServer: import.meta.env.VITE_SECURITY_SERVER_URL || 'https://api.aiconstructpro.com/api/security',
  websocketURL: import.meta.env.VITE_WEBSOCKET_URL || 'wss://api.aiconstructpro.com',
};
```

## 🔄 Update API Client

Update your API client to use the new configuration:

```typescript
// src/lib/api-client.ts
import axios from 'axios';
import { API_CONFIG } from './api-config';

const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
```

## 🎥 Update Media Streaming Components

Update your video streaming components to use the new media server URL:

```typescript
// src/components/siteguard/SiteGuardLiveFeed.tsx
import { API_CONFIG } from '@/lib/api-config';

// Example HLS stream URL
const getStreamUrl = (cameraId: string) => {
  return `${API_CONFIG.mediaServer}/stream/${cameraId}/index.m3u8`;
};
```

## 🔌 Update WebSocket Connection

Update your WebSocket connection to use the new WebSocket URL:

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/lib/api-config';

export const useWebSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  
  useEffect(() => {
    const socketInstance = io(API_CONFIG.websocketURL, {
      withCredentials: true,
      transports: ['websocket'],
    });
    
    setSocket(socketInstance);
    
    return () => {
      socketInstance.disconnect();
    };
  }, []);
  
  return socket;
};
```

## 🔒 Update Authentication

Update your authentication service to use the security server:

```typescript
// src/lib/auth-service.ts
import apiClient from './api-client';
import { API_CONFIG } from './api-config';

export const authService = {
  login: async (username: string, password: string) => {
    const response = await apiClient.post(`${API_CONFIG.securityServer}/auth/login`, {
      username,
      password,
    });
    return response.data;
  },
  
  logout: async () => {
    const response = await apiClient.post(`${API_CONFIG.securityServer}/auth/logout`);
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await apiClient.get(`${API_CONFIG.securityServer}/auth/me`);
    return response.data;
  },
};
```

## 📷 Update ONVIF Camera Integration

Update your camera integration to use the ONVIF server:

```typescript
// src/lib/camera-service.ts
import apiClient from './api-client';
import { API_CONFIG } from './api-config';

export const cameraService = {
  discoverCameras: async () => {
    const response = await apiClient.get(`${API_CONFIG.onvifServer}/discover`);
    return response.data;
  },
  
  getCameraDetails: async (cameraId: string) => {
    const response = await apiClient.get(`${API_CONFIG.onvifServer}/cameras/${cameraId}`);
    return response.data;
  },
  
  startRecording: async (cameraId: string) => {
    const response = await apiClient.post(`${API_CONFIG.mediaServer}/recording/start/${cameraId}`);
    return response.data;
  },
  
  stopRecording: async (cameraId: string) => {
    const response = await apiClient.post(`${API_CONFIG.mediaServer}/recording/stop/${cameraId}`);
    return response.data;
  },
};
```

## 🌐 Update Network Management

Update your network management to use the network server:

```typescript
// src/lib/network-service.ts
import apiClient from './api-client';
import { API_CONFIG } from './api-config';

export const networkService = {
  getNetworkDevices: async () => {
    const response = await apiClient.get(`${API_CONFIG.networkServer}/devices`);
    return response.data;
  },
  
  getZeroTierNetworks: async () => {
    const response = await apiClient.get(`${API_CONFIG.networkServer}/zerotier/networks`);
    return response.data;
  },
  
  joinZeroTierNetwork: async (networkId: string) => {
    const response = await apiClient.post(`${API_CONFIG.networkServer}/zerotier/join`, { networkId });
    return response.data;
  },
};
```

## 🧪 Testing the Integration

After updating your frontend configuration, test the integration with your backend:

1. **Test Authentication:**
   - Try logging in with test credentials
   - Verify that authentication tokens are stored correctly

2. **Test Camera Integration:**
   - Test camera discovery
   - Test live streaming
   - Test recording functionality

3. **Test Network Management:**
   - Test device discovery
   - Test ZeroTier network integration

4. **Test WebSocket Connection:**
   - Verify real-time updates are working
   - Test alerts and notifications

## 🔍 Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Check that your backend CORS configuration includes `https://aiconstructpro.com`
   - Verify that credentials are allowed in CORS settings

2. **Authentication Issues**
   - Check that cookies are being properly set and sent
   - Verify that your backend is configured for secure cookies

3. **WebSocket Connection Failures**
   - Check that your WebSocket URL is correct
   - Verify that your Nginx configuration allows WebSocket upgrades

4. **API Endpoint 404 Errors**
   - Verify that your API paths match the backend routes
   - Check that your Nginx configuration is correctly routing requests

### Debugging Tips:

1. Use browser developer tools to inspect network requests
2. Check browser console for errors
3. Add logging to your API client for debugging
4. Test API endpoints directly using tools like Postman

## 🔄 Deployment Workflow

After making changes to your frontend configuration:

1. Commit your changes to your repository
2. Lovable will automatically deploy the updated frontend
3. Test the integration with your backend services
4. Monitor for any errors or issues

## 📝 Notes

- Keep your API keys and sensitive information in environment variables
- Use HTTPS for all API communications
- Implement proper error handling for API requests
- Consider implementing a fallback mechanism if backend services are unavailable
