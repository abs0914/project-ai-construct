
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Clock, AlertTriangle, FileText, Calendar } from "lucide-react";
import { mockProjects, mockComplianceItems } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

export default function ComplianceTracker() {
  const [selectedProject, setSelectedProject] = useState("1");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  const selectedProjectData = mockProjects.find(p => p.id === selectedProject);
  const complianceItems = mockComplianceItems.filter(item => item.projectId === selectedProject);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "submitted": return <Clock className="h-4 w-4 text-blue-600" />;
      case "in-progress": return <Clock className="h-4 w-4 text-orange-600" />;
      case "not-started": return <AlertTriangle className="h-4 w-4 text-gray-400" />;
      case "rejected": return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "submitted": return <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>;
      case "in-progress": return <Badge className="bg-orange-100 text-orange-800">In Progress</Badge>;
      case "not-started": return <Badge variant="outline">Not Started</Badge>;
      case "rejected": return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === "approved") return false;
    return new Date(dueDate) < new Date();
  };

  const handleUpdateStatus = (itemId: string, newStatus: string) => {
    toast({
      title: "Status Updated",
      description: "Compliance item status has been updated successfully.",
    });
  };

  const handleSaveNotes = (itemId: string) => {
    setEditingItem(null);
    toast({
      title: "Notes Saved",
      description: "Compliance item notes have been updated.",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">Compliance Tracker</h1>
        <p className="text-muted-foreground">
          Track and manage regulatory compliance requirements for your construction projects.
        </p>
      </div>

      {/* Project Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Select Project:</label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Choose a project" />
              </SelectTrigger>
              <SelectContent>
                {mockProjects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedProjectData && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium">{selectedProjectData.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedProjectData.location}</p>
              <p className="text-sm text-muted-foreground">Manager: {selectedProjectData.projectManager}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {complianceItems.filter(item => item.status === "approved").length}
                </div>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {complianceItems.filter(item => item.status === "in-progress").length}
                </div>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {complianceItems.filter(item => isOverdue(item.dueDate, item.status)).length}
                </div>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold text-primary">
                  {complianceItems.length}
                </div>
                <p className="text-xs text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Items */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Requirements</CardTitle>
          <CardDescription>
            Manage compliance documents and track their status throughout the project lifecycle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {complianceItems.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(item.status)}
                      <div className="text-left">
                        <div className="font-medium">{item.documentType}</div>
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 mr-4">
                      {isOverdue(item.dueDate, item.status) && (
                        <Badge variant="destructive" className="text-xs">Overdue</Badge>
                      )}
                      {getStatusBadge(item.status)}
                      <div className="text-sm text-muted-foreground">
                        Due: {new Date(item.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Required By</label>
                        <p className="text-sm text-muted-foreground">{item.requiredBy}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Assignee</label>
                        <p className="text-sm text-muted-foreground">{item.assignee}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Due Date</label>
                        <p className="text-sm text-muted-foreground flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(item.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <div className="mt-1">
                          <Select 
                            value={item.status} 
                            onValueChange={(value) => handleUpdateStatus(item.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not-started">Not Started</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="submitted">Submitted</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium">Notes</label>
                        {editingItem === item.id ? (
                          <Button 
                            size="sm" 
                            onClick={() => handleSaveNotes(item.id)}
                          >
                            Save
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setEditingItem(item.id);
                              setNotes({...notes, [item.id]: item.notes});
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                      {editingItem === item.id ? (
                        <Textarea
                          value={notes[item.id] || item.notes}
                          onChange={(e) => setNotes({...notes, [item.id]: e.target.value})}
                          placeholder="Add notes about this compliance requirement..."
                          className="min-h-[100px]"
                        />
                      ) : (
                        <div className="p-3 bg-muted/50 rounded-lg min-h-[100px]">
                          <p className="text-sm text-muted-foreground">
                            {item.notes || "No notes added yet."}
                          </p>
                        </div>
                      )}
                    </div>

                    {(item.submissionDate || item.approvalDate) && (
                      <div className="grid gap-4 md:grid-cols-2 pt-2 border-t">
                        {item.submissionDate && (
                          <div>
                            <label className="text-sm font-medium">Submission Date</label>
                            <p className="text-sm text-muted-foreground">
                              {new Date(item.submissionDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {item.approvalDate && (
                          <div>
                            <label className="text-sm font-medium">Approval Date</label>
                            <p className="text-sm text-muted-foreground">
                              {new Date(item.approvalDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
