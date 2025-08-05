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
    id: 'v380-direct-stream',
    name: 'V380 Direct Camera',
    zerotierIp: '',
    localIp: '',
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

      console.log(`Testing connection to V380 camera at ${testIp}:${camera.port}`);
      
      // Create RTSP URL for testing
      const rtspUrl = `rtsp://${camera.username}:${camera.password}@${testIp}:${camera.port}${camera.rtspPath}`;
      
      // Test connection by trying to start a stream
      const testResult = await fetch(`https://api.aiconstructpro.com/api/media/streams/test-connection/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rtspUrl,
          username: camera.username,
          password: camera.password,
          timeout: 10000
        })
      });

      if (testResult.ok) {
        setConnectionTest({
          status: 'success',
          message: 'Camera connection successful',
          ip: testIp,
          rtspUrl
        });
      } else {
        throw new Error('Camera not reachable or authentication failed');
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

    try {
      // Use ZeroTier IP if available, otherwise local IP
      const targetIp = camera.zerotierIp || camera.localIp;
      if (!targetIp) {
        throw new Error('Please provide either ZeroTier IP or Local IP');
      }

      // Create RTSP URL
      const rtspUrl = `rtsp://${camera.username}:${camera.password}@${targetIp}:${camera.port}${camera.rtspPath}`;
      
      console.log(`Starting direct V380 stream from: ${rtspUrl}`);

      // Create V380 camera object
      const v380Camera = {
        id: camera.id,
        name: camera.name,
        ip: targetIp,
        port: camera.port,
        model: 'V380 Pro',
        firmware: '1.0.0',
        credentials: {
          username: camera.username,
          password: camera.password
        },
        streamSettings: {
          rtspPath: camera.rtspPath,
          quality: 'high' as const,
          resolution: '1920x1080',
          frameRate: 25,
          bitrate: 2000,
          audioEnabled: true
        },
        protocolSettings: {
          version: '1.0',
          encryption: false,
          compression: true,
          heartbeatInterval: 30000,
          reconnectInterval: 5000,
          maxRetries: 3
        },
        capabilities: {
          ptz: false,
          nightVision: true,
          motionDetection: true,
          audioSupport: true,
          recordingSupport: true
        },
        status: {
          enabled: true,
          lastSeen: null,
          connectionStatus: 'disconnected' as const
        }
      };

      // Start V380 streaming workflow
      const result = await v380Service.startV380Stream(
        camera.id,
        v380Camera,
        'hls'
      );

      setStreamUrls(result.streamUrls);
      
      if (onStreamStarted) {
        onStreamStarted(camera.id, result.streamUrls);
      }

      console.log('✅ Direct V380 stream started:', result);

    } catch (error) {
      setError(`Failed to start direct stream: ${error.message}`);
      setIsStreaming(false);
    }
  };

  const stopDirectStream = async () => {
    try {
      await v380Service.stopV380Stream(camera.id);
      
      setIsStreaming(false);
      setStreamUrls(null);
      
      if (onStreamStopped) {
        onStreamStopped(camera.id);
      }
      
    } catch (error) {
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
