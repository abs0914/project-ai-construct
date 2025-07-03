import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, UserCheck } from 'lucide-react';
import { useSiteGuardData } from '@/hooks/useSiteGuardData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PersonnelSettingsProps {
  onSettingsChange: () => void;
}

export const PersonnelSettings: React.FC<PersonnelSettingsProps> = ({ onSettingsChange }) => {
  const { personnel, refetch } = useSiteGuardData();
  const { toast } = useToast();
  const [newPerson, setNewPerson] = useState({
    name: '',
    role: '',
    badge_number: '',
    location: ''
  });

  const roles = [
    'Site Manager',
    'Safety Inspector',
    'Equipment Operator',
    'Foreman',
    'Construction Worker',
    'Security Guard',
    'Supervisor',
    'Engineer'
  ];

  const handleAddPerson = async () => {
    if (!newPerson.name || !newPerson.role || !newPerson.badge_number) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('site_personnel')
        .insert([{
          ...newPerson,
          status: 'checked_out'
        }]);

      if (error) throw error;

      toast({
        title: "Personnel added",
        description: `${newPerson.name} has been added successfully`,
      });

      setNewPerson({
        name: '',
        role: '',
        badge_number: '',
        location: ''
      });

      refetch.personnel();
      onSettingsChange();
    } catch (error) {
      console.error('Error adding personnel:', error);
      toast({
        title: "Error",
        description: "Failed to add personnel",
        variant: "destructive",
      });
    }
  };

  const handleDeletePerson = async (personId: string, personName: string) => {
    try {
      const { error } = await supabase
        .from('site_personnel')
        .delete()
        .eq('id', personId);

      if (error) throw error;

      toast({
        title: "Personnel removed",
        description: `${personName} has been removed`,
      });

      refetch.personnel();
      onSettingsChange();
    } catch (error) {
      console.error('Error deleting personnel:', error);
      toast({
        title: "Error",
        description: "Failed to remove personnel",
        variant: "destructive",
      });
    }
  };

  const handleCheckInOut = async (personId: string, currentStatus: string) => {
    const isCheckedIn = currentStatus === 'active';
    const newStatus = isCheckedIn ? 'checked_out' : 'active';
    const timestamp = new Date().toISOString();

    try {
      const updateData: any = { status: newStatus };
      
      if (isCheckedIn) {
        updateData.check_out_time = timestamp;
      } else {
        updateData.check_in_time = timestamp;
        updateData.check_out_time = null;
      }

      const { error } = await supabase
        .from('site_personnel')
        .update(updateData)
        .eq('id', personId);

      if (error) throw error;

      refetch.personnel();
      onSettingsChange();
    } catch (error) {
      console.error('Error updating check-in status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'break': return 'secondary';
      case 'emergency': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Personnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Personnel
          </CardTitle>
          <CardDescription>
            Register a new person for site access and monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="person-name">Full Name *</Label>
              <Input
                id="person-name"
                placeholder="John Smith"
                value={newPerson.name}
                onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="person-badge">Badge Number *</Label>
              <Input
                id="person-badge"
                placeholder="SM001"
                value={newPerson.badge_number}
                onChange={(e) => setNewPerson({ ...newPerson, badge_number: e.target.value })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="person-role">Role *</Label>
              <Select value={newPerson.role} onValueChange={(value) => setNewPerson({ ...newPerson, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="person-location">Default Location</Label>
              <Input
                id="person-location"
                placeholder="Building A"
                value={newPerson.location}
                onChange={(e) => setNewPerson({ ...newPerson, location: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={handleAddPerson} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Personnel
          </Button>
        </CardContent>
      </Card>

      {/* Existing Personnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registered Personnel ({personnel.length})
          </CardTitle>
          <CardDescription>
            Manage existing personnel and their access privileges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {personnel.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No personnel registered yet. Add your first person above.
              </p>
            ) : (
              personnel.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">{person.name}</h4>
                      <p className="text-sm text-muted-foreground">{person.role}</p>
                      <p className="text-xs text-muted-foreground">Badge: {person.badge_number}</p>
                      {person.location && (
                        <p className="text-xs text-muted-foreground">Location: {person.location}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getStatusColor(person.status || 'checked_out')}>
                        {person.status || 'checked_out'}
                      </Badge>
                      {person.check_in_time && person.status === 'active' && (
                        <Badge variant="outline">
                          Since {new Date(person.check_in_time).toLocaleTimeString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckInOut(person.id, person.status || 'checked_out')}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      {person.status === 'active' ? 'Check Out' : 'Check In'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeletePerson(person.id, person.name)}
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

      {/* Personnel Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Personnel Statistics</CardTitle>
          <CardDescription>Current site personnel overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {personnel.filter(p => p.status === 'active').length}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {personnel.filter(p => p.status === 'break').length}
              </div>
              <div className="text-sm text-muted-foreground">On Break</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {personnel.filter(p => p.status === 'checked_out').length}
              </div>
              <div className="text-sm text-muted-foreground">Checked Out</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {personnel.filter(p => p.status === 'emergency').length}
              </div>
              <div className="text-sm text-muted-foreground">Emergency</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
