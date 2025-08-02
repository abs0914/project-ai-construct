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
            <Search className="h-5 w-5" />
            <span>Multi-Site Camera Discovery</span>
          </CardTitle>
          <CardDescription>
            Discover cameras across all VPN-connected sites and ZeroTier networks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => handleDiscovery('discover_cameras_multi_site')}
              disabled={loading === 'discover_cameras_multi_site'}
              className="w-full"
            >
              {loading === 'discover_cameras_multi_site' ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Scan All Sites
            </Button>

            <Button
              onClick={() => handleDiscovery('scan_zerotier_network')}
              disabled={loading === 'scan_zerotier_network'}
              variant="outline"
              className="w-full"
            >
              {loading === 'scan_zerotier_network' ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Network className="mr-2 h-4 w-4" />
              )}
              Scan ZeroTier
            </Button>

            <Button
              onClick={() => handleDiscovery('test_camera_connectivity')}
              disabled={loading === 'test_camera_connectivity'}
              variant="outline"
              className="w-full"
            >
              {loading === 'test_camera_connectivity' ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wifi className="mr-2 h-4 w-4" />
              )}
              Test Connectivity
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <Label htmlFor="router-select">Scan Specific Router:</Label>
            <Select value={selectedRouter} onValueChange={setSelectedRouter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a router" />
              </SelectTrigger>
              <SelectContent>
                {routers.map((router) => (
                  <SelectItem key={router.id} value={router.id}>
                    {router.name} ({router.ip_address})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => handleDiscovery('discover_cameras_by_router', selectedRouter)}
              disabled={!selectedRouter || loading === 'discover_cameras_by_router'}
              variant="outline"
            >
              {loading === 'discover_cameras_by_router' ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Scan Router
            </Button>
          </div>
        </CardContent>
      </Card>

      {discoveredCameras.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="h-5 w-5" />
              <span>Discovered Cameras ({discoveredCameras.length})</span>
            </CardTitle>
            <CardDescription>
              Cameras found across your VPN-connected network segments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Network Segment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discoveredCameras.map((camera, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{camera.name}</TableCell>
                    <TableCell>{camera.location}</TableCell>
                    <TableCell className="font-mono text-sm">{camera.ip_address}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {camera.network_segment}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(camera.status)}`} />
                        <Badge variant={camera.status === 'online' ? 'default' : 'secondary'}>
                          {camera.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleAddCamera(camera)}
                        disabled={camera.status === 'offline'}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Network Architecture</CardTitle>
          <CardDescription>
            Current VPN topology and connected sites
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
        </CardContent>
      </Card>
    </div>
  );
};