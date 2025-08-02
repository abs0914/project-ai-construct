import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Router, 
  Wifi, 
  Shield, 
  Activity, 
  Settings, 
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Globe,
  Users
} from 'lucide-react';
import { RouterManagement } from './RouterManagement';
import { ZeroTierManagement } from './ZeroTierManagement';

interface NetworkStatus {
  routers: {
    total: number;
    connected: number;
    disconnected: number;
  };
  zerotier: {
    configured: boolean;
    available: boolean;
  };
  lastUpdate: string;
}

export const NetworkManagement: React.FC = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Load network status on component mount
  useEffect(() => {
    loadNetworkStatus();
    
    // Set up periodic refresh
    const interval = setInterval(loadNetworkStatus, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadNetworkStatus = async () => {
    try {
      setError(null);
      // Mock status based on backend configuration
      setNetworkStatus({
        routers: {
          total: 2,
          connected: 2,
          disconnected: 0
        },
        zerotier: {
          configured: true,
          available: true
        },
        lastUpdate: new Date().toISOString()
      });
    } catch (error) {
      setError('Failed to load network status');
      console.error('Failed to load network status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStatus = async () => {
    setIsLoading(true);
    await loadNetworkStatus();
  };

  const getStatusColor = (connected: number, total: number) => {
    if (total === 0) return 'bg-gray-500';
    if (connected === total) return 'bg-green-500';
    if (connected > 0) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = (connected: number, total: number) => {
    if (total === 0) return 'None';
    if (connected === total) return 'All Online';
    if (connected > 0) return 'Partial';
    return 'Offline';
  };

  if (isLoading && !networkStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading network status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Network Management</h2>
          <p className="text-muted-foreground">
            Manage GL-iNet routers and ZeroTier networks
          </p>
        </div>
        <Button 
          onClick={refreshStatus} 
          disabled={isLoading}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Network Status Overview */}
      {networkStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Routers Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GL-iNet Routers</CardTitle>
              <Router className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(networkStatus.routers.connected, networkStatus.routers.total)}`} />
                <div className="text-2xl font-bold">{networkStatus.routers.connected}/{networkStatus.routers.total}</div>
              </div>
              <p className="text-xs text-muted-foreground">
                {getStatusText(networkStatus.routers.connected, networkStatus.routers.total)}
              </p>
              {networkStatus.routers.disconnected > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {networkStatus.routers.disconnected} disconnected
                </p>
              )}
            </CardContent>
          </Card>

          {/* ZeroTier Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ZeroTier Networks</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {networkStatus.zerotier.configured ? (
                  networkStatus.zerotier.available ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <div className="text-sm font-medium">
                  {networkStatus.zerotier.configured ? 
                    (networkStatus.zerotier.available ? 'Active' : 'Configured') : 
                    'Not Configured'
                  }
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {networkStatus.zerotier.configured ? 
                  'Backend integration active' : 
                  'Backend not configured'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="routers">Routers</TabsTrigger>
          <TabsTrigger value="zerotier">ZeroTier</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('routers')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add GL-iNet Router
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('zerotier')}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Manage ZeroTier Networks
                </Button>
              </CardContent>
            </Card>

            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>System Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Backend Status</span>
                  <Badge variant={error ? "destructive" : "default"}>
                    {error ? 'Error' : 'Active'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">ZeroTier Integration</span>
                  <Badge variant={networkStatus?.zerotier.configured ? "default" : "secondary"}>
                    {networkStatus?.zerotier.configured ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {networkStatus && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Last Update</span>
                    <span className="text-sm">
                      {new Date(networkStatus.lastUpdate).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="routers" className="space-y-4">
          <RouterManagement />
        </TabsContent>

        <TabsContent value="zerotier" className="space-y-4">
          <ZeroTierManagement routers={[]} onRefresh={() => {}} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
