import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { HLSClient, HLSConfig } from '@/lib/hls-client';

interface HLSTestPlayerProps {
  streamUrl?: string;
  title?: string;
}

export const HLSTestPlayer: React.FC<HLSTestPlayerProps> = ({ 
  streamUrl = 'https://api.aiconstructpro.com/live/test_stream/index.m3u8',
  title = 'HLS Test Stream'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hlsClient, setHlsClient] = useState<HLSClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();

  const startTestStream = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First, start the test stream on the backend
      const response = await fetch('https://api.aiconstructpro.com/api/test/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to start test stream: ${response.status}`);
      }

      const data = await response.json();
      console.log('Test stream started:', data);

      // Wait for HLS segments to be generated
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Now connect to the HLS stream
      await connectToHLS(data.urls.hls);
      
      toast({
        title: "Test Stream Started",
        description: "Successfully started Big Buck Bunny test stream",
      });
    } catch (error) {
      console.error('Failed to start test stream:', error);
      setError(error instanceof Error ? error.message : 'Failed to start test stream');
      toast({
        title: "Stream Error",
        description: error instanceof Error ? error.message : 'Failed to start test stream',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectToHLS = async (url: string) => {
    if (!videoRef.current) {
      throw new Error('Video element not available');
    }

    const config: HLSConfig = {
      streamUrl: url,
      autoplay: true,
      muted: true,
    };

    const client = new HLSClient(config);
    
    client.onStats((streamStats) => {
      setStats(streamStats);
    });

    client.onError((error) => {
      console.error('HLS Error:', error);
      setError(error.message);
      setIsConnected(false);
    });

    client.onStateChange((state) => {
      console.log('HLS State:', state);
      if (state === 'playing') {
        setIsConnected(true);
        setError(null);
      }
    });

    await client.connect(videoRef.current);
    setHlsClient(client);
  };

  const disconnectStream = () => {
    if (hlsClient) {
      hlsClient.disconnect();
      setHlsClient(null);
    }
    setIsConnected(false);
    setStats(null);
    setError(null);
  };

  const verifyHLS = async () => {
    try {
      const response = await fetch('https://api.aiconstructpro.com/api/streams/test_stream/verify-hls');
      const data = await response.json();
      console.log('HLS Verification:', data);
      
      toast({
        title: "HLS Status",
        description: `Manifest: ${data.manifestExists ? 'Found' : 'Missing'}, Segments: ${data.segmentCount}`,
      });
    } catch (error) {
      console.error('HLS verification failed:', error);
    }
  };

  useEffect(() => {
    return () => {
      disconnectStream();
    };
  }, []);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          <div className="flex gap-2">
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            {error && <Badge variant="destructive">Error</Badge>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Player */}
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            controls
            muted
            autoPlay
            playsInline
          />
          {!isConnected && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <p>No stream connected</p>
            </div>
          )}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <p>Loading stream...</p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Resolution</p>
              <p className="font-mono">{stats.resolution.width}x{stats.resolution.height}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Bitrate</p>
              <p className="font-mono">{Math.round(stats.bitrate)} kbps</p>
            </div>
            <div>
              <p className="text-muted-foreground">Buffer</p>
              <p className="font-mono">{stats.bufferLength.toFixed(1)}s</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dropped</p>
              <p className="font-mono">{stats.droppedFrames}</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={startTestStream}
            disabled={isLoading}
            variant="default"
          >
            {isLoading ? 'Starting...' : 'Start Test Stream'}
          </Button>
          
          <Button 
            onClick={disconnectStream}
            disabled={!isConnected}
            variant="outline"
          >
            Stop Stream
          </Button>
          
          <Button 
            onClick={verifyHLS}
            variant="outline"
          >
            Verify HLS Files
          </Button>
        </div>

        {/* Stream URL */}
        <div className="text-xs text-muted-foreground">
          <p>Stream URL: {streamUrl}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HLSTestPlayer;