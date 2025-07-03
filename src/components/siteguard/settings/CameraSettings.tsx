import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Camera, Plus, Trash2, Settings } from 'lucide-react';
import { useSiteGuardData } from '@/hooks/useSiteGuardData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CameraSettingsProps {
  onSettingsChange: () => void;
}

export const CameraSettings: React.FC<CameraSettingsProps> = ({ onSettingsChange }) => {
  const { cameras, routers, refetch } = useSiteGuardData();
  const { toast } = useToast();
  const [newCamera, setNewCamera] = useState({
    name: '',
    location: '',
    ip_address: '',
    username: 'admin',
    router_id: '',
    onvif_port: 80,
  });

  const handleAddCamera = async () => {
    if (!newCamera.name || !newCamera.location || !newCamera.ip_address) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('cameras')
        .insert([{
          ...newCamera,
          status: 'offline',
          is_recording: false
        }]);

      if (error) throw error;

      toast({
        title: "Camera added",
        description: `${newCamera.name} has been added successfully`,
      });

      setNewCamera({
        name: '',
        location: '',
        ip_address: '',
        username: 'admin',
        router_id: '',
        onvif_port: 80,
      });

      refetch.cameras();
      onSettingsChange();
    } catch (error) {
      console.error('Error adding camera:', error);
      toast({
        title: "Error",
        description: "Failed to add camera",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCamera = async (cameraId: string, cameraName: string) => {
    try {
      const { error } = await supabase
        .from('cameras')
        .delete()
        .eq('id', cameraId);

      if (error) throw error;

      toast({
        title: "Camera removed",
        description: `${cameraName} has been removed`,
      });

      refetch.cameras();
      onSettingsChange();
    } catch (error) {
      console.error('Error deleting camera:', error);
      toast({
        title: "Error",
        description: "Failed to remove camera",
        variant: "destructive",
      });
    }
  };

  const handleToggleRecording = async (cameraId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('cameras')
        .update({ is_recording: !currentState })
        .eq('id', cameraId);

      if (error) throw error;

      refetch.cameras();
      onSettingsChange();
    } catch (error) {
      console.error('Error updating recording state:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Camera */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Camera
          </CardTitle>
          <CardDescription>
            Configure a new ONVIF-compatible camera for monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="camera-name">Camera Name *</Label>
              <Input
                id="camera-name"
                placeholder="Main Entrance Cam"
                value={newCamera.name}
                onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="camera-location">Location *</Label>
              <Input
                id="camera-location"
                placeholder="Gate A"
                value={newCamera.location}
                onChange={(e) => setNewCamera({ ...newCamera, location: e.target.value })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="camera-ip">IP Address *</Label>
              <Input
                id="camera-ip"
                placeholder="192.168.1.200"
                value={newCamera.ip_address}
                onChange={(e) => setNewCamera({ ...newCamera, ip_address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="camera-port">ONVIF Port</Label>
              <Input
                id="camera-port"
                type="number"
                value={newCamera.onvif_port}
                onChange={(e) => setNewCamera({ ...newCamera, onvif_port: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="camera-username">Username</Label>
              <Input
                id="camera-username"
                value={newCamera.username}
                onChange={(e) => setNewCamera({ ...newCamera, username: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="camera-router">Connected Router</Label>
            <Select value={newCamera.router_id} onValueChange={(value) => setNewCamera({ ...newCamera, router_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a router (optional)" />
              </SelectTrigger>
              <SelectContent>
                {routers.map((router) => (
                  <SelectItem key={router.id} value={router.id}>
                    {router.name} - {router.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleAddCamera} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Camera
          </Button>
        </CardContent>
      </Card>

      {/* Existing Cameras */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Configured Cameras ({cameras.length})
          </CardTitle>
          <CardDescription>
            Manage existing camera configurations and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cameras.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No cameras configured yet. Add your first camera above.
              </p>
            ) : (
              cameras.map((camera) => (
                <div key={camera.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">{camera.name}</h4>
                      <p className="text-sm text-muted-foreground">{camera.location}</p>
                      <p className="text-xs text-muted-foreground">{camera.ip_address}:{camera.onvif_port}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={camera.status === 'online' ? 'default' : 'secondary'}>
                        {camera.status}
                      </Badge>
                      {camera.is_recording && (
                        <Badge variant="destructive">Recording</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`recording-${camera.id}`} className="text-sm">Recording</Label>
                      <Switch
                        id={`recording-${camera.id}`}
                        checked={camera.is_recording || false}
                        onCheckedChange={() => handleToggleRecording(camera.id, camera.is_recording || false)}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteCamera(camera.id, camera.name)}
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
