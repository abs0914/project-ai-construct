import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, VpnRouter, SecurityAlert, SitePersonnel } from '@/hooks/useSiteGuardData';

interface SiteGuardAnalyticsProps {
  cameras: Camera[];
  routers: VpnRouter[];
  alerts: SecurityAlert[];
  personnel: SitePersonnel[];
}

export const SiteGuardAnalytics: React.FC<SiteGuardAnalyticsProps> = ({
  cameras,
  routers,
  alerts,
  personnel
}) => {
  const onlineCameras = cameras.filter(c => c.status === 'online').length;
  const totalCameras = cameras.length;
  const cameraUptime = totalCameras > 0 ? ((onlineCameras / totalCameras) * 100).toFixed(1) : '0';
  
  const connectedRouters = routers.filter(r => r.vpn_status === 'connected').length;
  const securityIncidents = alerts.filter(a => a.alert_type === 'security').length;
  const safetyViolations = alerts.filter(a => a.alert_type === 'safety').length;
  const equipmentAlerts = alerts.filter(a => a.alert_type === 'equipment').length;
  
  const activePersonnel = personnel.filter(p => p.status === 'active').length;
  const checkedInToday = personnel.filter(p => p.check_in_time).length;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Security Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Daily Check-ins</span>
              <span className="font-medium">{checkedInToday}</span>
            </div>
            <div className="flex justify-between">
              <span>Security Incidents</span>
              <span className="font-medium">{securityIncidents}</span>
            </div>
            <div className="flex justify-between">
              <span>Camera Uptime</span>
              <span className="font-medium">{cameraUptime}%</span>
            </div>
            <div className="flex justify-between">
              <span>Connected Routers</span>
              <span className="font-medium">{connectedRouters}/{routers.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Safety Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Safety Violations</span>
              <span className="font-medium">{safetyViolations}</span>
            </div>
            <div className="flex justify-between">
              <span>Active Personnel</span>
              <span className="font-medium">{activePersonnel}</span>
            </div>
            <div className="flex justify-between">
              <span>Equipment Alerts</span>
              <span className="font-medium">{equipmentAlerts}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Cameras</span>
              <span className="font-medium">{totalCameras}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};