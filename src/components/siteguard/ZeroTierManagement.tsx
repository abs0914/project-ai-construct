import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Network, Shield, RefreshCw, Plus, Unlink } from 'lucide-react';
import { VpnRouter } from '@/hooks/useSiteGuardData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ZeroTierManagementProps {
  routers: VpnRouter[];
  onRefresh: () => void;
}

export const ZeroTierManagement: React.FC<ZeroTierManagementProps> = ({
  routers,
  onRefresh
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [newNetworkId, setNewNetworkId] = useState('');
  const { toast } = useToast();

  const handleZeroTierAction = async (action: string, routerId?: string, networkId?: string) => {
    setLoading(routerId || 'global');
    try {
      const { data, error } = await supabase.functions.invoke('zerotier-management', {
        body: {
          action,
          router_id: routerId,
          network_id: networkId || newNetworkId
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || `ZeroTier ${action} completed successfully`,
      });

      onRefresh();
    } catch (error) {
      console.error(`ZeroTier ${action} error:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action}: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const getZeroTierStatusColor = (status?: string) => {
    switch (status) {
      case 'connected': return 'default';
      case 'connecting': return 'secondary';
      case 'disconnected': return 'outline';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* ZeroTier Network Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            ZeroTier Network Management
          </CardTitle>
          <CardDescription>
            Manage ZeroTier VPN connections for secure remote access to construction sites
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="network-id">ZeroTier Network ID</Label>
              <Input
                id="network-id"
                placeholder="Enter ZeroTier Network ID (e.g., a84ac5c10a4a5d56)"
                value={newNetworkId}
                onChange={(e) => setNewNetworkId(e.target.value)}
              />
            </div>
            <Button
              onClick={() => handleZeroTierAction('monitor_all_nodes')}
              disabled={loading === 'global'}
              variant="outline"
            >
              {loading === 'global' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Router ZeroTier Status */}
      <Card>
        <CardHeader>
          <CardTitle>Router ZeroTier Status</CardTitle>
          <CardDescription>
            Individual ZeroTier connection status for each GL.iNET router
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {routers.map((router) => (
              <div key={router.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{router.name}</p>
                      <p className="text-sm text-muted-foreground">{router.location}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Local IP:</span>
                      <span className="text-xs font-mono">{router.ip_address}</span>
                    </div>
                    {router.zerotier_ip_address && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">ZeroTier IP:</span>
                        <span className="text-xs font-mono text-blue-600">{router.zerotier_ip_address}</span>
                      </div>
                    )}
                    {router.zerotier_node_id && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Node ID:</span>
                        <span className="text-xs font-mono">{router.zerotier_node_id}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <Badge variant={getZeroTierStatusColor(router.zerotier_status)}>
                      {router.zerotier_enabled ? router.zerotier_status : 'disabled'}
                    </Badge>
                    {router.zerotier_network_id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Network: {router.zerotier_network_id}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {router.zerotier_enabled ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleZeroTierAction('restart_zerotier', router.id)}
                          disabled={loading === router.id}
                        >
                          {loading === router.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleZeroTierAction('leave_network', router.id)}
                          disabled={loading === router.id}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleZeroTierAction('join_network', router.id, newNetworkId)}
                        disabled={loading === router.id || !newNetworkId}
                      >
                        {loading === router.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Join
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};