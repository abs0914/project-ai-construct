
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Video, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Users, 
  Camera,
  Activity,
  Settings,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

const SiteGuard = () => {
  const [selectedCamera, setSelectedCamera] = useState("camera-1");
  const [isRecording, setIsRecording] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState(3);

  // Mock data for cameras
  const cameras = [
    { id: "camera-1", name: "Main Entrance", location: "Gate A", status: "online", recording: true },
    { id: "camera-2", name: "Construction Zone 1", location: "Building A", status: "online", recording: true },
    { id: "camera-3", name: "Equipment Storage", location: "Yard B", status: "offline", recording: false },
    { id: "camera-4", name: "Worker Rest Area", location: "Building C", status: "online", recording: false },
  ];

  // Mock data for alerts
  const recentAlerts = [
    { id: 1, type: "security", message: "Unauthorized access detected at Gate B", time: "2 min ago", severity: "high" },
    { id: 2, type: "safety", message: "Worker without helmet in Zone 3", time: "15 min ago", severity: "medium" },
    { id: 3, type: "equipment", message: "Excavator left running unattended", time: "1 hour ago", severity: "low" },
  ];

  // Mock data for personnel
  const activePersonnel = [
    { id: 1, name: "John Smith", role: "Site Manager", location: "Building A", checkIn: "07:30", status: "active" },
    { id: 2, name: "Maria Garcia", role: "Safety Inspector", location: "Zone 2", checkIn: "08:00", status: "active" },
    { id: 3, name: "David Chen", role: "Equipment Operator", location: "Yard B", checkIn: "07:45", status: "break" },
    { id: 4, name: "Sarah Wilson", role: "Foreman", location: "Building C", checkIn: "07:15", status: "active" },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SiteGuard</h1>
          <p className="text-muted-foreground">
            Construction site monitoring and security system
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={activeAlerts > 0 ? "destructive" : "secondary"}>
            {activeAlerts} Active Alerts
          </Badge>
          <Button>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cameras</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3/4</div>
            <p className="text-xs text-muted-foreground">
              1 camera offline
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personnel On-Site</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +2 from yesterday
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Secure</div>
            <p className="text-xs text-muted-foreground">
              All zones monitored
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts Today</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">
              3 pending review
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="live-feed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="live-feed">Live Feed</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="personnel">Personnel</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="live-feed" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Camera Feed</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant={isRecording ? "destructive" : "default"}
                        onClick={() => setIsRecording(!isRecording)}
                      >
                        {isRecording ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                    <div className="text-center">
                      <Camera className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-500">Live camera feed would appear here</p>
                      <p className="text-sm text-slate-400">Camera: {cameras.find(c => c.id === selectedCamera)?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cameras.map((camera) => (
                          <SelectItem key={camera.id} value={camera.id}>
                            {camera.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-gray-400'}`} />
                      <span className="text-sm text-muted-foreground">
                        {isRecording ? 'Recording' : 'Not Recording'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Camera Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cameras.map((camera) => (
                      <div key={camera.id} className="flex items-center justify-between p-2 rounded-lg border">
                        <div>
                          <p className="font-medium">{camera.name}</p>
                          <p className="text-sm text-muted-foreground">{camera.location}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(camera.status)}`} />
                          <span className="text-sm capitalize">{camera.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>
                Security and safety alerts from the construction site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-muted-foreground">{alert.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Personnel</CardTitle>
              <CardDescription>
                Currently checked-in workers and their locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activePersonnel.map((person) => (
                  <div key={person.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-muted-foreground">{person.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{person.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Check-in: {person.checkIn}</span>
                        <Badge variant={person.status === 'active' ? 'default' : 'secondary'}>
                          {person.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Security Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Daily Check-ins</span>
                    <span className="font-medium">24</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Security Incidents</span>
                    <span className="font-medium">2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Camera Uptime</span>
                    <span className="font-medium">98.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Response Time (Avg)</span>
                    <span className="font-medium">3.2 min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Safety Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Safety Violations</span>
                    <span className="font-medium">1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PPE Compliance</span>
                    <span className="font-medium">96%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zone Restrictions</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Equipment Alerts</span>
                    <span className="font-medium">3</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SiteGuard;
