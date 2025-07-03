import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { AlertTriangle, Bell, Mail, MessageSquare } from 'lucide-react';

interface AlertSettingsProps {
  onSettingsChange: () => void;
}

export const AlertSettings: React.FC<AlertSettingsProps> = ({ onSettingsChange }) => {
  const [alertConfig, setAlertConfig] = useState({
    motionSensitivity: [70],
    enableEmailAlerts: true,
    enableSMSAlerts: false,
    enablePushNotifications: true,
    alertCooldown: 300, // 5 minutes
    emergencyContacts: ['supervisor@site.com'],
    alertTypes: {
      motion: true,
      intrusion: true,
      equipment: true,
      safety: true,
      security: true
    }
  });

  const handleConfigChange = (key: string, value: any) => {
    setAlertConfig(prev => ({ ...prev, [key]: value }));
    onSettingsChange();
  };

  const handleAlertTypeChange = (type: string, enabled: boolean) => {
    setAlertConfig(prev => ({
      ...prev,
      alertTypes: { ...prev.alertTypes, [type]: enabled }
    }));
    onSettingsChange();
  };

  return (
    <div className="space-y-6">
      {/* Alert Sensitivity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Detection Sensitivity
          </CardTitle>
          <CardDescription>
            Configure motion detection and alert thresholds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Motion Detection Sensitivity</Label>
            <div className="px-3 py-4">
              <Slider
                value={alertConfig.motionSensitivity}
                onValueChange={(value) => handleConfigChange('motionSensitivity', value)}
                max={100}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>Low (1)</span>
                <span>Current: {alertConfig.motionSensitivity[0]}%</span>
                <span>High (100)</span>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="alert-cooldown">Alert Cooldown (seconds)</Label>
            <Input
              id="alert-cooldown"
              type="number"
              value={alertConfig.alertCooldown}
              onChange={(e) => handleConfigChange('alertCooldown', parseInt(e.target.value))}
              placeholder="300"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Minimum time between alerts for the same camera
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alert Types */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Types</CardTitle>
          <CardDescription>
            Enable or disable specific types of security alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(alertConfig.alertTypes).map(([type, enabled]) => (
              <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="capitalize font-medium">{type} Detection</Label>
                  <p className="text-sm text-muted-foreground">
                    {type === 'motion' && 'General movement detection'}
                    {type === 'intrusion' && 'Unauthorized area access'}
                    {type === 'equipment' && 'Equipment tampering alerts'}
                    {type === 'safety' && 'Safety violation detection'}
                    {type === 'security' && 'Security breach alerts'}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => handleAlertTypeChange(type, checked)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notification Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Methods
          </CardTitle>
          <CardDescription>
            Configure how you want to receive alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Send alerts via email</p>
              </div>
            </div>
            <Switch
              checked={alertConfig.enableEmailAlerts}
              onCheckedChange={(checked) => handleConfigChange('enableEmailAlerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Send alerts via SMS</p>
              </div>
            </div>
            <Switch
              checked={alertConfig.enableSMSAlerts}
              onCheckedChange={(checked) => handleConfigChange('enableSMSAlerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Browser/app notifications</p>
              </div>
            </div>
            <Switch
              checked={alertConfig.enablePushNotifications}
              onCheckedChange={(checked) => handleConfigChange('enablePushNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contacts</CardTitle>
          <CardDescription>
            Manage who receives critical security alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {alertConfig.emergencyContacts.map((contact, index) => (
            <div key={index} className="flex gap-2">
              <Input value={contact} placeholder="Email or phone number" />
              <Button variant="outline" size="sm">Remove</Button>
            </div>
          ))}
          <Button variant="outline" className="w-full">Add Contact</Button>
        </CardContent>
      </Card>
    </div>
  );
};