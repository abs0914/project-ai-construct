"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Filter, Download, Eye, Upload, FileText, Sparkles } from "lucide-react";
import { mockProjects } from "@/lib/mock-data";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// Mock documents data
const mockDocuments = [
  {
    id: "1",
    projectId: "1",
    name: "Building Permit Application",
    type: "pdf",
    category: "permit",
    fileUrl: "/documents/building-permit.pdf",
    fileSize: 2.5,
    uploadedBy: "Juan dela Cruz",
    uploadDate: "2024-06-15",
    version: "1.2",
    status: "approved",
    tags: ["permit", "legal", "building"],
  },
  {
    id: "2",
    projectId: "1",
    name: "Structural Drawings",
    type: "dwg",
    category: "drawing",
    fileUrl: "/documents/structural-plans.dwg",
    fileSize: 15.7,
    uploadedBy: "Architect Santos",
    uploadDate: "2024-06-10",
    version: "3.0",
    status: "approved",
    tags: ["structural", "drawings", "plans"],
  },
  {
    id: "3",
    projectId: "2",
    name: "Environmental Impact Assessment",
    type: "pdf",
    category: "compliance",
    fileUrl: "/documents/eia-report.pdf",
    fileSize: 8.3,
    uploadedBy: "Environmental Consultant",
    uploadDate: "2024-06-08",
    version: "1.0",
    status: "review",
    tags: ["environmental", "compliance", "assessment"],
  },
];

export default function DocumentManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesProject = projectFilter === "all" || doc.projectId === projectFilter;
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesProject && matchesCategory;
  });

  const handleGenerateDocument = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please provide a description for the document you want to generate.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate AI document generation
    setTimeout(() => {
      setIsGenerating(false);
      setAiPrompt("");
      toast({
        title: "Document Generated",
        description: "Your AI-generated document has been created successfully.",
      });
    }, 3000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge variant="secondary">Approved</Badge>;
      case "review": return <Badge variant="outline">Under Review</Badge>;
      case "draft": return <Badge variant="outline">Draft</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "permit": return <Badge className="bg-blue-100 text-blue-800">Permit</Badge>;
      case "drawing": return <Badge className="bg-green-100 text-green-800">Drawing</Badge>;
      case "compliance": return <Badge className="bg-orange-100 text-orange-800">Compliance</Badge>;
      case "contract": return <Badge className="bg-purple-100 text-purple-800">Contract</Badge>;
      default: return <Badge variant="outline">{category}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Document Management</h1>
          <p className="text-muted-foreground">
            Manage project documents, contracts, permits, and generate AI-powered documentation.
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/document-management/compliance-tracker">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Compliance Tracker
            </Button>
          </Link>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>AI Document Generator</DialogTitle>
                <DialogDescription>
                  Generate construction documents using AI. Describe what type of document you need.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Document Description</label>
                  <Textarea
                    placeholder="e.g., Generate a comprehensive RFI for concrete quality concerns, or Create a safety protocol document for high-rise construction..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={handleGenerateDocument} 
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Document
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents by name or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full lg:w-[250px]">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {mockProjects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="permit">Permits</SelectItem>
                <SelectItem value="drawing">Drawings</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="contract">Contracts</SelectItem>
                <SelectItem value="specification">Specifications</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            All project documents organized by category and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => {
                const project = mockProjects.find(p => p.id === doc.projectId);
                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{doc.name}</div>
                          <div className="text-xs text-muted-foreground">v{doc.version}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{project?.name || "Unknown"}</div>
                    </TableCell>
                    <TableCell>
                      {getCategoryBadge(doc.category)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(doc.status)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{doc.fileSize} MB</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{doc.uploadedBy}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
