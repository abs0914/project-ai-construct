
"use client";

import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Calendar, MapPin, User, DollarSign } from "lucide-react";
import { mockProjects } from "@/lib/mock-data";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const project = mockProjects.find(p => p.id === id);

  if (!project) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-muted-foreground">Project not found</h1>
          <Button onClick={() => navigate("/project-management")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Active": return "default";
      case "Completed": return "secondary";
      case "Planning": return "outline";
      case "On Hold": return "destructive";
      default: return "outline";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/project-management")}
          className="hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
        <Button className="bg-accent hover:bg-accent/90">
          <Edit className="h-4 w-4 mr-2" />
          Edit Project
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">{project.name}</h1>
            <div className="flex items-center space-x-4 text-muted-foreground">
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{project.location}</span>
              </div>
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4" />
                <span>{project.client}</span>
              </div>
            </div>
          </div>
          <Badge variant={getStatusVariant(project.status)} className="text-sm">
            {project.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(project.budget)}
              </div>
              <p className="text-xs text-muted-foreground">Total Budget</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{project.progress}%</div>
              <p className="text-xs text-muted-foreground">Progress</p>
              <Progress value={project.progress} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{project.projectManager}</div>
              <p className="text-xs text-muted-foreground">Project Manager</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium">
                {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground">Timeline</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="initiation">Initiation</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="closure">Closure</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Overview</CardTitle>
              <CardDescription>
                General information and current status of the project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="text-foreground leading-relaxed">
                  {project.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="initiation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Initiation Phase</CardTitle>
              <CardDescription>
                Project initiation details and basic setup information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Project Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Client:</span>
                      <span className="font-medium">{project.client}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium">{project.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Manager:</span>
                      <span className="font-medium">{project.projectManager}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Timeline & Budget</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start Date:</span>
                      <span className="font-medium">{new Date(project.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End Date:</span>
                      <span className="font-medium">{new Date(project.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Budget:</span>
                      <span className="font-medium text-green-600">{formatCurrency(project.budget)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Planning Phase</CardTitle>
              <CardDescription>
                Detailed planning information including scope and risk assessment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Scope Statement</h4>
                <div className="prose max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    {project.scopeStatement || "No scope statement provided yet."}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Risk Assessment Summary</h4>
                <div className="prose max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    {project.riskAssessmentSummary || "No risk assessment provided yet."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closure" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Closure</CardTitle>
              <CardDescription>
                Lessons learned and project closure information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <h4 className="font-semibold mb-3">Lessons Learned</h4>
                <div className="prose max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    {project.lessonsLearned || "No lessons learned documented yet."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
