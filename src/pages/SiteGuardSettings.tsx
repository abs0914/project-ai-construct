import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CameraSettings } from '@/components/siteguard/settings/CameraSettings';
import { AlertSettings } from '@/components/siteguard/settings/AlertSettings';
import { NetworkSettings } from '@/components/siteguard/settings/NetworkSettings';
import { PersonnelSettings } from '@/components/siteguard/settings/PersonnelSettings';
import { SystemSettings } from '@/components/siteguard/settings/SystemSettings';
import { useToast } from '@/hooks/use-toast';

const SiteGuardSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleSaveAll = () => {
    // This would save all settings across different tabs
    toast({
      title: "Settings saved",
      description: "All SiteGuard settings have been updated successfully.",
    });
    setHasUnsavedChanges(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/siteguard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to SiteGuard
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SiteGuard Settings</h1>
            <p className="text-muted-foreground">
              Configure monitoring, alerts, and system preferences
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleSaveAll}
          disabled={!hasUnsavedChanges}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save All Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>
            Manage cameras, alerts, network settings, and personnel configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cameras" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="cameras">Cameras</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
              <TabsTrigger value="personnel">Personnel</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>

            <TabsContent value="cameras" className="space-y-4">
              <CameraSettings onSettingsChange={() => setHasUnsavedChanges(true)} />
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <AlertSettings onSettingsChange={() => setHasUnsavedChanges(true)} />
            </TabsContent>

            <TabsContent value="network" className="space-y-4">
              <NetworkSettings onSettingsChange={() => setHasUnsavedChanges(true)} />
            </TabsContent>

            <TabsContent value="personnel" className="space-y-4">
              <PersonnelSettings onSettingsChange={() => setHasUnsavedChanges(true)} />
            </TabsContent>

            <TabsContent value="system" className="space-y-4">
              <SystemSettings onSettingsChange={() => setHasUnsavedChanges(true)} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteGuardSettings;