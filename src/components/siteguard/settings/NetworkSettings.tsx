import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Network, Wifi, Shield, Router, Plus, Trash2 } from 'lucide-react';
import { useSiteGuardData } from '@/hooks/useSiteGuardData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NetworkSettingsProps {
  onSettingsChange: () => void;
}

export const NetworkSettings: React.FC<NetworkSettingsProps> = ({ onSettingsChange }) => {
  const { routers, refetch } = useSiteGuardData();
  const { toast } = useToast();
  const [newRouter, setNewRouter] = useState({
    name: '',
    location: '',
    ip_address: '',
    model: 'GL-MT300N',
    api_key: ''
  });

  const [networkConfig, setNetworkConfig] = useState({
    enableZeroTier: true,
    autoReconnect: true,
    bandwidthLimit: 1000, // MB per day
    vpnFallback: true
  });

  const handleAddRouter = async () => {
    if (!newRouter.name || !newRouter.location || !newRouter.ip_address) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('vpn_routers')
        .insert([{
          ...newRouter,
          vpn_status: 'disconnected',
          bandwidth_usage: 0
        }]);

      if (error) throw error;

      toast({
        title: "Router added",
        description: `${newRouter.name} has been added successfully`,
      });

      setNewRouter({
        name: '',
        location: '',
        ip_address: '',
        model: 'GL-MT300N',
        api_key: ''
      });

      refetch.routers();
      onSettingsChange();
    } catch (error) {
      console.error('Error adding router:', error);
      toast({
        title: "Error",
        description: "Failed to add router",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRouter = async (routerId: string, routerName: string) => {
    try {
      const { error } = await supabase
        .from('vpn_routers')
        .delete()
        .eq('id', routerId);

      if (error) throw error;

      toast({
        title: "Router removed",
        description: `${routerName} has been removed`,
      });

      refetch.routers();
      onSettingsChange();
    } catch (error) {
      console.error('Error deleting router:', error);
      toast({
        title: "Error",
        description: "Failed to remove router",
        variant: "destructive",
      });
    }
  };

  const handleNetworkConfigChange = (key: string, value: any) => {
    setNetworkConfig(prev => ({ ...prev, [key]: value }));
    onSettingsChange();
  };

  return (
    <div className="space-y-6">
      {/* Network Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Network Configuration
          </CardTitle>
          <CardDescription>
            Configure global network settings and connectivity options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Enable ZeroTier VPN</Label>
                <p className="text-sm text-muted-foreground">Use ZeroTier for secure remote access</p>
              </div>
            </div>
            <Switch
              checked={networkConfig.enableZeroTier}
              onCheckedChange={(checked) => handleNetworkConfigChange('enableZeroTier', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Wifi className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Auto-Reconnect</Label>
                <p className="text-sm text-muted-foreground">Automatically reconnect on connection loss</p>
              </div>
            </div>
            <Switch
              checked={networkConfig.autoReconnect}
              onCheckedChange={(checked) => handleNetworkConfigChange('autoReconnect', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Router className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>VPN Fallback</Label>
                <p className="text-sm text-muted-foreground">Use traditional VPN if ZeroTier fails</p>
              </div>
            </div>
            <Switch
              checked={networkConfig.vpnFallback}
              onCheckedChange={(checked) => handleNetworkConfigChange('vpnFallback', checked)}
            />
          </div>

          <div>
            <Label htmlFor="bandwidth-limit">Daily Bandwidth Limit (MB)</Label>
            <Input
              id="bandwidth-limit"
              type="number"
              value={networkConfig.bandwidthLimit}
              onChange={(e) => handleNetworkConfigChange('bandwidthLimit', parseInt(e.target.value))}
              placeholder="1000"
            />
          </div>
        </CardContent>
      </Card>

      {/* Add New Router */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Router
          </CardTitle>
          <CardDescription>
            Configure a new GL.iNET router for network connectivity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="router-name">Router Name *</Label>
              <Input
                id="router-name"
                placeholder="Router-Gate-A"
                value={newRouter.name}
                onChange={(e) => setNewRouter({ ...newRouter, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="router-location">Location *</Label>
              <Input
                id="router-location"
                placeholder="Main Entrance"
                value={newRouter.location}
                onChange={(e) => setNewRouter({ ...newRouter, location: e.target.value })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="router-ip">IP Address *</Label>
              <Input
                id="router-ip"
                placeholder="192.168.1.100"
                value={newRouter.ip_address}
                onChange={(e) => setNewRouter({ ...newRouter, ip_address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="router-model">Model</Label>
              <Input
                id="router-model"
                value={newRouter.model}
                onChange={(e) => setNewRouter({ ...newRouter, model: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="router-api-key">API Key (Optional)</Label>
            <Input
              id="router-api-key"
              placeholder="Router management API key"
              value={newRouter.api_key}
              onChange={(e) => setNewRouter({ ...newRouter, api_key: e.target.value })}
            />
          </div>

          <Button onClick={handleAddRouter} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Router
          </Button>
        </CardContent>
      </Card>

      {/* Existing Routers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Router className="h-5 w-5" />
            Configured Routers ({routers.length})
          </CardTitle>
          <CardDescription>
            Manage existing router configurations and network settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {routers.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No routers configured yet. Add your first router above.
              </p>
            ) : (
              routers.map((router) => (
                <div key={router.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Router className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">{router.name}</h4>
                      <p className="text-sm text-muted-foreground">{router.location}</p>
                      <p className="text-xs text-muted-foreground">{router.ip_address}</p>
                      {router.zerotier_enabled && router.zerotier_ip_address && (
                        <p className="text-xs text-blue-600">ZT: {router.zerotier_ip_address}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={router.vpn_status === 'connected' ? 'default' : 'secondary'}>
                        VPN: {router.vpn_status}
                      </Badge>
                      {router.zerotier_enabled && (
                        <Badge variant={router.zerotier_status === 'connected' ? 'default' : 'secondary'}>
                          ZT: {router.zerotier_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {Math.round(router.bandwidth_usage / 1024 / 1024)} MB used
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteRouter(router.id, router.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
