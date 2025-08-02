import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Wifi, 
  Router, 
  AlertTriangle, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Settings,
  Search,
  RefreshCw
} from 'lucide-react';
import { NetworkManagement } from './NetworkManagement';
import { ONVIFDiscovery } from './ONVIFDiscovery';
import { NetworkDiscovery } from './NetworkDiscovery';
import { Camera, VpnRouter, SecurityAlert } from '@/hooks/useSiteGuardData';

interface NetworkAndAlertsProps {
  cameras: Camera[];
  routers: VpnRouter[];
  alerts: SecurityAlert[];
  onResolveAlert: (alertId: string) => void;
  onRefresh: () => void;
}

export const NetworkAndAlerts: React.FC<NetworkAndAlertsProps> = ({
  cameras,
  routers,
  alerts,
  onResolveAlert,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': 
      case 'critical': 
        return 'destructive';
      case 'medium': 
        return 'default';
      case 'low': 
        return 'secondary';
      default: 
        return 'default';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const alertTime = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - alertTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const onlineCameras = cameras.filter(c => c.status === 'online').length;
  const connectedRouters = routers.filter(r => r.vpn_status === 'connected').length;
  const criticalAlerts = alerts.filter(a => !a.resolved && (a.severity === 'high' || a.severity === 'critical')).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Network & Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cameras Online</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineCameras}/{cameras.length}</div>
            <p className="text-xs text-muted-foreground">
              {cameras.length - onlineCameras > 0 && `${cameras.length - onlineCameras} offline`}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Routers Connected</CardTitle>
            <Router className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedRouters}/{routers.length}</div>
            <p className="text-xs text-muted-foreground">
              {routers.length - connectedRouters > 0 && `${routers.length - connectedRouters} disconnected`}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {criticalAlerts === 0 && onlineCameras === cameras.length ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-600">Secure</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-600">Attention</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="discovery">Device Discovery</TabsTrigger>
            <TabsTrigger value="network">Network Management</TabsTrigger>
            <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          </TabsList>
          <Button variant="outline" onClick={onRefresh} className="flex items-center space-x-2 hover-scale">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card className="animate-scale-in">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start hover-scale" 
                  variant="outline"
                  onClick={() => setActiveTab('discovery')}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Discover New Devices
                </Button>
                <Button 
                  className="w-full justify-start hover-scale" 
                  variant="outline"
                  onClick={() => setActiveTab('network')}
                >
                  <Router className="h-4 w-4 mr-2" />
                  Network Management
                </Button>
                <Button 
                  className="w-full justify-start hover-scale" 
                  variant="outline"
                  onClick={() => setActiveTab('alerts')}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  View All Alerts
                </Button>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card className="animate-scale-in">
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.slice(0, 5).length > 0 ? (
                  <div className="space-y-2">
                    {alerts.slice(0, 5).map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-2 border rounded hover-scale transition-all duration-200">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <div>
                            <p className="text-sm font-medium">{alert.message}</p>
                            <p className="text-xs text-muted-foreground">{formatTimeAgo(alert.created_at)}</p>
                          </div>
                        </div>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm text-muted-foreground">No recent alerts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="discovery" className="space-y-4">
          <Tabs defaultValue="unified" className="space-y-4">
            <TabsList>
              <TabsTrigger value="unified">Auto-Discovery</TabsTrigger>
              <TabsTrigger value="onvif">ONVIF Cameras</TabsTrigger>
              <TabsTrigger value="network">Network Scan</TabsTrigger>
            </TabsList>

            <TabsContent value="unified">
              <Card>
                <CardHeader>
                  <CardTitle>Unified Device Discovery</CardTitle>
                  <CardDescription>
                    Automatically discover cameras and network devices using multiple methods
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ONVIFDiscovery />
                    <div className="space-y-4">
                      <NetworkDiscovery routers={routers} onRefresh={onRefresh} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="onvif">
              <ONVIFDiscovery />
            </TabsContent>

            <TabsContent value="network">
              <NetworkDiscovery routers={routers} onRefresh={onRefresh} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <NetworkManagement />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>Monitor and resolve security incidents</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg hover-scale transition-all duration-200">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <div>
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-sm text-muted-foreground">
                            {alert.alert_type} • {formatTimeAgo(alert.created_at)}
                          </p>
                          {alert.camera_id && (
                            <p className="text-xs text-muted-foreground">
                              Camera: {cameras.find(c => c.id === alert.camera_id)?.name || 'Unknown'}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        {!alert.resolved && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onResolveAlert(alert.id)}
                            className="hover-scale"
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-medium mb-2">All Clear</h3>
                  <p className="text-muted-foreground">No security alerts at this time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};