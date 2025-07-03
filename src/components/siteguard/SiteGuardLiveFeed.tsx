import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wifi } from 'lucide-react';
import { CameraFeed } from './CameraFeed';
import { Camera, VpnRouter } from '@/hooks/useSiteGuardData';

interface SiteGuardLiveFeedProps {
  cameras: Camera[];
  routers: VpnRouter[];
  selectedCamera: string;
  onSelectCamera: (cameraId: string) => void;
  onToggleRecording: (cameraId: string) => void;
}

export const SiteGuardLiveFeed: React.FC<SiteGuardLiveFeedProps> = ({
  cameras,
  routers,
  selectedCamera,
  onSelectCamera,
  onToggleRecording
}) => {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cameras.map((camera) => (
          <CameraFeed
            key={camera.id}
            camera={camera}
            isSelected={selectedCamera === camera.id}
            onSelect={() => onSelectCamera(camera.id)}
            onToggleRecording={() => onToggleRecording(camera.id)}
          />
        ))}
      </div>
      
      {/* VPN Router Status */}
      <Card>
        <CardHeader>
          <CardTitle>VPN Router Status</CardTitle>
          <CardDescription>GL.iNET GL-MT300N Router Network</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {routers.map((router) => (
              <div key={router.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Wifi className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{router.name}</p>
                    <p className="text-sm text-muted-foreground">{router.location}</p>
                    <p className="text-xs text-muted-foreground">{router.ip_address}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={router.vpn_status === 'connected' ? 'default' : 'destructive'}>
                    {router.vpn_status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(router.bandwidth_usage / 1024 / 1024)} MB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};