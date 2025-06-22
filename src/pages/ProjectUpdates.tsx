
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Filter, Eye, MessageSquare, Calendar, User, Upload } from "lucide-react";
import { mockProjectUpdates, mockProjects } from "@/lib/mock-data";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

export default function ProjectUpdates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUpdate, setNewUpdate] = useState({
    title: "",
    content: "",
    projectId: "",
    type: "general" as const,
    priority: "medium" as const,
  });

  const filteredUpdates = mockProjectUpdates.filter(update => {
    const matchesSearch = update.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         update.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         update.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || update.type === typeFilter;
    const matchesPriority = priorityFilter === "all" || update.priority === priorityFilter;
    return matchesSearch && matchesType && matchesPriority;
  });

  const getTypeVariant = (type: string) => {
    switch (type) {
      case "progress": return "default";
      case "milestone": return "secondary";
      case "issue": return "destructive";
      default: return "outline";
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const handleCreateUpdate = () => {
    if (!newUpdate.title || !newUpdate.content || !newUpdate.projectId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Project update created successfully!",
    });

    setNewUpdate({
      title: "",
      content: "",
      projectId: "",
      type: "general",
      priority: "medium",
    });
    setIsCreateDialogOpen(false);
  };

  const handleImageUpload = () => {
    toast({
      title: "Image Upload",
      description: "Image upload functionality would be implemented with actual backend.",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Project Updates</h1>
          <p className="text-muted-foreground">
            Stay updated with the latest progress, milestones, and issues across all projects.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" />
              New Update
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Project Update</DialogTitle>
              <DialogDescription>
                Share progress, milestones, or issues with your team.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="project">Project</Label>
                <Select value={newUpdate.projectId} onValueChange={(value) => setNewUpdate({...newUpdate, projectId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newUpdate.title}
                  onChange={(e) => setNewUpdate({...newUpdate, title: e.target.value})}
                  placeholder="Update title..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={newUpdate.content}
                  onChange={(e) => setNewUpdate({...newUpdate, content: e.target.value})}
                  placeholder="Share your update..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={newUpdate.type} onValueChange={(value: any) => setNewUpdate({...newUpdate, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="progress">Progress</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="issue">Issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newUpdate.priority} onValueChange={(value: any) => setNewUpdate({...newUpdate, priority: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Attachments</Label>
                <Button variant="outline" onClick={handleImageUpload} className="justify-start">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image (Simulated)
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateUpdate}>Create Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sticky Filter Bar */}
      <Card className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search updates, authors, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
                <SelectItem value="issue">Issue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Updates Feed */}
      <div className="space-y-4">
        {filteredUpdates.map((update) => {
          const project = mockProjects.find(p => p.id === update.projectId);
          return (
            <Link key={update.id} to={`/project-updates/${update.id}`}>
              <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getTypeVariant(update.type)}>
                          {update.type}
                        </Badge>
                        <Badge variant={getPriorityVariant(update.priority)}>
                          {update.priority}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{update.title}</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        {project?.name} • by {update.author}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">
                        {new Date(update.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3 mb-4">
                    {update.content}
                  </p>
                  {update.imageUrl && (
                    <div className="mb-4">
                      <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                        <span className="text-muted-foreground">Image Placeholder</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>View Details</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{update.author}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {filteredUpdates.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No updates found</h3>
              <p>Try adjusting your search criteria or create a new update.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
