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
      {/* ZeroTier Network Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            ZeroTier Network Status
          </CardTitle>
          <CardDescription>
            Current ZeroTier VPN connection status for construction site access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Backend Integration</p>
              <p className="text-sm text-muted-foreground">ZeroTier API configured and active</p>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Router ZeroTier Status */}
      <Card>
        <CardHeader>
          <CardTitle>Router Connection Status</CardTitle>
          <CardDescription>
            ZeroTier connection status for each GL.iNET router
          </CardDescription>
        </CardHeader>
        <CardContent>
          {routers.length > 0 ? (
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
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Network className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Routers Found</h3>
              <p className="text-muted-foreground">Use the Setup Wizard to configure your network</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};