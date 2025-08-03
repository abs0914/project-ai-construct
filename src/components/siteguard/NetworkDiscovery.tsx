import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Network, Camera, RefreshCw, Plus, Wifi } from 'lucide-react';
import { VpnRouter } from '@/hooks/useSiteGuardData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NetworkDiscoveryProps {
  routers: VpnRouter[];
  onRefresh: () => void;
}

interface DiscoveredCamera {
  ip_address: string;
  name: string;
  location: string;
  rtsp_url: string;
  onvif_port: number;
  router_id?: string;
  status: 'online' | 'offline';
  network_segment: string;
}

export const NetworkDiscovery: React.FC<NetworkDiscoveryProps> = ({
  routers,
  onRefresh
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [discoveredCameras, setDiscoveredCameras] = useState<DiscoveredCamera[]>([]);
  const [selectedRouter, setSelectedRouter] = useState<string>('');
  const { toast } = useToast();

  const handleDiscovery = async (action: string, routerId?: string) => {
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke('network-discovery', {
        body: {
          action,
          router_id: routerId,
          network_segments: routers.map(r => getNetworkSegmentFromIP(r.ip_address))
        }
      });

      if (error) throw error;

      if (data.cameras) {
        setDiscoveredCameras(data.cameras);
      } else if (data.zerotier_cameras) {
        setDiscoveredCameras(data.zerotier_cameras);
      }

      toast({
        title: "Discovery Complete",
        description: `Found ${data.total_found} cameras across the network`,
      });

    } catch (error) {
      console.error(`Network discovery error:`, error);
      toast({
        title: "Discovery Failed",
        description: `Failed to discover cameras: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleAddCamera = async (camera: DiscoveredCamera) => {
    try {
      const { error } = await supabase
        .from('cameras')
        .insert({
          name: camera.name,
          location: camera.location,
          ip_address: camera.ip_address,
          onvif_port: camera.onvif_port,
          rtsp_url: camera.rtsp_url,
          username: 'admin',
          router_id: camera.router_id,
          status: camera.status
        });

      if (error) throw error;

      toast({
        title: "Camera Added",
        description: `${camera.name} has been added to the system`,
      });

      onRefresh();
    } catch (error) {
      console.error('Error adding camera:', error);
      toast({
        title: "Failed to Add Camera",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getNetworkSegmentFromIP = (ipAddress: string): string => {
    const parts = ipAddress.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Network className="h-5 w-5" />
            <span>Network Status</span>
          </CardTitle>
          <CardDescription>
            Current network topology and connected routers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routers.map((router) => (
              <Card key={router.id} className="border-dashed">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{router.name}</h4>
                    <Badge variant={router.zerotier_status === 'connected' ? 'default' : 'secondary'}>
                      {router.zerotier_status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">IP: {router.ip_address}</p>
                  <p className="text-sm text-muted-foreground">Location: {router.location}</p>
                  {router.zerotier_ip_address && (
                    <p className="text-sm text-muted-foreground">
                      ZeroTier: {router.zerotier_ip_address}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Segment: {getNetworkSegmentFromIP(router.ip_address)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {routers.length === 0 && (
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