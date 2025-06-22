
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, Shield, GraduationCap, Calendar, Eye } from "lucide-react";
import { mockSafetyIncidents, mockWorkerCertifications, mockSafetyTrainingRecords } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

export default function SafetyCompliance() {
  const [activeTab, setActiveTab] = useState("incidents");
  const { toast } = useToast();

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return <Badge className="bg-red-600 text-white">Critical</Badge>;
      case "major": return <Badge className="bg-orange-600 text-white">Major</Badge>;
      case "moderate": return <Badge className="bg-yellow-600 text-white">Moderate</Badge>;
      case "minor": return <Badge className="bg-green-600 text-white">Minor</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved": return <Badge className="bg-green-100 text-green-800">Resolved</Badge>;
      case "investigating": return <Badge className="bg-orange-100 text-orange-800">Investigating</Badge>;
      case "reported": return <Badge className="bg-blue-100 text-blue-800">Reported</Badge>;
      case "closed": return <Badge className="bg-gray-100 text-gray-800">Closed</Badge>;
      case "active": return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "expired": return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
      case "suspended": return <Badge className="bg-orange-100 text-orange-800">Suspended</Badge>;
      case "completed": return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "in-progress": return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case "failed": return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateIncident = () => {
    toast({
      title: "Safety Incident Reported",
      description: "The safety incident has been logged and relevant teams have been notified.",
    });
  };

  const handleCreateCertification = () => {
    toast({
      title: "Certification Added",
      description: "Worker certification has been added to the system.",
    });
  };

  const handleCreateTraining = () => {
    toast({
      title: "Training Record Created",
      description: "Safety training record has been added successfully.",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">Safety & Compliance</h1>
        <p className="text-muted-foreground">
          Manage safety incidents, worker certifications, and training records in compliance with ISO standards.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {mockSafetyIncidents.length}
                </div>
                <p className="text-xs text-muted-foreground">Safety Incidents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {mockWorkerCertifications.filter(cert => cert.status === "active").length}
                </div>
                <p className="text-xs text-muted-foreground">Active Certifications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {mockSafetyTrainingRecords.filter(record => record.completionStatus === "completed").length}
                </div>
                <p className="text-xs text-muted-foreground">Completed Trainings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {mockWorkerCertifications.filter(cert => {
                    const expiryDate = new Date(cert.expiryDate);
                    const oneMonthFromNow = new Date();
                    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
                    return expiryDate <= oneMonthFromNow;
                  }).length}
                </div>
                <p className="text-xs text-muted-foreground">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="incidents">Safety Incidents</TabsTrigger>
          <TabsTrigger value="certifications">Worker Certifications</TabsTrigger>
          <TabsTrigger value="training">Training Records</TabsTrigger>
        </TabsList>

        {/* Safety Incidents Tab */}
        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Safety Incidents</CardTitle>
                  <CardDescription>
                    Track and manage safety incidents with ISO 45001:2018 compliance
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Report Incident
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Report Safety Incident</DialogTitle>
                      <DialogDescription>
                        Record a new safety incident with all required details for compliance tracking.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Incident Date</label>
                          <Input type="date" className="mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Severity</label>
                          <Select>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minor">Minor</SelectItem>
                              <SelectItem value="moderate">Moderate</SelectItem>
                              <SelectItem value="major">Major</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Location</label>
                        <Input placeholder="e.g., Building A - 5th Floor" className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea placeholder="Detailed description of the incident..." className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Involved Personnel</label>
                        <Input placeholder="Names of involved workers" className="mt-1" />
                      </div>
                      <Button onClick={handleCreateIncident}>Report Incident</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ISO Standards</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockSafetyIncidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell>
                        {new Date(incident.incidentDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate">{incident.description}</div>
                      </TableCell>
                      <TableCell>
                        {getSeverityBadge(incident.severity)}
                      </TableCell>
                      <TableCell>{incident.location}</TableCell>
                      <TableCell>
                        {getStatusBadge(incident.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {incident.isoStandards.map(standard => (
                            <Badge key={standard} variant="outline" className="text-xs">
                              {standard}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Worker Certifications Tab */}
        <TabsContent value="certifications">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Worker Certifications</CardTitle>
                  <CardDescription>
                    Manage worker certifications and ensure compliance
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Certification
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Add Worker Certification</DialogTitle>
                      <DialogDescription>
                        Record a new worker certification for compliance tracking.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Worker Name</label>
                          <Input placeholder="Full name" className="mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Worker ID</label>
                          <Input placeholder="Employee ID" className="mt-1" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Certification Type</label>
                        <Input placeholder="e.g., Heavy Equipment Operator" className="mt-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Issue Date</label>
                          <Input type="date" className="mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Expiry Date</label>
                          <Input type="date" className="mt-1" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Issuing Authority</label>
                        <Input placeholder="e.g., TESDA" className="mt-1" />
                      </div>
                      <Button onClick={handleCreateCertification}>Add Certification</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Certification</TableHead>
                    <TableHead>Authority</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ISO Compliance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockWorkerCertifications.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{cert.workerName}</div>
                          <div className="text-xs text-muted-foreground">{cert.workerId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{cert.certificationType}</div>
                          <div className="text-xs text-muted-foreground">{cert.certificationNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>{cert.issuingAuthority}</TableCell>
                      <TableCell>
                        {new Date(cert.issueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(cert.expiryDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(cert.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {cert.isoCompliance.map(standard => (
                            <Badge key={standard} variant="outline" className="text-xs">
                              {standard}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Records Tab */}
        <TabsContent value="training">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Safety Training Records</CardTitle>
                  <CardDescription>
                    Track safety training completion and compliance
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Training Record
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Add Training Record</DialogTitle>
                      <DialogDescription>
                        Record completed safety training for workers.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Worker Name</label>
                          <Input placeholder="Full name" className="mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Training Type</label>
                          <Input placeholder="e.g., Fall Protection Training" className="mt-1" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Training Date</label>
                          <Input type="date" className="mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Duration (hours)</label>
                          <Input type="number" placeholder="8" className="mt-1" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Trainer</label>
                        <Input placeholder="Trainer name" className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Completion Status</label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCreateTraining}>Add Training Record</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Training Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>ISO Standards</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockSafetyTrainingRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.workerName}</div>
                          <div className="text-xs text-muted-foreground">{record.workerId}</div>
                        </div>
                      </TableCell>
                      <TableCell>{record.trainingType}</TableCell>
                      <TableCell>
                        {new Date(record.trainingDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{record.duration}h</TableCell>
                      <TableCell>{record.trainer}</TableCell>
                      <TableCell>
                        {getStatusBadge(record.completionStatus)}
                      </TableCell>
                      <TableCell>
                        {new Date(record.nextTrainingDue).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {record.isoStandards.map(standard => (
                            <Badge key={standard} variant="outline" className="text-xs">
                              {standard}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
