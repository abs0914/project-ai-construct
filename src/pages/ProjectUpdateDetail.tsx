
"use client";

import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Trash2 } from "lucide-react";
import { mockProjectUpdates, mockProjects } from "@/lib/mock-data";
import { toast } from "@/components/ui/use-toast";

export default function ProjectUpdateDetail() {
  const { updateId } = useParams();
  const navigate = useNavigate();
  
  const update = mockProjectUpdates.find(u => u.id === updateId);
  const project = update ? mockProjects.find(p => p.id === update.projectId) : null;

  if (!update || !project) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-muted-foreground">Update not found</h1>
          <Button onClick={() => navigate("/project-updates")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Updates
          </Button>
        </div>
      </div>
    );
  }

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

  const handleDelete = () => {
    toast({
      title: "Update Deleted",
      description: "The project update has been deleted successfully.",
    });
    navigate("/project-updates");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/project-updates")}
          className="hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Updates
        </Button>
        <Button 
          variant="destructive" 
          onClick={handleDelete}
          className="hover:bg-destructive/90"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Update
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant={getTypeVariant(update.type)}>
                {update.type}
              </Badge>
              <Badge variant={getPriorityVariant(update.priority)}>
                {update.priority}
              </Badge>
            </div>
            <CardTitle className="text-2xl">{update.title}</CardTitle>
            <CardDescription className="flex items-center justify-between text-base">
              <span>Project: <strong>{project.name}</strong></span>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>{update.author}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(update.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose max-w-none">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {update.content}
            </p>
          </div>
          
          {update.imageUrl && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Attachments</h3>
              <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">Image Placeholder</span>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Project Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className="ml-2 font-medium">{project.status}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Manager:</span>
                <span className="ml-2 font-medium">{project.projectManager}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Location:</span>
                <span className="ml-2 font-medium">{project.location}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Progress:</span>
                <span className="ml-2 font-medium">{project.progress}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
