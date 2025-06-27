
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Filter, Eye, Edit, Trash2 } from "lucide-react";
import { mockProjects } from "@/lib/mock-data";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function ProjectManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingProject, setEditingProject] = useState<any>(null);
  const { toast } = useToast();
  
  const filteredProjects = mockProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.projectManager.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Active": return "default";
      case "Completed": return "secondary";
      case "Planning": return "outline";
      case "On Hold": return "destructive";
      default: return "outline";
    }
  };

  const handleEditProject = (project: any) => {
    setEditingProject({ ...project });
  };

  const handleSaveProject = () => {
    // Here you would typically save to your backend
    toast({
      title: "Project Updated",
      description: "Project details have been updated successfully.",
    });
    setEditingProject(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Project Management</h1>
          <p className="text-muted-foreground">
            Manage and monitor all construction projects across different phases.
          </p>
        </div>
        <Link to="/project-management/create">
          <Button className="bg-accent hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects, locations, or managers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Initiation">Initiation</SelectItem>
                <SelectItem value="Planning">Planning</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge variant={getStatusVariant(project.status)}>
                    {project.status}
                  </Badge>
                </div>
                <div className="flex space-x-1">
                  <Link to={`/project-management/${project.id}`}>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => handleEditProject(project)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription className="line-clamp-2">
                {project.description}
              </CardDescription>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Manager:</span>
                  <span className="font-medium">{project.projectManager}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">{project.location}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-medium text-green-600">{formatCurrency(project.budget)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Timeline:</span>
                  <span className="font-medium">
                    {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Client: {project.client}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No projects found</h3>
              <p>Try adjusting your search criteria or create a new project.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project details and information.
            </DialogDescription>
          </DialogHeader>
          {editingProject && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingProject.description}
                  onChange={(e) => setEditingProject({...editingProject, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={editingProject.status} onValueChange={(value) => setEditingProject({...editingProject, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Initiation">Initiation</SelectItem>
                    <SelectItem value="Planning">Planning</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager">Project Manager</Label>
                <Input
                  id="manager"
                  value={editingProject.projectManager}
                  onChange={(e) => setEditingProject({...editingProject, projectManager: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={editingProject.location}
                  onChange={(e) => setEditingProject({...editingProject, location: e.target.value})}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingProject(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProject}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
