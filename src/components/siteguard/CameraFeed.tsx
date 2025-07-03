import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Play, Pause, RotateCcw, Maximize2, Settings } from 'lucide-react';

interface Camera {
  id: string;
  name: string;
  location: string;
  ip_address: string;
  status: 'online' | 'offline' | 'error';
  is_recording: boolean;
  rtsp_url?: string;
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectToCamera = async () => {
    if (camera.status === 'offline') {
      setError('Camera is offline');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Simulate ONVIF connection (in real implementation, this would connect via WebRTC or HLS)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (videoRef.current) {
        // For demo purposes, we'll use a placeholder
        // In real implementation, this would be the RTSP stream converted to WebRTC/HLS
        videoRef.current.src = `http://${camera.ip_address}/stream`;
      }
    } catch (err) {
      setError('Failed to connect to camera');
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (isSelected && camera.status === 'online') {
      connectToCamera();
    }
  }, [isSelected, camera.status]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'error': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">{camera.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{camera.location}</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(camera.status)}`} />
            <Badge variant={camera.is_recording ? "default" : "secondary"} className="text-xs">
              {camera.is_recording ? 'REC' : 'IDLE'}
            </Badge>
          </div>
        </div>
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
                onError={() => setError('Stream error')}
              />
              {isConnecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-white">Connecting...</div>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-white text-center">
                    <Camera className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}
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
              onClick={() => {
                connectToCamera();
                onRefresh?.();
              }}
              title="Refresh camera connection"
            >
              <RotateCcw className="h-3 w-3" />
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