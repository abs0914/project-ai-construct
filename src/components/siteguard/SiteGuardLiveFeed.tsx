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
  onRefreshCamera?: (cameraId: string) => void;
}

export const SiteGuardLiveFeed: React.FC<SiteGuardLiveFeedProps> = ({
  cameras,
  routers,
  selectedCamera,
  onSelectCamera,
  onToggleRecording,
  onRefreshCamera
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
            onRefresh={() => onRefreshCamera?.(camera.id)}
            onSettings={() => {
              // Navigate to camera settings - you can implement this later
              window.location.href = `/siteguard/settings?camera=${camera.id}`;
            }}
          />
        ))}
      </div>
      
      {/* Router Status */}
      <Card>
        <CardHeader>
          <CardTitle>Router Network Status</CardTitle>
          <CardDescription>GL.iNET GL-MT300N Routers with ZeroTier VPN</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {routers.filter(router => 
              router.location === 'Auto-discovered' || 
              router.location?.includes('Auto-discovered') ||
              router.vpn_status === 'connected' && router.zerotier_status === 'connected'
            ).map((router) => (
              <div key={router.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Wifi className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{router.name}</p>
                    <p className="text-sm text-muted-foreground">{router.location}</p>
                    <p className="text-xs text-muted-foreground">{router.ip_address}</p>
                    {router.zerotier_enabled && router.zerotier_ip_address && (
                      <p className="text-xs text-blue-600">ZT: {router.zerotier_ip_address}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex flex-col gap-1">
                    <Badge variant={router.vpn_status === 'connected' ? 'default' : 'destructive'}>
                      VPN: {router.vpn_status}
                    </Badge>
                    {router.zerotier_enabled && (
                      <Badge variant={router.zerotier_status === 'connected' ? 'default' : 'secondary'}>
                        ZT: {router.zerotier_status}
                      </Badge>
                    )}
                  </div>
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