
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Video, 
  Shield, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Users, 
  Camera,
  Settings,
  Wifi,
  Network
} from 'lucide-react';
import { CameraFeed } from '@/components/siteguard/CameraFeed';
import { useSiteGuardData } from '@/hooks/useSiteGuardData';
import { format } from 'date-fns';

const SiteGuard = () => {
  const { 
    cameras, 
    routers, 
    alerts, 
    personnel, 
    loading, 
    error, 
    updateCameraRecording, 
    resolveAlert 
  } = useSiteGuardData();
  
  const [selectedCamera, setSelectedCamera] = useState<string>('');

  // Auto-select first camera when data loads
  React.useEffect(() => {
    if (cameras.length > 0 && !selectedCamera) {
      setSelectedCamera(cameras[0].id);
    }
  }, [cameras, selectedCamera]);

  const handleToggleRecording = async (cameraId: string) => {
    const camera = cameras.find(c => c.id === cameraId);
    if (!camera) return;

    try {
      await updateCameraRecording(cameraId, !camera.is_recording);
    } catch (err) {
      console.error('Failed to toggle recording:', err);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await resolveAlert(alertId);
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading SiteGuard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  const onlineCameras = cameras.filter(c => c.status === 'online').length;
  const connectedRouters = routers.filter(r => r.vpn_status === 'connected').length;
  const activePersonnelCount = personnel.filter(p => p.status === 'active').length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SiteGuard</h1>
          <p className="text-muted-foreground">
            Construction site monitoring and security system
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={alerts.length > 0 ? "destructive" : "secondary"}>
            {alerts.length} Active Alerts
          </Badge>
          <Button>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
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

      <Tabs defaultValue="live-feed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="live-feed">Live Feed</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="personnel">Personnel</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="live-feed" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cameras.map((camera) => (
              <CameraFeed
                key={camera.id}
                camera={camera}
                isSelected={selectedCamera === camera.id}
                onSelect={() => setSelectedCamera(camera.id)}
                onToggleRecording={() => handleToggleRecording(camera.id)}
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
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>
                Security and safety alerts from the construction site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">No active alerts</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(alert.created_at), 'MMM d, HH:mm')}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {alert.alert_type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Personnel</CardTitle>
              <CardDescription>
                Currently checked-in workers and their locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {personnel.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No personnel currently on-site</p>
                  </div>
                ) : (
                  personnel.map((person) => (
                    <div key={person.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{person.name}</p>
                          <p className="text-sm text-muted-foreground">{person.role}</p>
                          <p className="text-xs text-muted-foreground">#{person.badge_number}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {person.location && (
                          <div className="flex items-center space-x-2 mb-1">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{person.location}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {person.check_in_time 
                              ? format(new Date(person.check_in_time), 'HH:mm')
                              : 'Not checked in'
                            }
                          </span>
                          <Badge variant={person.status === 'active' ? 'default' : 'secondary'}>
                            {person.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Security Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Daily Check-ins</span>
                    <span className="font-medium">24</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Security Incidents</span>
                    <span className="font-medium">2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Camera Uptime</span>
                    <span className="font-medium">98.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Response Time (Avg)</span>
                    <span className="font-medium">3.2 min</span>
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
                    <span className="font-medium">1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PPE Compliance</span>
                    <span className="font-medium">96%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zone Restrictions</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Equipment Alerts</span>
                    <span className="font-medium">3</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SiteGuard;
