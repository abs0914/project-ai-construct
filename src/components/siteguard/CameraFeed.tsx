import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Play, Pause, RotateCcw, Maximize2, Settings, Wifi, WifiOff, Activity, Signal } from 'lucide-react';
import { VideoStreamingService, UnifiedStreamStats, StreamingProtocol } from '@/lib/video-streaming-service';

interface Camera {
  id: string;
  name: string;
  location: string;
  ip_address: string;
  status: 'online' | 'offline' | 'error';
  is_recording: boolean;
  rtsp_url?: string;
  username?: string;
}

interface CameraFeedProps {
  camera: Camera;
  isSelected: boolean;
  onSelect: () => void;
  onToggleRecording: () => void;
  onRefresh?: () => void;
  onSettings?: () => void;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  camera,
  isSelected,
  onSelect,
  onToggleRecording,
  onRefresh,
  onSettings
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamingServiceRef = useRef<VideoStreamingService | null>(null);

  // State management
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentProtocol, setCurrentProtocol] = useState<StreamingProtocol | null>(null);
  const [streamStats, setStreamStats] = useState<UnifiedStreamStats | null>(null);
  const [connectionState, setConnectionState] = useState<string>('disconnected');

  // Initialize streaming service
  const initializeStream = useCallback(async () => {
    if (!videoRef.current || camera.status !== 'online') {
      setError(camera.status === 'offline' ? 'Camera is offline' : 'Camera error');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Create RTSP URL with authentication if available
      const rtspUrl = camera.rtsp_url || `rtsp://${camera.ip_address}:554/stream1`;

      const streamingService = new VideoStreamingService({
        cameraId: camera.id,
        rtspUrl,
        username: camera.username || 'admin',
        password: 'password', // In real implementation, this would be securely stored
        preferredProtocol: 'auto',
        autoplay: true,
        muted: true
      });

      // Set up event handlers
      streamingService.onStats((stats) => {
        setStreamStats(stats);
      });

      streamingService.onError((err) => {
        console.error('Streaming error:', err);
        setError(err.message);
        setIsConnecting(false);
      });

      streamingService.onStateChange((state) => {
        setConnectionState(state);
        setIsPlaying(state.includes('playing') || state.includes('connected'));
      });

      streamingService.onProtocolSwitch((protocol) => {
        setCurrentProtocol(protocol);
        console.log(`Switched to ${protocol} protocol for camera ${camera.name}`);
      });

      streamingServiceRef.current = streamingService;

      // Start the stream
      await streamingService.startStream(videoRef.current);
      setIsConnecting(false);

    } catch (err) {
      console.error('Failed to initialize stream:', err);
      setError(`Failed to connect: ${err.message}`);
      setIsConnecting(false);
    }
  }, [camera]);

  // Cleanup streaming service
  const cleanupStream = useCallback(async () => {
    if (streamingServiceRef.current) {
      try {
        await streamingServiceRef.current.stopStream();
      } catch (err) {
        console.error('Error stopping stream:', err);
      }
      streamingServiceRef.current = null;
    }
    setIsPlaying(false);
    setCurrentProtocol(null);
    setStreamStats(null);
    setConnectionState('disconnected');
  }, []);

  // Effect to handle stream initialization/cleanup
  useEffect(() => {
    if (isSelected && camera.status === 'online') {
      initializeStream();
    } else {
      cleanupStream();
    }

    return () => {
      cleanupStream();
    };
  }, [isSelected, camera.status, initializeStream, cleanupStream]);

  // Control functions
  const handlePlayPause = async () => {
    if (!streamingServiceRef.current) return;

    try {
      if (isPlaying) {
        streamingServiceRef.current.pause();
      } else {
        await streamingServiceRef.current.play();
      }
    } catch (err) {
      console.error('Error controlling playback:', err);
      setError(`Playback error: ${err.message}`);
    }
  };

  const handleRefresh = async () => {
    await cleanupStream();
    if (isSelected && camera.status === 'online') {
      await initializeStream();
    }
    onRefresh?.();
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'error': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getConnectionIcon = () => {
    if (isConnecting) return <Activity className="h-4 w-4 animate-spin" />;
    if (connectionState.includes('connected') || connectionState.includes('playing')) {
      return <Wifi className="h-4 w-4 text-green-500" />;
    }
    return <WifiOff className="h-4 w-4 text-red-500" />;
  };

  const formatBitrate = (bitrate: number) => {
    if (bitrate > 1000) {
      return `${(bitrate / 1000).toFixed(1)} Mbps`;
    }
    return `${bitrate.toFixed(0)} kbps`;
  };

  return (
    <Card className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">{camera.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{camera.location}</p>
            {currentProtocol && (
              <p className="text-xs text-blue-600 font-medium uppercase">{currentProtocol}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {getConnectionIcon()}
            <div className={`w-2 h-2 rounded-full ${getStatusColor(camera.status)}`} />
            <Badge variant={camera.is_recording ? "default" : "secondary"} className="text-xs">
              {camera.is_recording ? 'REC' : 'IDLE'}
            </Badge>
          </div>
        </div>
        {streamStats && (
          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
            <div className="flex items-center space-x-1">
              <Signal className="h-3 w-3" />
              <span>{formatBitrate(streamStats.bitrate)}</span>
            </div>
            <div>{streamStats.fps} FPS</div>
            <div>{streamStats.resolution.width}x{streamStats.resolution.height}</div>
            {streamStats.latency && <div>{streamStats.latency.toFixed(0)}ms</div>}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-slate-100 rounded-lg mb-3 relative overflow-hidden">
          {isSelected && camera.status === 'online' ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
                onError={() => setError('Stream error')}
                onClick={onSelect}
              />

              {/* Loading overlay */}
              {isConnecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-white text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 animate-spin" />
                    <p className="text-sm">Connecting to {currentProtocol || 'stream'}...</p>
                  </div>
                </div>
              )}

              {/* Error overlay */}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-white text-center">
                    <Camera className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">{error}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 text-white border-white hover:bg-white hover:text-black"
                      onClick={handleRefresh}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              {/* Video controls overlay */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity">
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-black/50 border-white/50 text-white hover:bg-white hover:text-black"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  {streamStats && (
                    <div className="bg-black/50 px-2 py-1 rounded text-white text-xs">
                      {formatBitrate(streamStats.bitrate)} • {streamStats.fps}fps
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full" onClick={onSelect}>
              <div className="text-center">
                <Camera className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  {camera.status === 'offline' ? 'Camera Offline' : 'Click to view'}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              title="Refresh camera connection"
              disabled={isConnecting}
            >
              <RotateCcw className={`h-3 w-3 ${isConnecting ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              size="sm" 
              variant={camera.is_recording ? "destructive" : "default"}
              onClick={onToggleRecording}
              disabled={camera.status !== 'online'}
              title={camera.is_recording ? "Stop recording" : "Start recording"}
            >
              {camera.is_recording ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
          </div>
          <div className="flex items-center space-x-1">
            <Button 
              size="sm" 
              variant="outline" 
              disabled={camera.status !== 'online'}
              onClick={onSelect}
              title="Maximize view"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={onSettings}
              title="Camera settings"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};