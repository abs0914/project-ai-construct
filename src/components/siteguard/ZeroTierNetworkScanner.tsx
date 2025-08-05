import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Network, 
  Search, 
  Camera, 
  Router, 
  Monitor,
  CheckCircle, 
  XCircle, 
  Loader2,
  Globe,
  Wifi
} from 'lucide-react';

interface NetworkDevice {
  ip: string;
  type: 'unknown' | 'router' | 'camera' | 'computer';
  status: 'online' | 'offline' | 'testing';
  services: string[];
  details?: any;
}

export const ZeroTierNetworkScanner: React.FC = () => {
  const [networkRange, setNetworkRange] = useState('172.30.0.0/16');
  const [knownIPs, setKnownIPs] = useState('172.30.195.39,172.30.118.15,172.30.185.59');
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [scanProgress, setScanProgress] = useState(0);

  const scanKnownIPs = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setDevices([]);

    const ips = knownIPs.split(',').map(ip => ip.trim()).filter(ip => ip);
    const foundDevices: NetworkDevice[] = [];

    for (let i = 0; i < ips.length; i++) {
      const ip = ips[i];
      setScanProgress(((i + 1) / ips.length) * 100);

      console.log(`Scanning ${ip}...`);
      
      const device: NetworkDevice = {
        ip,
        type: 'unknown',
        status: 'testing',
        services: []
      };

      foundDevices.push({ ...device });
      setDevices([...foundDevices]);

      // Test common camera ports
      const tests = [
        { port: 554, service: 'RTSP', type: 'camera' },
        { port: 80, service: 'HTTP', type: 'camera' },
        { port: 8080, service: 'HTTP-Alt', type: 'camera' },
        { port: 22, service: 'SSH', type: 'router' },
        { port: 443, service: 'HTTPS', type: 'router' }
      ];

      let deviceOnline = false;
      const services: string[] = [];

      for (const test of tests) {
        try {
          // Test if port is open (this is a simplified test)
          const testUrl = test.port === 80 ? `http://${ip}` : 
                         test.port === 443 ? `https://${ip}` : 
                         `http://${ip}:${test.port}`;
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          try {
            const response = await fetch(testUrl, {
              method: 'HEAD',
              mode: 'no-cors',
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            services.push(test.service);
            deviceOnline = true;
            
            if (test.type === 'camera' && device.type === 'unknown') {
              device.type = 'camera';
            } else if (test.type === 'router' && device.type === 'unknown') {
              device.type = 'router';
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            // Port might be closed or filtered
          }
        } catch (error) {
          // Network error
        }
      }

      // Test RTSP specifically for cameras
      if (device.type === 'camera' || device.type === 'unknown') {
        try {
          // Try to connect to RTSP port
          const rtspTest = await testRTSPConnection(ip);
          if (rtspTest.success) {
            services.push('RTSP-Verified');
            device.type = 'camera';
            device.details = rtspTest.details;
            deviceOnline = true;
          }
        } catch (error) {
          // RTSP test failed
        }
      }

      device.status = deviceOnline ? 'online' : 'offline';
      device.services = services;

      // Update the device in the list
      const updatedDevices = foundDevices.map(d => 
        d.ip === ip ? device : d
      );
      setDevices(updatedDevices);
    }

    setIsScanning(false);
    setScanProgress(100);
  };

  const testRTSPConnection = async (ip: string): Promise<{success: boolean, details?: any}> => {
    // This is a simplified RTSP test - in reality, you'd need a proper RTSP client
    // For now, we'll just test if the RTSP port responds
    try {
      const response = await fetch(`https://api.aiconstructpro.com/api/media/test-rtsp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip,
          port: 554,
          timeout: 5000
        })
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, details: result };
      }
    } catch (error) {
      // API not available, that's okay
    }

    return { success: false };
  };

  const testCameraConnection = async (ip: string) => {
    try {
      // Test common V380 RTSP URLs
      const testUrls = [
        `rtsp://admin:password@${ip}:554/stream1`,
        `rtsp://admin:admin@${ip}:554/stream1`,
        `rtsp://admin:123456@${ip}:554/stream1`,
        `rtsp://admin:@${ip}:554/stream1`
      ];

      for (const rtspUrl of testUrls) {
        console.log(`Testing RTSP URL: ${rtspUrl.replace(/\/\/.*:.*@/, '//***:***@')}`);
        
        // This would test the actual RTSP connection
        // For now, just log the attempt
      }
    } catch (error) {
      console.error('Camera test failed:', error);
    }
  };

  const getDeviceIcon = (device: NetworkDevice) => {
    switch (device.type) {
      case 'camera': return <Camera className="w-4 h-4" />;
      case 'router': return <Router className="w-4 h-4" />;
      case 'computer': return <Monitor className="w-4 h-4" />;
      default: return <Network className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Online</Badge>;
      case 'offline':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Offline</Badge>;
      case 'testing':
        return <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Testing</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          ZeroTier Network Scanner
          <Badge variant="outline">Device Discovery</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Network className="h-4 w-4" />
          <AlertDescription>
            This tool helps you discover what devices are connected to your ZeroTier network.
            It will test the IPs you provided to see if they respond and what services they're running.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="networkRange">Network Range (for future scanning)</Label>
            <Input
              id="networkRange"
              value={networkRange}
              onChange={(e) => setNetworkRange(e.target.value)}
              placeholder="172.30.0.0/16"
              disabled
            />
          </div>
          <div>
            <Label htmlFor="knownIPs">Known ZeroTier IPs (comma-separated)</Label>
            <Input
              id="knownIPs"
              value={knownIPs}
              onChange={(e) => setKnownIPs(e.target.value)}
              placeholder="172.30.195.39,172.30.118.15,172.30.185.59"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={scanKnownIPs} 
            disabled={isScanning}
            className="flex-1"
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            Scan Known IPs
          </Button>
        </div>

        {isScanning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Scanning progress...</span>
              <span>{Math.round(scanProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {devices.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Discovered Devices:</h4>
            {devices.map((device, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(device)}
                    <span className="font-medium">{device.ip}</span>
                    <Badge variant="outline">{device.type}</Badge>
                  </div>
                  {getStatusBadge(device.status)}
                </div>
                
                {device.services.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {device.services.map((service, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                )}

                {device.type === 'camera' && device.status === 'online' && (
                  <div className="mt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => testCameraConnection(device.ip)}
                    >
                      <Camera className="w-3 h-3 mr-1" />
                      Test Camera Connection
                    </Button>
                  </div>
                )}

                {device.details && (
                  <div className="mt-2 text-xs text-gray-600">
                    <pre>{JSON.stringify(device.details, null, 2)}</pre>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
