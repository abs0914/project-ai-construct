import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings, Database, HardDrive, Clock, Shield, Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SystemSettingsProps {
  onSettingsChange: () => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ onSettingsChange }) => {
  const { toast } = useToast();
  const [systemConfig, setSystemConfig] = useState({
    recordingRetention: 30, // days
    automaticBackup: true,
    backupLocation: 'cloud',
    dataCompression: true,
    systemLogs: true,
    autoUpdate: false,
    maintenanceMode: false,
    dataExportFormat: 'csv',
    timezone: 'UTC',
    language: 'en'
  });

  const handleConfigChange = (key: string, value: any) => {
    setSystemConfig(prev => ({ ...prev, [key]: value }));
    onSettingsChange();
  };

  const handleExportData = () => {
    toast({
      title: "Export started",
      description: "System data export has been initiated",
    });
  };

  const handleImportData = () => {
    toast({
      title: "Import ready",
      description: "Please select a file to import system data",
    });
  };

  const handleSystemBackup = () => {
    toast({
      title: "Backup started",
      description: "Full system backup is in progress",
    });
  };

  return (
    <div className="space-y-6">
      {/* Storage & Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage & Data Management
          </CardTitle>
          <CardDescription>
            Configure data retention, backup, and storage settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="retention-days">Recording Retention (days)</Label>
            <Input
              id="retention-days"
              type="number"
              value={systemConfig.recordingRetention}
              onChange={(e) => handleConfigChange('recordingRetention', parseInt(e.target.value))}
              placeholder="30"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Recordings older than this will be automatically deleted
            </p>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Automatic Backup</Label>
                <p className="text-sm text-muted-foreground">Automatically backup system data</p>
              </div>
            </div>
            <Switch
              checked={systemConfig.automaticBackup}
              onCheckedChange={(checked) => handleConfigChange('automaticBackup', checked)}
            />
          </div>

          <div>
            <Label htmlFor="backup-location">Backup Location</Label>
            <Select value={systemConfig.backupLocation} onValueChange={(value) => handleConfigChange('backupLocation', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cloud">Cloud Storage</SelectItem>
                <SelectItem value="local">Local Storage</SelectItem>
                <SelectItem value="external">External Drive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Data Compression</Label>
                <p className="text-sm text-muted-foreground">Compress recordings to save space</p>
              </div>
            </div>
            <Switch
              checked={systemConfig.dataCompression}
              onCheckedChange={(checked) => handleConfigChange('dataCompression', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Maintenance
          </CardTitle>
          <CardDescription>
            System logging, updates, and maintenance configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>System Logs</Label>
                <p className="text-sm text-muted-foreground">Enable detailed system logging</p>
              </div>
            </div>
            <Switch
              checked={systemConfig.systemLogs}
              onCheckedChange={(checked) => handleConfigChange('systemLogs', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Automatic Updates</Label>
                <p className="text-sm text-muted-foreground">Install system updates automatically</p>
              </div>
            </div>
            <Switch
              checked={systemConfig.autoUpdate}
              onCheckedChange={(checked) => handleConfigChange('autoUpdate', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">Disable monitoring for maintenance</p>
              </div>
            </div>
            <Switch
              checked={systemConfig.maintenanceMode}
              onCheckedChange={(checked) => handleConfigChange('maintenanceMode', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Export/Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Export and import system data and configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="export-format">Export Format</Label>
            <Select value={systemConfig.dataExportFormat} onValueChange={(value) => handleConfigChange('dataExportFormat', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="xml">XML</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleExportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button onClick={handleImportData} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Button>
          </div>

          <Separator />

          <Button onClick={handleSystemBackup} className="w-full">
            <Database className="h-4 w-4 mr-2" />
            Create Full System Backup
          </Button>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Regional Settings
          </CardTitle>
          <CardDescription>
            Configure timezone, language, and regional preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={systemConfig.timezone} onValueChange={(value) => handleConfigChange('timezone', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                <SelectItem value="America/Chicago">Central Time</SelectItem>
                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                <SelectItem value="Europe/London">London</SelectItem>
                <SelectItem value="Europe/Paris">Paris</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="language">Language</Label>
            <Select value={systemConfig.language} onValueChange={(value) => handleConfigChange('language', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};