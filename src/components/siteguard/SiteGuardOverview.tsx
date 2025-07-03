import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Users, Network, AlertTriangle } from 'lucide-react';
import { Camera, VpnRouter, SecurityAlert, SitePersonnel } from '@/hooks/useSiteGuardData';

interface SiteGuardOverviewProps {
  cameras: Camera[];
  routers: VpnRouter[];
  alerts: SecurityAlert[];
  personnel: SitePersonnel[];
}

export const SiteGuardOverview: React.FC<SiteGuardOverviewProps> = ({
  cameras,
  routers,
  alerts,
  personnel
}) => {
  const onlineCameras = cameras.filter(c => c.status === 'online').length;
  const connectedRouters = routers.filter(r => r.vpn_status === 'connected').length;
  const activePersonnelCount = personnel.filter(p => p.status === 'active').length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Cameras</CardTitle>
          <Video className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{onlineCameras}/{cameras.length}</div>
          <p className="text-xs text-muted-foreground">
            {cameras.length - onlineCameras} camera{cameras.length - onlineCameras !== 1 ? 's' : ''} offline
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Personnel On-Site</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activePersonnelCount}</div>
          <p className="text-xs text-muted-foreground">
            {personnel.length} total on-site
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">VPN Status</CardTitle>
          <Network className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{connectedRouters}/{routers.length}</div>
          <p className="text-xs text-muted-foreground">
            Routers connected
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alerts Today</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{alerts.length}</div>
          <p className="text-xs text-muted-foreground">
            {alerts.filter(a => !a.resolved).length} pending review
          </p>
        </CardContent>
      </Card>
    </div>
  );
};