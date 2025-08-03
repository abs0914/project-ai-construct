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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VpnRouter {
  id: string;
  name: string;
  model: string;
  ip_address: string;
  vpn_status: 'connected' | 'disconnected' | 'connecting' | 'error';
  location: string;
  bandwidth_usage: number;
  last_seen?: string;
  zerotier_status?: 'connected' | 'disconnected' | 'connecting' | 'error';
  zerotier_ip_address?: string;
  zerotier_enabled?: boolean;
}

export const RouterManagement: React.FC = () => {
  const [routers, setRouters] = useState<VpnRouter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedRouter, setSelectedRouter] = useState<VpnRouter | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Form state for adding router
  const [routerForm, setRouterForm] = useState({
    name: '',
    ip_address: '',
    model: 'GL-MT300N',
    location: ''
  });

  useEffect(() => {
    loadRouters();
  }, []);

  const loadRouters = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('vpn_routers')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRouters((data as VpnRouter[]) || []);
    } catch (error) {
      setError('Failed to load routers from database.');
      console.error('Failed to load routers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addRouter = async () => {
    try {
      const { error } = await supabase
        .from('vpn_routers')
        .insert({
          name: routerForm.name,
          ip_address: routerForm.ip_address,
          model: routerForm.model,
          location: routerForm.location,
          vpn_status: 'disconnected',
          bandwidth_usage: 0
        });

      if (error) throw error;

      toast({
        title: "Router Added",
        description: `${routerForm.name} has been added successfully`,
      });

      setAddDialogOpen(false);
      setRouterForm({ name: '', ip_address: '', model: 'GL-MT300N', location: '' });
      await loadRouters();
    } catch (error) {
      toast({
        title: "Failed to Add Router",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeRouter = async (routerId: string) => {
    try {
      const { error } = await supabase
        .from('vpn_routers')
        .delete()
        .eq('id', routerId);

      if (error) throw error;

      toast({
        title: "Router Removed",
        description: "Router has been removed successfully",
      });

      await loadRouters();
    } catch (error) {
      toast({
        title: "Failed to Remove Router",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const showRouterDetails = (router: VpnRouter) => {
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
                <Label htmlFor="name">Router Name</Label>
                <Input
                  id="name"
                  value={routerForm.name}
                  onChange={(e) => setRouterForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Site Router 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ip_address">IP Address</Label>
                <Input
                  id="ip_address"
                  value={routerForm.ip_address}
                  onChange={(e) => setRouterForm(prev => ({ ...prev, ip_address: e.target.value }))}
                  placeholder="192.168.1.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={routerForm.model}
                  onChange={(e) => setRouterForm(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="GL-MT300N"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={routerForm.location}
                  onChange={(e) => setRouterForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Main Office"
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
                    <CardTitle className="text-sm">{router.name}</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(router.vpn_status)}
                    <Badge variant={router.vpn_status === 'connected' ? "default" : "destructive"}>
                      {router.vpn_status}
                    </Badge>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {router.ip_address}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Router Info */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Model:</span>
                    <span>{router.model}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{router.location}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Bandwidth:</span>
                    <span>{formatBytes(router.bandwidth_usage)}</span>
                  </div>
                </div>

                {/* ZeroTier Status */}
                {router.zerotier_enabled && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">ZeroTier:</span>
                      <Badge variant={router.zerotier_status === 'connected' ? "default" : "secondary"} className="text-xs">
                        {router.zerotier_status}
                      </Badge>
                    </div>
                    {router.zerotier_ip_address && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">ZT IP:</span>
                        <span>{router.zerotier_ip_address}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Last Seen */}
                {router.last_seen && (
                  <div className="text-xs text-muted-foreground">
                    Last seen: {new Date(router.last_seen).toLocaleString()}
                  </div>
                )}

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
            <DialogTitle>Router Details: {selectedRouter?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedRouter && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Router Name</Label>
                  <p className="text-sm">{selectedRouter.name}</p>
                </div>
                <div>
                  <Label>IP Address</Label>
                  <p className="text-sm">{selectedRouter.ip_address}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedRouter.vpn_status)}
                    <span className="text-sm">{selectedRouter.vpn_status}</span>
                  </div>
                </div>
                <div>
                  <Label>Location</Label>
                  <p className="text-sm">{selectedRouter.location}</p>
                </div>
              </div>

              {/* System Information */}
              <div>
                <Label className="text-base">Router Information</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label>Model</Label>
                    <p className="text-sm">{selectedRouter.model}</p>
                  </div>
                  <div>
                    <Label>Bandwidth Usage</Label>
                    <p className="text-sm">{formatBytes(selectedRouter.bandwidth_usage)}</p>
                  </div>
                  {selectedRouter.zerotier_enabled && (
                    <>
                      <div>
                        <Label>ZeroTier Status</Label>
                        <p className="text-sm">{selectedRouter.zerotier_status}</p>
                      </div>
                      {selectedRouter.zerotier_ip_address && (
                        <div>
                          <Label>ZeroTier IP</Label>
                          <p className="text-sm">{selectedRouter.zerotier_ip_address}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
