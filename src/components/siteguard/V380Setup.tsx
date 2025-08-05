import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera, 
  Play, 
  Square, 
  Settings, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Monitor,
  Wifi,
  Activity
} from 'lucide-react';
import { v380Service, V380Camera, V380CaptureStatus, V380RelayStatus } from '@/lib/services/v380-service';

interface V380SetupProps {
  onStreamStarted?: (cameraId: string, streamUrls: any) => void;
  onStreamStopped?: (cameraId: string) => void;
  onComplete?: () => void;
}

export const V380Setup: React.FC<V380SetupProps> = ({
  onStreamStarted,
  onStreamStopped,
  onComplete
}) => {
  const [camera, setCamera] = useState<Partial<V380Camera>>({
    name: 'V380 Camera',
    ip: '192.168.1.100',
    port: 554,
    model: 'V380 Pro',
    credentials: {
      username: 'admin',
      password: 'password'
    },
    streamSettings: {
      rtspPath: '/stream1',
      quality: 'high',
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
    }
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [captureStatus, setCaptureStatus] = useState<V380CaptureStatus | null>(null);
  const [relayStatus, setRelayStatus] = useState<V380RelayStatus | null>(null);
  const [currentRelayId, setCurrentRelayId] = useState<string | null>(null);
  const [streamUrls, setStreamUrls] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<'hls' | 'rtsp' | 'webrtc'>('hls');

  // Load V380 capabilities and recommended settings
  useEffect(() => {
    const recommended = v380Service.getRecommendedSettings();
    setCamera(prev => ({
      ...prev,
      ...recommended
    }));
  }, []);

  // Poll status when streaming
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isStreaming) {
      interval = setInterval(async () => {
        try {
          const [capture, relay] = await Promise.all([
            v380Service.getCaptureStatus(camera.id),
            v380Service.getRelayStatus()
          ]);
          
          setCaptureStatus(capture as V380CaptureStatus);
          setRelayStatus(relay);
        } catch (error) {
          console.error('Error polling V380 status:', error);
        }
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming, camera.id]);

  const handleInputChange = (field: string, value: any) => {
    setCamera(prev => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      } else if (keys.length === 2) {
        return {
          ...prev,
          [keys[0]]: {
            ...(prev[keys[0] as keyof V380Camera] as object),
            [keys[1]]: value
          }
        };
      }
      return prev;
    });
  };

  const testConnection = async () => {
    if (!camera.ip || !camera.credentials?.username || !camera.credentials?.password) {
      setError('Please fill in all required fields');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const result = await v380Service.testConnection(camera as V380Camera);
      
      if (result.success) {
        setConnectionStatus('connected');
        setError(null);
      } else {
        setConnectionStatus('error');
        setError(result.message);
      }
    } catch (error) {
      setConnectionStatus('error');
      setError(`Connection test failed: ${error}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const startV380Stream = async () => {
    if (!camera.id) {
      setError('Please provide a camera ID');
      return;
    }

    setIsStreaming(true);
    setError(null);

    try {
      const result = await v380Service.startV380Stream(
        camera.id,
        camera as V380Camera,
        outputFormat
      );

      setCaptureStatus(result.captureStatus);
      setCurrentRelayId(result.relayId);
      setStreamUrls(result.streamUrls);
      
      if (onStreamStarted) {
        onStreamStarted(camera.id, result.streamUrls);
      }

      console.log('✅ V380 stream started successfully:', result);
      
    } catch (error) {
      setError(`Failed to start V380 stream: ${error}`);
      setIsStreaming(false);
    }
  };

  const stopV380Stream = async () => {
    if (!camera.id) return;

    try {
      await v380Service.stopV380Stream(camera.id, currentRelayId || undefined);
      
      setIsStreaming(false);
      setCaptureStatus(null);
      setCurrentRelayId(null);
      setStreamUrls(null);
      
      if (onStreamStopped) {
        onStreamStopped(camera.id);
      }

      console.log('✅ V380 stream stopped successfully');
      
    } catch (error) {
      setError(`Failed to stop V380 stream: ${error}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'disconnected':
      case 'inactive':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Disconnected</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            V380 PC Software Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span className="text-sm font-medium">Connection:</span>
              {getStatusBadge(connectionStatus)}
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">Capture:</span>
              {getStatusBadge(captureStatus?.status || 'inactive')}
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              <span className="text-sm font-medium">Streaming:</span>
              {getStatusBadge(isStreaming ? 'active' : 'inactive')}
            </div>
          </div>

          {error && (
            <Alert className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Settings</TabsTrigger>
              <TabsTrigger value="stream">Stream Settings</TabsTrigger>
              <TabsTrigger value="protocol">Protocol Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cameraId">Camera ID</Label>
                  <Input
                    id="cameraId"
                    value={camera.id || ''}
                    onChange={(e) => handleInputChange('id', e.target.value)}
                    placeholder="v380-cam-001"
                  />
                </div>
                <div>
                  <Label htmlFor="cameraName">Camera Name</Label>
                  <Input
                    id="cameraName"
                    value={camera.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="V380 Camera"
                  />
                </div>
                <div>
                  <Label htmlFor="cameraIp">IP Address</Label>
                  <Input
                    id="cameraIp"
                    value={camera.ip || ''}
                    onChange={(e) => handleInputChange('ip', e.target.value)}
                    placeholder="192.168.1.100"
                  />
                </div>
                <div>
                  <Label htmlFor="cameraPort">Port</Label>
                  <Input
                    id="cameraPort"
                    type="number"
                    value={camera.port || 554}
                    onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={camera.credentials?.username || ''}
                    onChange={(e) => handleInputChange('credentials.username', e.target.value)}
                    placeholder="admin"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={camera.credentials?.password || ''}
                    onChange={(e) => handleInputChange('credentials.password', e.target.value)}
                    placeholder="password"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stream" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rtspPath">RTSP Path</Label>
                  <Input
                    id="rtspPath"
                    value={camera.streamSettings?.rtspPath || ''}
                    onChange={(e) => handleInputChange('streamSettings.rtspPath', e.target.value)}
                    placeholder="/stream1"
                  />
                </div>
                <div>
                  <Label htmlFor="quality">Quality</Label>
                  <Select
                    value={camera.streamSettings?.quality || 'high'}
                    onValueChange={(value) => handleInputChange('streamSettings.quality', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="resolution">Resolution</Label>
                  <Select
                    value={camera.streamSettings?.resolution || '1920x1080'}
                    onValueChange={(value) => handleInputChange('streamSettings.resolution', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="640x480">640x480</SelectItem>
                      <SelectItem value="1280x720">1280x720</SelectItem>
                      <SelectItem value="1920x1080">1920x1080</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="frameRate">Frame Rate</Label>
                  <Input
                    id="frameRate"
                    type="number"
                    value={camera.streamSettings?.frameRate || 25}
                    onChange={(e) => handleInputChange('streamSettings.frameRate', parseInt(e.target.value))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="audioEnabled"
                    checked={camera.streamSettings?.audioEnabled || false}
                    onCheckedChange={(checked) => handleInputChange('streamSettings.audioEnabled', checked)}
                  />
                  <Label htmlFor="audioEnabled">Enable Audio</Label>
                </div>
                <div>
                  <Label htmlFor="outputFormat">Output Format</Label>
                  <Select value={outputFormat} onValueChange={(value: 'hls' | 'rtsp' | 'webrtc') => setOutputFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hls">HLS</SelectItem>
                      <SelectItem value="rtsp">RTSP</SelectItem>
                      <SelectItem value="webrtc">WebRTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="protocol" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="protocolVersion">Protocol Version</Label>
                  <Input
                    id="protocolVersion"
                    value={camera.protocolSettings?.version || '1.0'}
                    onChange={(e) => handleInputChange('protocolSettings.version', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="heartbeatInterval">Heartbeat Interval (ms)</Label>
                  <Input
                    id="heartbeatInterval"
                    type="number"
                    value={camera.protocolSettings?.heartbeatInterval || 30000}
                    onChange={(e) => handleInputChange('protocolSettings.heartbeatInterval', parseInt(e.target.value))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="encryption"
                    checked={camera.protocolSettings?.encryption || false}
                    onCheckedChange={(checked) => handleInputChange('protocolSettings.encryption', checked)}
                  />
                  <Label htmlFor="encryption">Enable Encryption</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="compression"
                    checked={camera.protocolSettings?.compression || true}
                    onCheckedChange={(checked) => handleInputChange('protocolSettings.compression', checked)}
                  />
                  <Label htmlFor="compression">Enable Compression</Label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 mt-6">
            <Button
              onClick={testConnection}
              disabled={isConnecting}
              variant="outline"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>

            {!isStreaming ? (
              <Button
                onClick={startV380Stream}
                disabled={connectionStatus !== 'connected'}
              >
                <Play className="w-4 h-4 mr-2" />
                Start V380 Stream
              </Button>
            ) : (
              <Button
                onClick={stopV380Stream}
                variant="destructive"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop V380 Stream
              </Button>
            )}
          </div>

          {streamUrls && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Stream URLs:</h4>
              <div className="space-y-1 text-sm">
                <div><strong>HLS:</strong> {streamUrls.hls}</div>
                <div><strong>RTSP:</strong> {streamUrls.rtsp}</div>
                <div><strong>WebRTC:</strong> {streamUrls.webrtc}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
