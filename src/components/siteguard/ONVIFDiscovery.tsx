import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  Camera, 
  Settings, 
  Wifi, 
  WifiOff, 
  Eye, 
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Info,
  Trash2
} from 'lucide-react';

interface ONVIFDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  manufacturer: string;
  model: string;
  type: string;
  status: 'discovered' | 'connected' | 'error' | 'rebooting';
  configured: boolean;
  capabilities: {
    media: boolean;
    ptz: boolean;
    imaging: boolean;
    events: boolean;
    analytics: boolean;
  };
  profiles: Array<{
    token: string;
    name: string;
    videoEncoder: any;
    audioEncoder: any;
    ptz: any;
  }>;
  lastSeen: string;
  lastError?: string;
}

export const ONVIFDiscovery: React.FC = () => {
  const [devices, setDevices] = useState<ONVIFDevice[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<ONVIFDevice | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [credentials, setCredentials] = useState({ username: 'admin', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load devices on component mount
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('onvif-discovery', {
        body: { action: 'get_devices' }
      });
      
      if (error) {
        console.error('Failed to load devices:', error);
        return;
      }
      
      // Ensure devices have all required properties with defaults
      const devicesWithDefaults = (data?.devices || []).map((device: any) => ({
        ...device,
        id: device.id || `${device.ip}-${device.port}`,
        status: device.status || 'discovered',
        configured: device.configured || false,
        capabilities: device.capabilities || {
          media: false,
          ptz: false,
          imaging: false,
          events: false,
          analytics: false
        },
        profiles: device.profiles || [],
        lastSeen: device.lastSeen || new Date().toISOString()
      }));
      
      setDevices(devicesWithDefaults);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const startDiscovery = async () => {
    setIsDiscovering(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.functions.invoke('onvif-discovery', {
        body: { action: 'discover', networkRange: '192.168.8.0/24' }
      });

      if (error) {
        throw new Error(error.message || 'Discovery failed');
      }

      // Ensure devices have all required properties with defaults
      const devicesWithDefaults = (data?.devices || []).map((device: any) => ({
        ...device,
        id: device.id || `${device.ip}-${device.port}`,
        type: device.type || 'camera',
        status: device.status || 'discovered',
        configured: device.configured || false,
        capabilities: device.capabilities || {
          media: false,
          ptz: false,
          imaging: false,
          events: false,
          analytics: false
        },
        profiles: device.profiles || [],
        lastSeen: device.lastSeen || new Date().toISOString()
      }));

      setDevices(devicesWithDefaults);
      setSuccess(`Discovery completed. Found ${devicesWithDefaults.length} devices.`);
    } catch (error) {
      setError('Failed to discover devices. Please try again.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const configureDevice = async (device: ONVIFDevice) => {
    setSelectedDevice(device);
    setCredentials({ username: 'admin', password: '' });
    setConfigDialogOpen(true);
  };

  const submitConfiguration = async () => {
    if (!selectedDevice) return;

    try {
      const { data, error } = await supabase.functions.invoke('onvif-discovery', {
        body: { 
          action: 'configure',
          deviceId: selectedDevice.id,
          credentials
        }
      });

      if (error) {
        setError(error.message || 'Configuration failed');
        return;
      }

      setSuccess(`Device ${selectedDevice.name} configured successfully`);
      setConfigDialogOpen(false);
      await loadDevices();
    } catch (error) {
      setError('Failed to configure device');
    }
  };

  const removeDevice = async (deviceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('onvif-discovery', {
        body: { 
          action: 'remove_device',
          deviceId
        }
      });

      if (error) {
        setError('Failed to remove device');
        return;
      }

      setSuccess('Device removed successfully');
      await loadDevices();
    } catch (error) {
      setError('Failed to remove device');
    }
  };

  const rebootDevice = async (deviceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('onvif-discovery', {
        body: { 
          action: 'reboot_device',
          deviceId
        }
      });

      if (error) {
        setError('Failed to reboot device');
        return;
      }

      setSuccess('Device reboot initiated');
      await loadDevices();
    } catch (error) {
      setError('Failed to reboot device');
    }
  };

  const getStatusIcon = (device: ONVIFDevice) => {
    switch (device.status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'rebooting':
        return <RotateCcw className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'rebooting': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">ONVIF Device Discovery</h2>
          <p className="text-muted-foreground">
            Discover and configure ONVIF cameras on your network
          </p>
        </div>
        <Button 
          onClick={startDiscovery} 
          disabled={isDiscovering}
          className="flex items-center space-x-2"
        >
          <Search className={`h-4 w-4 ${isDiscovering ? 'animate-spin' : ''}`} />
          <span>{isDiscovering ? 'Discovering...' : 'Start Discovery'}</span>
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device) => (
          <Card key={device.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Camera className="h-5 w-5" />
                  <CardTitle className="text-sm">{device.name}</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(device)}
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(device.status)}`} />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {device.manufacturer} {device.model}
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Device Info */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IP Address:</span>
                  <span className="font-mono">{device.ip}:{device.port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={device.configured ? "default" : "secondary"}>
                    {device.configured ? 'Configured' : 'Discovered'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{device.type}</span>
                </div>
              </div>

              {/* Capabilities */}
              {device.configured && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Capabilities:</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(device.capabilities).map(([capability, supported]) => (
                      <Badge 
                        key={capability} 
                        variant={supported ? "default" : "outline"}
                        className="text-xs"
                      >
                        {capability.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Profiles */}
              {device.profiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Profiles ({device.profiles.length}):
                  </div>
                  <div className="space-y-1">
                    {device.profiles.slice(0, 2).map((profile) => (
                      <div key={profile.token} className="text-xs bg-muted p-2 rounded">
                        {profile.name || `Profile ${profile.token.slice(0, 8)}`}
                      </div>
                    ))}
                    {device.profiles.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{device.profiles.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {device.lastError && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">
                    {device.lastError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-1">
                  {!device.configured ? (
                    <Button 
                      size="sm" 
                      onClick={() => configureDevice(device)}
                      className="text-xs"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Configure
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => rebootDevice(device.id)}
                      className="text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reboot
                    </Button>
                  )}
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => removeDevice(device.id)}
                  className="text-xs"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {devices.length === 0 && !isDiscovering && (
        <Card className="text-center py-12">
          <CardContent>
            <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No ONVIF Devices Found</h3>
            <p className="text-muted-foreground mb-4">
              Click "Start Discovery" to search for ONVIF cameras on your network
            </p>
            <Button onClick={startDiscovery} disabled={isDiscovering}>
              <Search className="h-4 w-4 mr-2" />
              Start Discovery
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure ONVIF Device</DialogTitle>
          </DialogHeader>
          
          {selectedDevice && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm">
                  <strong>Device:</strong> {selectedDevice.name}
                </div>
                <div className="text-sm">
                  <strong>IP:</strong> {selectedDevice.ip}:{selectedDevice.port}
                </div>
                <div className="text-sm">
                  <strong>Manufacturer:</strong> {selectedDevice.manufacturer} {selectedDevice.model}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={credentials.username}
                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="admin"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter device password"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submitConfiguration}>
                  Configure Device
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
