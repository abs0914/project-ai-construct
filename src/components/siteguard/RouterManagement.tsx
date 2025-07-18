import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Router, 
  Plus, 
  Settings, 
  Trash2, 
  RefreshCw,
  Wifi,
  Activity,
  Users,
  HardDrive,
  Thermometer,
  AlertCircle,
  CheckCircle,
  Eye
} from 'lucide-react';

interface RouterInfo {
  id: string;
  host: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSeen: string;
  retryCount: number;
  info?: {
    status?: {
      uptime: number;
      load: number[];
      memory: { total: number; free: number; used: number };
      temperature: number;
      firmware: string;
      model: string;
    };
    network?: {
      wan: { ip: string; status: string };
      lan: { ip: string };
    };
    wireless?: {
      enabled: boolean;
      ssid: string;
      clients: number;
    };
    clients?: Array<{
      mac: string;
      ip: string;
      hostname: string;
    }>;
    bandwidth?: {
      wan: { rxRate: number; txRate: number };
    };
  };
}

const NETWORK_SERVER_URL = 'http://localhost:3003';

export const RouterManagement: React.FC = () => {
  const [routers, setRouters] = useState<RouterInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedRouter, setSelectedRouter] = useState<RouterInfo | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Form state for adding router
  const [routerForm, setRouterForm] = useState({
    routerId: '',
    host: '',
    username: 'root',
    password: ''
  });

  useEffect(() => {
    loadRouters();
    
    // Set up periodic refresh
    const interval = setInterval(loadRouters, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRouters = async () => {
    try {
      setError(null);
      const response = await fetch(`${NETWORK_SERVER_URL}/api/network/routers`);
      
      if (response.ok) {
        const data = await response.json();
        setRouters(data.routers);
      } else {
        throw new Error('Failed to load routers');
      }
    } catch (error) {
      setError('Failed to load routers. Please ensure the network server is running.');
      console.error('Failed to load routers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addRouter = async () => {
    try {
      const response = await fetch(`${NETWORK_SERVER_URL}/api/network/routers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routerForm)
      });

      if (response.ok) {
        setAddDialogOpen(false);
        setRouterForm({ routerId: '', host: '', username: 'root', password: '' });
        await loadRouters();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add router');
      }
    } catch (error) {
      setError('Failed to add router');
    }
  };

  const removeRouter = async (routerId: string) => {
    try {
      const response = await fetch(`${NETWORK_SERVER_URL}/api/network/routers/${routerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadRouters();
      } else {
        setError('Failed to remove router');
      }
    } catch (error) {
      setError('Failed to remove router');
    }
  };

  const showRouterDetails = (router: RouterInfo) => {
    setSelectedRouter(router);
    setDetailsDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">GL-iNet Router Management</h3>
          <p className="text-sm text-muted-foreground">
            Monitor and manage GL-iNet routers on your network
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Router</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add GL-iNet Router</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="routerId">Router ID</Label>
                <Input
                  id="routerId"
                  value={routerForm.routerId}
                  onChange={(e) => setRouterForm(prev => ({ ...prev, routerId: e.target.value }))}
                  placeholder="e.g., site-router-01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host">IP Address</Label>
                <Input
                  id="host"
                  value={routerForm.host}
                  onChange={(e) => setRouterForm(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="192.168.1.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={routerForm.username}
                  onChange={(e) => setRouterForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="root"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={routerForm.password}
                  onChange={(e) => setRouterForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Router admin password"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addRouter}>
                  Add Router
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Routers Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Activity className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routers.map((router) => (
            <Card key={router.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Router className="h-5 w-5" />
                    <CardTitle className="text-sm">{router.id}</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(router.status)}
                    <Badge variant={router.status === 'connected' ? "default" : "destructive"}>
                      {router.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {router.host}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Router Info */}
                {router.info?.status && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Model:</span>
                      <span>{router.info.status.model}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Uptime:</span>
                      <span>{formatUptime(router.info.status.uptime)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Memory:</span>
                      <span>{Math.round((router.info.status.memory.used / router.info.status.memory.total) * 100)}%</span>
                    </div>
                  </div>
                )}

                {/* Network Status */}
                {router.info?.network && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">WAN IP:</span>
                      <span>{router.info.network.wan.ip || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">LAN IP:</span>
                      <span>{router.info.network.lan.ip || 'N/A'}</span>
                    </div>
                  </div>
                )}

                {/* Wireless Info */}
                {router.info?.wireless && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      <Wifi className="h-3 w-3" />
                      <span>{router.info.wireless.ssid}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>{router.info.wireless.clients}</span>
                    </div>
                  </div>
                )}

                {/* Last Seen */}
                <div className="text-xs text-muted-foreground">
                  Last seen: {new Date(router.lastSeen).toLocaleString()}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => showRouterDetails(router)}
                    className="text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => removeRouter(router.id)}
                    className="text-xs"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && routers.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Router className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Routers Added</h3>
            <p className="text-muted-foreground mb-4">
              Add GL-iNet routers to monitor and manage your network infrastructure
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Router
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Router Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Router Details: {selectedRouter?.id}</DialogTitle>
          </DialogHeader>
          
          {selectedRouter && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Router ID</Label>
                  <p className="text-sm">{selectedRouter.id}</p>
                </div>
                <div>
                  <Label>IP Address</Label>
                  <p className="text-sm">{selectedRouter.host}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedRouter.status)}
                    <span className="text-sm">{selectedRouter.status}</span>
                  </div>
                </div>
                <div>
                  <Label>Last Seen</Label>
                  <p className="text-sm">{new Date(selectedRouter.lastSeen).toLocaleString()}</p>
                </div>
              </div>

              {/* System Information */}
              {selectedRouter.info?.status && (
                <div>
                  <Label className="text-base">System Information</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label>Model</Label>
                      <p className="text-sm">{selectedRouter.info.status.model}</p>
                    </div>
                    <div>
                      <Label>Firmware</Label>
                      <p className="text-sm">{selectedRouter.info.status.firmware}</p>
                    </div>
                    <div>
                      <Label>Uptime</Label>
                      <p className="text-sm">{formatUptime(selectedRouter.info.status.uptime)}</p>
                    </div>
                    <div>
                      <Label>Temperature</Label>
                      <p className="text-sm">{selectedRouter.info.status.temperature}°C</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Connected Clients */}
              {selectedRouter.info?.clients && selectedRouter.info.clients.length > 0 && (
                <div>
                  <Label className="text-base">Connected Clients ({selectedRouter.info.clients.length})</Label>
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                    {selectedRouter.info.clients.map((client, index) => (
                      <div key={index} className="flex justify-between text-sm bg-muted p-2 rounded">
                        <span>{client.hostname || 'Unknown'}</span>
                        <span>{client.ip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
