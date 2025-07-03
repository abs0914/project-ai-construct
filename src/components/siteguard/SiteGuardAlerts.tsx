import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield } from 'lucide-react';
import { SecurityAlert } from '@/hooks/useSiteGuardData';
import { format } from 'date-fns';

interface SiteGuardAlertsProps {
  alerts: SecurityAlert[];
  onResolveAlert: (alertId: string) => void;
}

export const SiteGuardAlerts: React.FC<SiteGuardAlertsProps> = ({
  alerts,
  onResolveAlert
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': 
      case 'critical': 
        return 'destructive';
      case 'medium': 
        return 'default';
      case 'low': 
        return 'secondary';
      default: 
        return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Alerts</CardTitle>
        <CardDescription>
          Security and safety alerts from the construction site
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">No active alerts</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(alert.created_at), 'MMM d, HH:mm')}
                    </p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {alert.alert_type}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getSeverityColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onResolveAlert(alert.id)}
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};