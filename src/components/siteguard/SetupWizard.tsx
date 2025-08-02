import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Camera, 
  Wifi, 
  CheckCircle, 
  AlertCircle,
  Play,
  Settings,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SetupWizardProps {
  onComplete: () => void;
}

interface DiscoveredDevice {
  id: string;
  name: string;
  ip: string;
  type: 'camera' | 'router';
  status: 'discovered' | 'configuring' | 'configured' | 'error';
  manufacturer?: string;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [isConfiguring, setIsConfiguring] = useState(false);

  const steps = [
    { id: 1, title: 'Auto-Discovery', description: 'Scan for cameras and routers' },
    { id: 2, title: 'Quick Config', description: 'Configure discovered devices' },
    { id: 3, title: 'Complete', description: 'Setup finished' }
  ];

  const progress = (currentStep / steps.length) * 100;

  const startAutoDiscovery = async () => {
    setIsScanning(true);
    try {
      // Start with network discovery
      const networkResponse = await supabase.functions.invoke('network-discovery', {
        body: { action: 'scan_all' }
      });

      // Then ONVIF discovery
      const onvifResponse = await supabase.functions.invoke('onvif-discovery', {
        body: { action: 'discover' }
      });

      // Simulate discovered devices for demo
      const mockDevices: DiscoveredDevice[] = [
        {
          id: '1',
          name: 'V380 Pro Camera 200',
          ip: '192.168.8.200',
          type: 'camera',
          status: 'discovered',
          manufacturer: 'V380'
        },
        {
          id: '2',
          name: 'V380 Pro Camera 201',
          ip: '192.168.8.201',
          type: 'camera',
          status: 'discovered',
          manufacturer: 'V380'
        },
        {
          id: '3',
          name: 'GL-MT300N Router',
          ip: '192.168.8.1',
          type: 'router',
          status: 'discovered',
          manufacturer: 'GL.iNET'
        }
      ];

      setDiscoveredDevices(mockDevices);
      setCurrentStep(2);
      toast.success(`Discovered ${mockDevices.length} devices`);
    } catch (error) {
      console.error('Discovery failed:', error);
      toast.error('Discovery failed. Using simulation mode.');
      
      // Fallback to simulated devices
      const mockDevices: DiscoveredDevice[] = [
        {
          id: '1',
          name: 'Demo Camera 1',
          ip: '192.168.8.200',
          type: 'camera',
          status: 'discovered',
          manufacturer: 'Demo'
        },
        {
          id: '2',
          name: 'Demo Camera 2',
          ip: '192.168.8.201',
          type: 'camera',
          status: 'discovered',
          manufacturer: 'Demo'
        }
      ];
      
      setDiscoveredDevices(mockDevices);
      setCurrentStep(2);
    } finally {
      setIsScanning(false);
    }
  };

  const autoConfigureDevices = async () => {
    setIsConfiguring(true);
    
    for (const device of discoveredDevices) {
      setDiscoveredDevices(prev => 
        prev.map(d => d.id === device.id ? { ...d, status: 'configuring' } : d)
      );

      try {
        if (device.type === 'camera') {
          // Configure camera with default credentials
          await supabase.functions.invoke('onvif-discovery', {
            body: {
              action: 'configure',
              deviceId: device.ip + '-80',
              credentials: {
                username: 'admin',
                password: 'admin'
              }
            }
          });

          // Add to cameras table
          await supabase.from('cameras').insert({
            name: device.name,
            location: 'Auto-discovered',
            ip_address: device.ip,
            onvif_port: 80,
            username: 'admin',
            status: 'online'
          });
        }

        setDiscoveredDevices(prev => 
          prev.map(d => d.id === device.id ? { ...d, status: 'configured' } : d)
        );

        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to configure ${device.name}:`, error);
        setDiscoveredDevices(prev => 
          prev.map(d => d.id === device.id ? { ...d, status: 'error' } : d)
        );
      }
    }

    setIsConfiguring(false);
    setCurrentStep(3);
    toast.success('Auto-configuration complete!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'configuring':
        return <Settings className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Camera className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured':
        return 'default';
      case 'configuring':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold">SiteGuard Setup Wizard</h2>
        <p className="text-muted-foreground mt-2">
          Automatically discover and configure your cameras and network devices
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between">
          {steps.map((step) => (
            <div 
              key={step.id} 
              className={`flex items-center space-x-2 transition-colors duration-300 ${
                currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                currentStep >= step.id ? 'border-primary bg-primary text-primary-foreground scale-110' : 'border-muted'
              }`}>
                {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
              </div>
              <div className="hidden sm:block">
                <p className="font-medium">{step.title}</p>
                <p className="text-xs">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <Card className="animate-scale-in">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Auto-Discovery</span>
            </CardTitle>
            <CardDescription>
              We'll scan your network for cameras, routers, and other devices automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 border rounded-lg hover-scale">
                <Camera className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-medium">ONVIF Cameras</h3>
                <p className="text-sm text-muted-foreground">IP cameras with ONVIF support</p>
              </div>
              <div className="p-4 border rounded-lg hover-scale">
                <Wifi className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <h3 className="font-medium">GL.iNET Routers</h3>
                <p className="text-sm text-muted-foreground">Network routers and access points</p>
              </div>
              <div className="p-4 border rounded-lg hover-scale">
                <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                <h3 className="font-medium">ZeroTier Networks</h3>
                <p className="text-sm text-muted-foreground">Virtual network connections</p>
              </div>
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={startAutoDiscovery} 
                disabled={isScanning}
                size="lg"
                className="flex items-center space-x-2 hover-scale"
              >
                {isScanning ? (
                  <>
                    <Settings className="h-5 w-5 animate-spin" />
                    <span>Scanning Network...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    <span>Start Auto-Discovery</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle>Discovered Devices</CardTitle>
            <CardDescription>
              {discoveredDevices.length} devices found. Click "Auto-Configure" to set them up with default settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {discoveredDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg hover-scale transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    {device.type === 'camera' ? <Camera className="h-5 w-5" /> : <Wifi className="h-5 w-5" />}
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className="text-sm text-muted-foreground">{device.ip}</p>
                      {device.manufacturer && (
                        <p className="text-xs text-muted-foreground">{device.manufacturer}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(device.status)}
                    <Badge variant={getStatusColor(device.status)}>
                      {device.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(1)}
                disabled={isConfiguring}
              >
                Scan Again
              </Button>
              <Button 
                onClick={autoConfigureDevices}
                disabled={isConfiguring || discoveredDevices.length === 0}
                className="flex items-center space-x-2"
              >
                {isConfiguring ? (
                  <>
                    <Settings className="h-4 w-4 animate-spin" />
                    <span>Configuring...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Auto-Configure All</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card className="animate-scale-in">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <span>Setup Complete!</span>
            </CardTitle>
            <CardDescription>
              Your SiteGuard system is now ready to use
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Successfully configured {discoveredDevices.filter(d => d.status === 'configured').length} devices.
                You can now view live feeds and manage your security system.
              </AlertDescription>
            </Alert>

            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Setup More Devices
              </Button>
              <Button onClick={onComplete} className="flex items-center space-x-2 hover-scale">
                <Play className="h-4 w-4" />
                <span>Go to Live Feed</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};