import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users } from 'lucide-react';
import { SitePersonnel } from '@/hooks/useSiteGuardData';
import { format } from 'date-fns';

interface SiteGuardPersonnelProps {
  personnel: SitePersonnel[];
}

export const SiteGuardPersonnel: React.FC<SiteGuardPersonnelProps> = ({
  personnel
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Personnel</CardTitle>
        <CardDescription>
          Currently checked-in workers and their locations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {personnel.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No personnel currently on-site</p>
            </div>
          ) : (
            personnel.map((person) => (
              <div key={person.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{person.name}</p>
                    <p className="text-sm text-muted-foreground">{person.role}</p>
                    <p className="text-xs text-muted-foreground">#{person.badge_number}</p>
                  </div>
                </div>
                <div className="text-right">
                  {person.location && (
                    <div className="flex items-center space-x-2 mb-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{person.location}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {person.check_in_time 
                        ? format(new Date(person.check_in_time), 'HH:mm')
                        : 'Not checked in'
                      }
                    </span>
                    <Badge variant={person.status === 'active' ? 'default' : 'secondary'}>
                      {person.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};