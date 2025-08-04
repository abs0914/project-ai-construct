import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Play, RefreshCw, TestTube, Activity, Signal, Wifi } from 'lucide-react';
import { toast } from 'sonner';

interface StreamDebugInfo {
  activeStreams: number;
  streamHealth: number;
  streamRetries: Record<string, number>;
  processDetails: Array<{
    streamKey: string;
    processAlive: boolean;
    startTime: string;
    rtspUrl: string;
    status: string;
  }>;
}

interface ServerHealth {
  status: string;
  timestamp: string;
  uptime: number;
  activeStreams: number;
  version: string;
}

export const StreamDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<StreamDebugInfo | null>(null);
  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [testRtspUrl, setTestRtspUrl] = useState('rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4');
  const [customCameraId, setCustomCameraId] = useState('debug-test');
  const [customRtspUrl, setCustomRtspUrl] = useState('');

  const loadDebugInfo = async () => {
    setLoading(true);
    try {
      // First try to load basic stream info
      const streamsResponse = await fetch('https://api.aiconstructpro.com/api/streams');
      if (streamsResponse.ok) {
        const streamsData = await streamsResponse.json();
        
        // Transform streams data to debug info format
        const transformedDebugInfo: StreamDebugInfo = {
          activeStreams: streamsData.streams?.length || 0,
          streamHealth: streamsData.streams?.length || 0,
          streamRetries: {},
          processDetails: streamsData.streams?.map((stream: any) => ({
            streamKey: stream.streamKey,
            processAlive: stream.health?.status !== 'error',
            startTime: stream.startTime || new Date().toISOString(),
            rtspUrl: '***hidden***',
            status: stream.health?.status || 'unknown'
          })) || []
        };
        setDebugInfo(transformedDebugInfo);
      }

      // Try to load server health (might not be available)
      try {
        const healthResponse = await fetch('https://api.aiconstructpro.com/api/health');
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          setServerHealth(healthData);
        }
      } catch (healthError) {
        console.warn('Health endpoint not available:', healthError);
        // Create mock health data
        setServerHealth({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: 0,
          activeStreams: 0,
          version: '1.0.0'
        });
      }

      toast.success('Debug information loaded');
    } catch (error) {
      console.error('Failed to load debug info:', error);
      toast.error('Failed to load debug information. Using basic stream info.');
      
      // Provide basic fallback data
      setDebugInfo({
        activeStreams: 0,
        streamHealth: 0,
        streamRetries: {},
        processDetails: []
      });
      setServerHealth({
        status: 'unknown',
        timestamp: new Date().toISOString(),
        uptime: 0,
        activeStreams: 0,
        version: '1.0.0'
      });
    } finally {
      setLoading(false);
    }
  };

  const startTestStream = async () => {
    setLoading(true);
    try {
      // Use the existing stream endpoint instead of a non-existent test endpoint
      const response = await fetch('https://api.aiconstructpro.com/api/streams/test-big-buck-bunny/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rtspUrl: testRtspUrl,
          username: '',
          password: ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Test stream started: ${data.streamKey}`);
        setTimeout(loadDebugInfo, 1000); // Refresh debug info
      } else {
        const errorData = await response.json();
        toast.error(`Failed to start test stream: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to start test stream:', error);
      toast.error('Failed to start test stream');
    } finally {
      setLoading(false);
    }
  };

  const startCustomStream = async () => {
    if (!customRtspUrl) {
      toast.error('Please enter an RTSP URL');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://api.aiconstructpro.com/api/streams/${customCameraId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rtspUrl: customRtspUrl,
          username: '',
          password: ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Custom stream started: ${data.streamKey}`);
        setTimeout(loadDebugInfo, 1000); // Refresh debug info
      } else {
        const errorData = await response.json();
        toast.error(`Failed to start custom stream: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to start custom stream:', error);
      toast.error('Failed to start custom stream');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebugInfo();
    const interval = setInterval(loadDebugInfo, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'streaming':
        return 'bg-green-500';
      case 'starting':
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Stream Debugger
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={loadDebugInfo}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Server Health */}
          {serverHealth && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Server Health
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-semibold text-green-600">{serverHealth.status}</div>
                  <div className="text-xs text-muted-foreground">Status</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-semibold">{formatUptime(serverHealth.uptime)}</div>
                  <div className="text-xs text-muted-foreground">Uptime</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-semibold">{serverHealth.activeStreams}</div>
                  <div className="text-xs text-muted-foreground">Active Streams</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-semibold">{serverHealth.version}</div>
                  <div className="text-xs text-muted-foreground">Version</div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Test Stream Controls */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Test Stream Controls
            </h3>
            <div className="space-y-4">
              <div>
                <Button
                  onClick={startTestStream}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Big Buck Bunny Test Stream
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Starts a test stream with a known good RTSP source
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-camera-id">Custom Camera ID</Label>
                <Input
                  id="custom-camera-id"
                  value={customCameraId}
                  onChange={(e) => setCustomCameraId(e.target.value)}
                  placeholder="Enter camera ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-rtsp-url">Custom RTSP URL</Label>
                <Input
                  id="custom-rtsp-url"
                  value={customRtspUrl}
                  onChange={(e) => setCustomRtspUrl(e.target.value)}
                  placeholder="rtsp://your-camera-ip:554/stream"
                />
              </div>

              <Button
                onClick={startCustomStream}
                disabled={loading || !customRtspUrl}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Custom Stream
              </Button>
            </div>
          </div>

          <Separator />

          {/* Debug Information */}
          {debugInfo && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Signal className="h-4 w-4" />
                Stream Debug Information
              </h3>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-semibold">{debugInfo.activeStreams}</div>
                  <div className="text-xs text-muted-foreground">Active Streams</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-semibold">{debugInfo.streamHealth}</div>
                  <div className="text-xs text-muted-foreground">Health Records</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-semibold">{Object.keys(debugInfo.streamRetries).length}</div>
                  <div className="text-xs text-muted-foreground">Retry Records</div>
                </div>
              </div>

              {/* Process Details */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Process Details</h4>
                {debugInfo.processDetails.length > 0 ? (
                  <div className="space-y-2">
                    {debugInfo.processDetails.map((process) => (
                      <div key={process.streamKey} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{process.streamKey}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={process.processAlive ? "default" : "destructive"}>
                              {process.processAlive ? 'Alive' : 'Dead'}
                            </Badge>
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(process.status)}`} />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Status: {process.status}</div>
                          <div>Started: {new Date(process.startTime).toLocaleString()}</div>
                          <div className="break-all">RTSP: {process.rtspUrl}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    No active streams
                  </div>
                )}
              </div>

              {/* Retry Information */}
              {Object.keys(debugInfo.streamRetries).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Retry Counts</h4>
                  <div className="space-y-1">
                    {Object.entries(debugInfo.streamRetries).map(([streamKey, retries]) => (
                      <div key={streamKey} className="flex justify-between text-sm">
                        <span>{streamKey}</span>
                        <Badge variant={retries > 2 ? "destructive" : "secondary"}>
                          {retries} retries
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};