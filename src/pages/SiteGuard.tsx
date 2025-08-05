import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, AlertTriangle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSiteGuardData } from '@/hooks/useSiteGuardData';
import { ErrorBoundary, SiteGuardErrorFallback } from '@/components/ui/error-boundary';
import { SiteGuardOverview } from '@/components/siteguard/SiteGuardOverview';
import { SiteGuardLiveFeed } from '@/components/siteguard/SiteGuardLiveFeed';
import { SetupWizard } from '@/components/siteguard/SetupWizard';
import { NetworkAndAlerts } from '@/components/siteguard/NetworkAndAlerts';
import { PersonnelAndAnalytics } from '@/components/siteguard/PersonnelAndAnalytics';

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
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  // Show setup wizard if no cameras are configured
  const shouldShowSetupWizard = cameras.length === 0 && !loading && !error;

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

  const handleRefreshCamera = async (cameraId: string) => {
    try {
      // Refresh camera data
      refetch.cameras();
    } catch (err) {
      console.error('Failed to refresh camera:', err);
    }
  };

  const handleRefreshAll = () => {
    refetch.cameras();
    refetch.routers();
    refetch.alerts();
    refetch.personnel();
  };

  const handleSetupComplete = () => {
    setShowSetupWizard(false);
    handleRefreshAll();
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

  // Show Setup Wizard if requested or no cameras exist
  if (showSetupWizard || shouldShowSetupWizard) {
    return (
      <ErrorBoundary fallback={SiteGuardErrorFallback}>
        <SetupWizard onComplete={handleSetupComplete} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallback={SiteGuardErrorFallback}>
      <div className="space-y-6 animate-fade-in">
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
            <Button 
              variant="outline" 
              onClick={() => setShowSetupWizard(true)}
              className="flex items-center space-x-2"
            >
              <Zap className="h-4 w-4" />
              <span>Quick Setup</span>
            </Button>
            <Button onClick={() => navigate('/siteguard/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <ErrorBoundary>
          <SiteGuardOverview 
            cameras={cameras}
            routers={routers}
            alerts={alerts}
            personnel={personnel}
          />
        </ErrorBoundary>

        <Tabs defaultValue="live-feed" className="space-y-4">
          <TabsList>
            <TabsTrigger value="live-feed">Live Feed</TabsTrigger>
            <TabsTrigger value="network-alerts">Network & Alerts</TabsTrigger>
            <TabsTrigger value="personnel-analytics">Personnel & Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="live-feed" className="space-y-4">
            <ErrorBoundary>
              <SiteGuardLiveFeed
                cameras={cameras}
                routers={routers}
                selectedCamera={selectedCamera}
                onSelectCamera={setSelectedCamera}
                onToggleRecording={handleToggleRecording}
                onRefreshCamera={handleRefreshCamera}
              />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="network-alerts" className="space-y-4">
            <ErrorBoundary>
              <NetworkAndAlerts
                cameras={cameras}
                routers={routers}
                alerts={alerts}
                onResolveAlert={handleResolveAlert}
                onRefresh={handleRefreshAll}
              />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="personnel-analytics" className="space-y-4">
            <ErrorBoundary>
              <PersonnelAndAnalytics
                cameras={cameras}
                routers={routers}
                alerts={alerts}
                personnel={personnel}
              />
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
};

export default SiteGuard;