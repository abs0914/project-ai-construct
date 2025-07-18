import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Plus, 
  Activity, 
  Globe,
  Users,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Router,
  Network
} from 'lucide-react';

interface VPNTunnel {
  id: string;
  type: 'zerotier';
  networkId: string;
  networkName: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  routers: Array<{
    routerId: string;
    connected: boolean;
    localIP?: string;
    uptime?: number;
    error?: string;
  }>;
  networkStats?: {
    networkId: string;
    name: string;
    totalMembers: number;
    authorizedMembers: number;
    onlineMembers: number;
  };
  createdAt: string;
  lastUpdate: string;
}

interface RouterInfo {
  id: string;
  host: string;
  status: string;
}

const NETWORK_SERVER_URL = 'http://localhost:3003';

export const VPNTunnelManagement: React.FC = () => {
  const [tunnels, setTunnels] = useState<VPNTunnel[]>([]);
  const [routers, setRouters] = useState<RouterInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTunnel, setSelectedTunnel] = useState<VPNTunnel | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Form state for creating tunnel
  const [tunnelForm, setTunnelForm] = useState({
    tunnelId: '',
    type: 'zerotier',
    networkName: '',
    description: '',
    routerIds: [] as string[],
    private: true
  });

  useEffect(() => {
    loadTunnels();
    loadRouters();
    
    // Set up periodic refresh
    const interval = setInterval(loadTunnels, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTunnels = async () => {
    try {
      setError(null);
      const response = await fetch(`${NETWORK_SERVER_URL}/api/network/tunnels`);
      
      if (response.ok) {
        const data = await response.json();
        setTunnels(data.tunnels);
      } else {
        throw new Error('Failed to load tunnels');
      }
    } catch (error) {
      setError('Failed to load tunnels. Please ensure the network server is running.');
      console.error('Failed to load tunnels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRouters = async () => {
    try {
      const response = await fetch(`${NETWORK_SERVER_URL}/api/network/routers`);
      
      if (response.ok) {
        const data = await response.json();
        setRouters(data.routers);
      }
    } catch (error) {
      console.error('Failed to load routers:', error);
    }
  };

  const createTunnel = async () => {
    try {
      const response = await fetch(`${NETWORK_SERVER_URL}/api/network/tunnels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tunnelId: tunnelForm.tunnelId,
          type: tunnelForm.type,
          config: {
            networkName: tunnelForm.networkName,
            description: tunnelForm.description,
            routerIds: tunnelForm.routerIds,
            private: tunnelForm.private
          }
        })
      });

      if (response.ok) {
        setCreateDialogOpen(false);
        setTunnelForm({
          tunnelId: '',
          type: 'zerotier',
          networkName: '',
          description: '',
          routerIds: [],
          private: true
        });
        await loadTunnels();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create tunnel');
      }
    } catch (error) {
      setError('Failed to create tunnel');
    }
  };

  const deleteTunnel = async (tunnelId: string) => {
    try {
      const response = await fetch(`${NETWORK_SERVER_URL}/api/network/tunnels/${tunnelId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadTunnels();
      } else {
        setError('Failed to delete tunnel');
      }
    } catch (error) {
      setError('Failed to delete tunnel');
    }
  };

  const showTunnelDetails = (tunnel: VPNTunnel) => {
    setSelectedTunnel(tunnel);
    setDetailsDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Activity className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'disconnected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">VPN Tunnel Management</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage VPN tunnels for secure site connectivity
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create Tunnel</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create VPN Tunnel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tunnelId">Tunnel ID</Label>
                <Input
                  id="tunnelId"
                  value={tunnelForm.tunnelId}
                  onChange={(e) => setTunnelForm(prev => ({ ...prev, tunnelId: e.target.value }))}
                  placeholder="e.g., site-vpn-01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="networkName">Network Name</Label>
                <Input
                  id="networkName"
                  value={tunnelForm.networkName}
                  onChange={(e) => setTunnelForm(prev => ({ ...prev, networkName: e.target.value }))}
                  placeholder="SiteGuard Network"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={tunnelForm.description}
                  onChange={(e) => setTunnelForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="VPN network for construction site"
                />
              </div>
              <div className="space-y-2">
                <Label>Routers to Include</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {routers.map((router) => (
                    <div key={router.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`router-${router.id}`}
                        checked={tunnelForm.routerIds.includes(router.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTunnelForm(prev => ({
                              ...prev,
                              routerIds: [...prev.routerIds, router.id]
                            }));
                          } else {
                            setTunnelForm(prev => ({
                              ...prev,
                              routerIds: prev.routerIds.filter(id => id !== router.id)
                            }));
                          }
                        }}
                      />
                      <label htmlFor={`router-${router.id}`} className="text-sm">
                        {router.id} ({router.host})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createTunnel}>
                  Create Tunnel
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

      {/* Tunnels Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Activity className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tunnels.map((tunnel) => (
            <Card key={tunnel.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <CardTitle className="text-sm">{tunnel.id}</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(tunnel.status)}
                    <Badge variant={tunnel.status === 'connected' ? "default" : "destructive"}>
                      {tunnel.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {tunnel.networkName}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Network Info */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Network ID:</span>
                    <span className="font-mono text-xs">{tunnel.networkId.slice(0, 16)}...</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="uppercase">{tunnel.type}</span>
                  </div>
                </div>

                {/* Router Status */}
                <div className="space-y-2">
                  <div className="text-xs font-medium">Routers ({tunnel.routers.length})</div>
                  <div className="space-y-1">
                    {tunnel.routers.slice(0, 3).map((router, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${router.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span>{router.routerId}</span>
                        </div>
                        {router.localIP && (
                          <span className="text-muted-foreground">{router.localIP}</span>
                        )}
                      </div>
                    ))}
                    {tunnel.routers.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{tunnel.routers.length - 3} more
                      </div>
                    )}
                  </div>
                </div>

                {/* Network Stats */}
                {tunnel.networkStats && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Members:</span>
                      <span>{tunnel.networkStats.authorizedMembers}/{tunnel.networkStats.totalMembers}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Online:</span>
                      <span>{tunnel.networkStats.onlineMembers}</span>
                    </div>
                  </div>
                )}

                {/* Last Update */}
                <div className="text-xs text-muted-foreground">
                  Updated: {new Date(tunnel.lastUpdate).toLocaleString()}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => showTunnelDetails(tunnel)}
                    className="text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => deleteTunnel(tunnel.id)}
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
      {!isLoading && tunnels.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No VPN Tunnels</h3>
            <p className="text-muted-foreground mb-4">
              Create VPN tunnels to securely connect your construction sites
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Tunnel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tunnel Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tunnel Details: {selectedTunnel?.id}</DialogTitle>
          </DialogHeader>
          
          {selectedTunnel && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tunnel ID</Label>
                  <p className="text-sm">{selectedTunnel.id}</p>
                </div>
                <div>
                  <Label>Network Name</Label>
                  <p className="text-sm">{selectedTunnel.networkName}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedTunnel.status)}
                    <span className="text-sm">{selectedTunnel.status}</span>
                  </div>
                </div>
                <div>
                  <Label>Type</Label>
                  <p className="text-sm uppercase">{selectedTunnel.type}</p>
                </div>
              </div>

              {/* Network ID */}
              <div>
                <Label>ZeroTier Network ID</Label>
                <p className="text-sm font-mono bg-muted p-2 rounded">{selectedTunnel.networkId}</p>
              </div>

              {/* Router Status */}
              <div>
                <Label className="text-base">Router Status ({selectedTunnel.routers.length})</Label>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                  {selectedTunnel.routers.map((router, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${router.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm">{router.routerId}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {router.localIP || (router.error ? 'Error' : 'Disconnected')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Network Statistics */}
              {selectedTunnel.networkStats && (
                <div>
                  <Label className="text-base">Network Statistics</Label>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <Label>Total Members</Label>
                      <p className="text-sm">{selectedTunnel.networkStats.totalMembers}</p>
                    </div>
                    <div>
                      <Label>Authorized</Label>
                      <p className="text-sm">{selectedTunnel.networkStats.authorizedMembers}</p>
                    </div>
                    <div>
                      <Label>Online</Label>
                      <p className="text-sm">{selectedTunnel.networkStats.onlineMembers}</p>
                    </div>
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
