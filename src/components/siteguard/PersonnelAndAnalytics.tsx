import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteGuardPersonnel } from './SiteGuardPersonnel';
import { SiteGuardAnalytics } from './SiteGuardAnalytics';
import { Camera, VpnRouter, SecurityAlert, SitePersonnel } from '@/hooks/useSiteGuardData';
import { Users, BarChart3, Clock, UserCheck } from 'lucide-react';

interface PersonnelAndAnalyticsProps {
  cameras: Camera[];
  routers: VpnRouter[];
  alerts: SecurityAlert[];
  personnel: SitePersonnel[];
}

export const PersonnelAndAnalytics: React.FC<PersonnelAndAnalyticsProps> = ({
  cameras,
  routers,
  alerts,
  personnel
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const activePersonnel = personnel.filter(p => p.status === 'active').length;
  const totalPersonnel = personnel.length;
  const checkedInToday = personnel.filter(p => {
    if (!p.check_in_time) return false;
    const today = new Date().toDateString();
    const checkInDate = new Date(p.check_in_time).toDateString();
    return today === checkInDate;
  }).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Personnel</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePersonnel}</div>
            <p className="text-xs text-muted-foreground">Currently on site</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Personnel</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPersonnel}</div>
            <p className="text-xs text-muted-foreground">Registered workers</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checkedInToday}</div>
            <p className="text-xs text-muted-foreground">Today's attendance</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Good</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personnel">Personnel Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card className="animate-scale-in">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest personnel check-ins and site events</CardDescription>
              </CardHeader>
              <CardContent>
                {personnel.slice(0, 5).length > 0 ? (
                  <div className="space-y-3">
                    {personnel
                      .filter(p => p.check_in_time)
                      .sort((a, b) => new Date(b.check_in_time!).getTime() - new Date(a.check_in_time!).getTime())
                      .slice(0, 5)
                      .map((person) => (
                        <div key={person.id} className="flex items-center justify-between p-2 border rounded hover-scale transition-all duration-200">
                          <div className="flex items-center space-x-2">
                            <UserCheck className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-sm font-medium">{person.name}</p>
                              <p className="text-xs text-muted-foreground">{person.role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {person.check_in_time && new Date(person.check_in_time).toLocaleTimeString()}
                            </p>
                            <p className="text-xs text-muted-foreground">{person.location}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Summary */}
            <Card className="animate-scale-in">
              <CardHeader>
                <CardTitle>System Summary</CardTitle>
                <CardDescription>Overall system performance and status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded hover-scale transition-all duration-200">
                    <div className="text-2xl font-bold text-blue-600">{cameras.length}</div>
                    <p className="text-xs text-muted-foreground">Cameras</p>
                  </div>
                  <div className="text-center p-3 border rounded hover-scale transition-all duration-200">
                    <div className="text-2xl font-bold text-green-600">{routers.length}</div>
                    <p className="text-xs text-muted-foreground">Routers</p>
                  </div>
                  <div className="text-center p-3 border rounded hover-scale transition-all duration-200">
                    <div className="text-2xl font-bold text-yellow-600">{alerts.length}</div>
                    <p className="text-xs text-muted-foreground">Alerts</p>
                  </div>
                  <div className="text-center p-3 border rounded hover-scale transition-all duration-200">
                    <div className="text-2xl font-bold text-purple-600">{personnel.length}</div>
                    <p className="text-xs text-muted-foreground">Personnel</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="personnel" className="space-y-4">
          <SiteGuardPersonnel personnel={personnel} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <SiteGuardAnalytics
            cameras={cameras}
            routers={routers}
            alerts={alerts}
            personnel={personnel}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};