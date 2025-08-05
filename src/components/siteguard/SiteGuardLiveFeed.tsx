import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wifi, Camera as CameraIcon } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Camera Grid */}
      {cameras.length > 0 ? (
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
                window.location.href = `/siteguard/settings?camera=${camera.id}`;
              }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <CameraIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Cameras Configured</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first camera or running the setup wizard.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Network Status */}
      {routers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Network Status</CardTitle>
            <CardDescription>Connected routers and VPN status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {routers.filter(router => 
                router.vpn_status === 'connected' || router.zerotier_status === 'connected'
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
      )}
    </div>
  );
};