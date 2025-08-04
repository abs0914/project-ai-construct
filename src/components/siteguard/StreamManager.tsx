/**
 * Stream Manager Component
 * Displays and manages active streams from the media server
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Play, Square, Activity, Clock, Wifi } from 'lucide-react';
import { mediaStreamService, type MediaStream, type StreamHealth } from '@/lib/services/media-stream-service';
import { useToast } from '@/components/ui/use-toast';

export const StreamManager: React.FC = () => {
  const [streams, setStreams] = useState<MediaStream[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamHealth, setStreamHealth] = useState<Map<string, StreamHealth>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    loadStreams();
    startHealthMonitoring();
    
    return () => {
      mediaStreamService.stopHealthMonitoring();
    };
  }, []);

  const loadStreams = async () => {
    setLoading(true);
    try {
      const activeStreams = await mediaStreamService.getStreams();
      setStreams(activeStreams);
      
      // Load health data for each stream
      const healthPromises = activeStreams.map(async (stream) => {
        try {
          const health = await mediaStreamService.getStreamHealth(stream.streamKey);
          return [stream.streamKey, health] as const;
        } catch (error) {
          console.warn(`Failed to get health for stream ${stream.streamKey}:`, error);
          return null;
        }
      });
      
      const healthResults = await Promise.allSettled(healthPromises);
      const healthMap = new Map<string, StreamHealth>();
      
      healthResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const [streamKey, health] = result.value;
          healthMap.set(streamKey, health);
        }
      });
      
      setStreamHealth(healthMap);
    } catch (error) {
      console.error('Failed to load streams:', error);
      toast({
        title: "Error",
        description: "Failed to load active streams. Media server may be unavailable.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startHealthMonitoring = () => {
    mediaStreamService.startHealthMonitoring(15000); // Check every 15 seconds
  };

  const handleStopStream = async (streamKey: string) => {
    try {
      await mediaStreamService.stopStream(streamKey);
      toast({
        title: "Stream Stopped",
        description: `Stream ${streamKey} has been stopped successfully.`,
      });
      await loadStreams(); // Refresh the list
    } catch (error) {
      console.error('Failed to stop stream:', error);
      toast({
        title: "Error",
        description: `Failed to stop stream ${streamKey}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'starting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'stopped':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getHealthColor = (health?: StreamHealth) => {
    if (!health) return 'bg-gray-400';
    switch (health.status) {
      case 'healthy':
        return 'bg-green-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const formatUptime = (uptime?: number) => {
    if (!uptime) return 'N/A';
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBitrate = (bitrate?: number) => {
    if (!bitrate) return 'N/A';
    if (bitrate > 1000000) {
      return `${(bitrate / 1000000).toFixed(1)} Mbps`;
    }
    return `${(bitrate / 1000).toFixed(0)} Kbps`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Streams
            </CardTitle>
            <CardDescription>
              Monitor and manage active video streams from the media server
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadStreams}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading streams...
          </div>
        ) : streams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active streams found</p>
            <p className="text-sm mt-2">
              Start a camera feed to see streams appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {streams.map((stream) => {
              const health = streamHealth.get(stream.streamKey);
              return (
                <div key={stream.streamKey} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(stream.status)}`} />
                        <span className="font-medium">Camera {stream.cameraId}</span>
                      </div>
                      <Badge variant="outline">
                        {stream.streamKey}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Wifi className="h-3 w-3" />
                        <div className={`w-2 h-2 rounded-full ${getHealthColor(health)}`} />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStopStream(stream.streamKey)}
                      >
                        <Square className="h-3 w-3 mr-1" />
                        Stop
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium capitalize">{stream.status}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bitrate</p>
                      <p className="font-medium">
                        {formatBitrate(health?.stats?.bitrate || stream.stats?.bitrate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">FPS</p>
                      <p className="font-medium">
                        {health?.stats?.fps || stream.stats?.fps || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Uptime</p>
                      <p className="font-medium">
                        {formatUptime(health?.stats?.uptime || stream.stats?.uptime)}
                      </p>
                    </div>
                  </div>

                  {stream.stats?.resolution && (
                    <>
                      <Separator className="my-3" />
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Resolution: {stream.stats.resolution}</span>
                        {stream.startedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Started: {new Date(stream.startedAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {stream.hlsUrl && (
                    <div className="mt-3 p-2 bg-muted rounded text-xs">
                      <p className="font-medium mb-1">HLS URL:</p>
                      <code className="break-all">{stream.hlsUrl}</code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};