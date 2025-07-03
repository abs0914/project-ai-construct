
import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSiteGuardData } from '@/hooks/useSiteGuardData';
import { SiteGuardOverview } from '@/components/siteguard/SiteGuardOverview';
import { SiteGuardLiveFeed } from '@/components/siteguard/SiteGuardLiveFeed';
import { SiteGuardAlerts } from '@/components/siteguard/SiteGuardAlerts';
import { SiteGuardPersonnel } from '@/components/siteguard/SiteGuardPersonnel';
import { SiteGuardAnalytics } from '@/components/siteguard/SiteGuardAnalytics';
import { ZeroTierManagement } from '@/components/siteguard/ZeroTierManagement';

const SiteGuard = () => {
  const navigate = useNavigate();
  const { 
    cameras, 
    routers, 
    alerts, 
    personnel, 
    loading, 
    error, 
    updateCameraRecording, 
    resolveAlert,
    refetch
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
          <Button onClick={() => navigate('/siteguard/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <SiteGuardOverview 
        cameras={cameras}
        routers={routers}
        alerts={alerts}
        personnel={personnel}
      />

      <Tabs defaultValue="live-feed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="live-feed">Live Feed</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="personnel">Personnel</TabsTrigger>
          <TabsTrigger value="zerotier">ZeroTier</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="live-feed" className="space-y-4">
          <SiteGuardLiveFeed
            cameras={cameras}
            routers={routers}
            selectedCamera={selectedCamera}
            onSelectCamera={setSelectedCamera}
            onToggleRecording={handleToggleRecording}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <SiteGuardAlerts
            alerts={alerts}
            onResolveAlert={handleResolveAlert}
          />
        </TabsContent>

        <TabsContent value="personnel" className="space-y-4">
          <SiteGuardPersonnel personnel={personnel} />
        </TabsContent>

        <TabsContent value="zerotier" className="space-y-4">
          <ZeroTierManagement 
            routers={routers} 
            onRefresh={() => {
              refetch.cameras();
              refetch.routers();
              refetch.alerts();
              refetch.personnel();
            }}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <SiteGuardAnalytics
            cameras={cameras}
            routers={routers}
            alerts={alerts}
            personnel={personnel}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SiteGuard;
