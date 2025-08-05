import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera, 
  Play, 
  Square, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Network,
  Router,
  Globe
} from 'lucide-react';
import { v380Service } from '@/lib/services/v380-service';

interface V380DirectStreamProps {
  onStreamStarted?: (cameraId: string, streamUrls: any) => void;
  onStreamStopped?: (cameraId: string) => void;
}

export const V380DirectStream: React.FC<V380DirectStreamProps> = ({
  onStreamStarted,
  onStreamStopped
}) => {
  const [camera, setCamera] = useState({
    id: 'tacloban-motorpool-v380',
    name: 'Tacloban-Motorpool V380',
    zerotierIp: '172.30.195.39',
    localIp: '192.168.8.201',
    port: 554,
    username: 'admin',
    password: 'password',
    rtspPath: '/stream1'
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamUrls, setStreamUrls] = useState(null);
  const [error, setError] = useState(null);
  const [connectionTest, setConnectionTest] = useState(null);

  const handleInputChange = (field: string, value: string) => {
    setCamera(prev => ({ ...prev, [field]: value }));
  };

  const testConnection = async () => {
    setIsConnecting(true);
    setConnectionTest(null);
    setError(null);

    try {
      // Test ZeroTier IP first, then local IP
      const testIp = camera.zerotierIp || camera.localIp;
      if (!testIp) {
        throw new Error('Please provide either ZeroTier IP or Local IP');
      }

      console.log(`Testing connection to V380 camera at ${testIp}:${camera.port} via VPS`);

      // Create RTSP URL for testing
      const rtspUrl = `rtsp://${camera.username}:${camera.password}@${testIp}:${camera.port}${camera.rtspPath}`;

      // Test via VPS V380 services
      try {
        // Try to get V380 service status first
        const statusResult = await fetch(`https://api.aiconstructpro.com/api/v380/capture/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (statusResult.ok) {
          setConnectionTest({
            status: 'success',
            message: `VPS V380 services are running. Camera RTSP URL ready: ${rtspUrl}`,
            ip: testIp,
            rtspUrl
          });
        } else {
          throw new Error('V380 services not available');
        }

      } catch (networkError) {
        // V380 services test failed, but camera might still work
        setConnectionTest({
          status: 'warning',
          message: `V380 services test failed. RTSP URL: ${rtspUrl}. Try streaming anyway.`,
          ip: testIp,
          rtspUrl
        });
      }

    } catch (error) {
      setConnectionTest({
        status: 'error',
        message: error.message,
        ip: camera.zerotierIp || camera.localIp
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const startDirectStream = async () => {
    setIsStreaming(true);
    setError(null);

    // First, check if VPS is available
    console.log('Checking VPS media server availability...');
    let vpsAvailable = false;
    try {
      const healthCheck = await fetch('https://api.aiconstructpro.com/api/streams', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      vpsAvailable = healthCheck.ok;
      console.log('VPS media server status:', vpsAvailable ? 'Available' : 'Unavailable');
    } catch (error) {
      console.log('VPS media server unavailable:', error.message);
      vpsAvailable = false;
    }

    if (!vpsAvailable) {
      // VPS is down, provide direct RTSP URL immediately
      const directRtspUrl = `rtsp://${camera.username}:${camera.password}@${camera.zerotierIp || camera.localIp}:${camera.port}${camera.rtspPath}`;

      const directStreamUrls = {
        hls: null,
        rtsp: directRtspUrl,
        webrtc: null
      };

      setStreamUrls(directStreamUrls);
      setError(`VPS media server is currently unavailable. Use this direct RTSP URL in your media player: ${directRtspUrl.replace(/\/\/.*:.*@/, '//***:***@')}`);

      if (onStreamStarted) {
        onStreamStarted(camera.id, directStreamUrls);
      }

      console.log('✅ Direct RTSP URL provided due to VPS unavailability');
      return;
    }

    try {
      // For cameras behind GL.iNET router, we need to try multiple approaches
      let rtspUrl;
      let connectionMethod;

      if (camera.zerotierIp && camera.localIp) {
        // Camera is behind a ZeroTier-connected router
        // Try to access via the local IP through the ZeroTier network
        rtspUrl = `rtsp://${camera.username}:${camera.password}@${camera.localIp}:${camera.port}${camera.rtspPath}`;
        connectionMethod = 'router-local-ip';
        console.log(`Trying camera behind router: ${rtspUrl.replace(/\/\/.*:.*@/, '//***:***@')}`);
      } else if (camera.zerotierIp) {
        // Direct ZeroTier access
        rtspUrl = `rtsp://${camera.username}:${camera.password}@${camera.zerotierIp}:${camera.port}${camera.rtspPath}`;
        connectionMethod = 'direct-zerotier';
        console.log(`Trying direct ZeroTier: ${rtspUrl.replace(/\/\/.*:.*@/, '//***:***@')}`);
      } else if (camera.localIp) {
        // Local network access
        rtspUrl = `rtsp://${camera.username}:${camera.password}@${camera.localIp}:${camera.port}${camera.rtspPath}`;
        connectionMethod = 'local-network';
        console.log(`Trying local network: ${rtspUrl.replace(/\/\/.*:.*@/, '//***:***@')}`);
      } else {
        throw new Error('Please provide either ZeroTier IP or Local IP');
      }

      // Step 1: Start V380 capture
      console.log('Starting V380 capture...');
      const captureResponse = await fetch(`https://api.aiconstructpro.com/api/v380/capture/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cameraId: camera.id,
          inputSource: rtspUrl,
          options: {
            quality: 'high',
            resolution: '1920x1080',
            frameRate: 25,
            audioEnabled: true
          }
        })
      });

      if (!captureResponse.ok) {
        const errorData = await captureResponse.text();
        throw new Error(`V380 Capture Error: ${captureResponse.status} - ${errorData}`);
      }

      // Step 2: Start V380 relay
      console.log('Starting V380 relay...');
      const relayResponse = await fetch(`https://api.aiconstructpro.com/api/v380/relay/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cameraId: camera.id,
          inputSource: rtspUrl,
          outputFormat: 'hls'
        })
      });

      if (!relayResponse.ok) {
        const errorData = await relayResponse.text();
        throw new Error(`V380 Relay Error: ${relayResponse.status} - ${errorData}`);
      }

      const relayResult = await relayResponse.json();

      // Get the stream URLs from the V380 relay
      const streamUrls = relayResult.streamUrls || {
        hls: `https://api.aiconstructpro.com/live/v380_${camera.id}/index.m3u8`,
        rtsp: `rtsp://api.aiconstructpro.com:554/v380_${camera.id}`,
        webrtc: `wss://api.aiconstructpro.com/webrtc/v380_${camera.id}`
      };

      setStreamUrls(streamUrls);

      if (onStreamStarted) {
        onStreamStarted(camera.id, streamUrls);
      }

      console.log('✅ Direct V380 stream started via VPS:', streamUrls);

    } catch (error) {
      console.error('VPS streaming error:', error);

      // If VPS fails, try direct RTSP as fallback
      console.log('VPS failed, attempting direct RTSP fallback...');
      try {
        // Create direct RTSP URL for local testing
        const directRtspUrl = `rtsp://${camera.username}:${camera.password}@${camera.zerotierIp || camera.localIp}:${camera.port}${camera.rtspPath}`;

        // Set fallback stream URLs for direct RTSP access
        const fallbackStreamUrls = {
          hls: null, // Not available in direct mode
          rtsp: directRtspUrl,
          webrtc: null // Not available in direct mode
        };

        setStreamUrls(fallbackStreamUrls);
        setError(`VPS unavailable. Direct RTSP URL available: ${directRtspUrl.replace(/\/\/.*:.*@/, '//***:***@')}`);

        if (onStreamStarted) {
          onStreamStarted(camera.id, fallbackStreamUrls);
        }

        console.log('✅ Direct RTSP fallback ready:', directRtspUrl.replace(/\/\/.*:.*@/, '//***:***@'));

      } catch (fallbackError) {
        setError(`Failed to start VPS stream: ${error.message}. Fallback also failed: ${fallbackError.message}`);
        setIsStreaming(false);
      }
    }
  };

  const stopDirectStream = async () => {
    try {
      // Stop V380 capture
      await fetch(`https://api.aiconstructpro.com/api/v380/capture/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraId: camera.id })
      });

      // Stop V380 relay (if we have a relayId, we'd use it here)
      await fetch(`https://api.aiconstructpro.com/api/v380/relay/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relayId: `v380_relay_${camera.id}` })
      });

      setIsStreaming(false);
      setStreamUrls(null);

      if (onStreamStopped) {
        onStreamStopped(camera.id);
      }

      console.log('✅ V380 stream stopped');

    } catch (error) {
      console.error('Error stopping V380 stream:', error);
      setError(`Failed to stop stream: ${error.message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          V380 Direct Stream
          <Badge variant="outline">Live Camera Feed</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {connectionTest && (
          <Alert className={connectionTest.status === 'success' ? 'border-green-500' : 'border-red-500'}>
            {connectionTest.status === 'success' ? 
              <CheckCircle className="h-4 w-4 text-green-500" /> : 
              <XCircle className="h-4 w-4 text-red-500" />
            }
            <AlertDescription>
              <strong>{connectionTest.status === 'success' ? 'Connection Success' : 'Connection Failed'}</strong>
              <br />
              {connectionTest.message}
              <br />
              <small>IP: {connectionTest.ip}</small>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cameraName">Camera Name</Label>
            <Input
              id="cameraName"
              value={camera.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="V380 Direct Camera"
            />
          </div>
          <div>
            <Label htmlFor="zerotierIp">ZeroTier IP (Preferred)</Label>
            <Input
              id="zerotierIp"
              value={camera.zerotierIp}
              onChange={(e) => handleInputChange('zerotierIp', e.target.value)}
              placeholder="10.147.17.100"
            />
          </div>
          <div>
            <Label htmlFor="localIp">Local IP (Fallback)</Label>
            <Input
              id="localIp"
              value={camera.localIp}
              onChange={(e) => handleInputChange('localIp', e.target.value)}
              placeholder="192.168.8.100"
            />
          </div>
          <div>
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              value={camera.port}
              onChange={(e) => handleInputChange('port', e.target.value)}
              placeholder="554"
            />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={camera.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="admin"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={camera.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="password"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="rtspPath">RTSP Path</Label>
          <Input
            id="rtspPath"
            value={camera.rtspPath}
            onChange={(e) => handleInputChange('rtspPath', e.target.value)}
            placeholder="/stream1"
          />
        </div>

        {streamUrls && (
          <Card className="p-4 bg-green-50">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Live Stream URLs
            </h4>
            <div className="space-y-1 text-sm">
              <div><strong>HLS:</strong> {streamUrls.hls}</div>
              <div><strong>RTSP:</strong> {streamUrls.rtsp}</div>
              <div><strong>WebRTC:</strong> {streamUrls.webrtc}</div>
            </div>
          </Card>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={testConnection} 
            disabled={isConnecting}
            variant="outline"
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Network className="w-4 h-4 mr-2" />
            )}
            Test Connection
          </Button>

          {!isStreaming ? (
            <Button onClick={startDirectStream} disabled={isConnecting}>
              <Play className="w-4 h-4 mr-2" />
              Start Live Stream
            </Button>
          ) : (
            <Button onClick={stopDirectStream} variant="destructive">
              <Square className="w-4 h-4 mr-2" />
              Stop Stream
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
