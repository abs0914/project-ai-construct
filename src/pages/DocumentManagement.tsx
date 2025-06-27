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
import { Label } from "@/components/ui/label";
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

const documentTypes = [
  { value: "rfi", label: "Request for Information (RFI)" },
  { value: "change-order", label: "Change Order" },
  { value: "safety-report", label: "Safety Report" },
  { value: "progress-report", label: "Progress Report" },
  { value: "inspection-report", label: "Inspection Report" },
  { value: "material-specification", label: "Material Specification" },
  { value: "work-order", label: "Work Order" },
  { value: "incident-report", label: "Incident Report" },
  { value: "quality-control", label: "Quality Control Document" },
  { value: "compliance-checklist", label: "Compliance Checklist" },
];

export default function DocumentManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [aiPrompt, setAiPrompt] = useState("");
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [documents, setDocuments] = useState(mockDocuments);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const { toast } = useToast();

  const filteredDocuments = documents.filter(doc => {
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

    if (!selectedDocumentType) {
      toast({
        title: "Error",
        description: "Please select a document type.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate AI document generation
    setTimeout(() => {
      const docTypeLabel = documentTypes.find(dt => dt.value === selectedDocumentType)?.label || selectedDocumentType;
      const newDocument = {
        id: (documents.length + 1).toString(),
        projectId: "1", // Default to first project
        name: `AI Generated ${docTypeLabel}`,
        type: "pdf",
        category: getCategoryFromDocType(selectedDocumentType),
        fileUrl: `/documents/ai-generated-${selectedDocumentType}.pdf`,
        fileSize: Math.round(Math.random() * 10 + 1),
        uploadedBy: "AI Assistant",
        uploadDate: new Date().toISOString().split('T')[0],
        version: "1.0",
        status: "draft",
        tags: [selectedDocumentType, "ai-generated"],
        content: generateDocumentContent(selectedDocumentType, aiPrompt)
      };

      setDocuments(prev => [newDocument, ...prev]);
      setIsGenerating(false);
      setAiPrompt("");
      setSelectedDocumentType("");
      setShowGenerateDialog(false);
      
      toast({
        title: "Document Generated",
        description: `Your AI-generated ${docTypeLabel} has been created successfully.`,
      });
    }, 3000);
  };

  const getCategoryFromDocType = (docType: string) => {
    const categoryMap: { [key: string]: string } = {
      'rfi': 'compliance',
      'change-order': 'contract',
      'safety-report': 'compliance',
      'progress-report': 'other',
      'inspection-report': 'compliance',
      'material-specification': 'specification',
      'work-order': 'other',
      'incident-report': 'compliance',
      'quality-control': 'compliance',
      'compliance-checklist': 'compliance'
    };
    return categoryMap[docType] || 'other';
  };

  const generateDocumentContent = (docType: string, prompt: string) => {
    const templates: { [key: string]: string } = {
      'rfi': `REQUEST FOR INFORMATION\n\nProject: Construction Project\nRFI Number: RFI-${Date.now()}\nDate: ${new Date().toLocaleDateString()}\n\nDescription:\n${prompt}\n\nRequested Information:\n- Technical specifications\n- Material requirements\n- Timeline considerations\n\nSubmitted by: AI Assistant\nStatus: Pending Review`,
      'safety-report': `SAFETY REPORT\n\nProject: Construction Site Safety Assessment\nReport Date: ${new Date().toLocaleDateString()}\n\nSafety Concerns:\n${prompt}\n\nRecommended Actions:\n- Implement additional safety measures\n- Conduct safety training\n- Regular safety inspections\n\nPrepared by: AI Assistant\nNext Review: ${new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString()}`,
      'progress-report': `PROGRESS REPORT\n\nProject Status Update\nReporting Period: ${new Date().toLocaleDateString()}\n\nProgress Summary:\n${prompt}\n\nCompleted Tasks:\n- Task 1\n- Task 2\n- Task 3\n\nUpcoming Milestones:\n- Milestone 1\n- Milestone 2\n\nPrepared by: AI Assistant`,
    };
    
    return templates[docType] || `${docType.toUpperCase().replace('-', ' ')}\n\nGenerated Content:\n${prompt}\n\nDocument created by AI Assistant on ${new Date().toLocaleDateString()}`;
  };

  const handleViewDocument = (doc: any) => {
    setSelectedDocument(doc);
    setShowViewDialog(true);
  };

  const handleDownloadDocument = (doc: any) => {
    // Simulate document download
    toast({
      title: "Download Started",
      description: `Downloading ${doc.name}...`,
    });
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
          <Link to="/document-management/compliance-tracker">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Compliance Tracker
            </Button>
          </Link>
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
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
                  Generate construction documents using AI. Select document type and describe what you need.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((docType) => (
                        <SelectItem key={docType.value} value={docType.value}>
                          {docType.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Document Description</Label>
                  <Textarea
                    id="description"
                    placeholder="e.g., Generate a comprehensive RFI for concrete quality concerns, or Create a safety protocol document for high-rise construction..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="min-h-[100px]"
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
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleViewDocument(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDownloadDocument(doc)}
                        >
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

      {/* Document Viewer Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>{selectedDocument?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Document details and content preview
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Category:</strong> {getCategoryBadge(selectedDocument.category)}
                </div>
                <div>
                  <strong>Status:</strong> {getStatusBadge(selectedDocument.status)}
                </div>
                <div>
                  <strong>Version:</strong> {selectedDocument.version}
                </div>
                <div>
                  <strong>Size:</strong> {selectedDocument.fileSize} MB
                </div>
                <div>
                  <strong>Uploaded by:</strong> {selectedDocument.uploadedBy}
                </div>
                <div>
                  <strong>Date:</strong> {new Date(selectedDocument.uploadDate).toLocaleDateString()}
                </div>
              </div>
              
              <div className="space-y-2">
                <strong>Tags:</strong>
                <div className="flex flex-wrap gap-1">
                  {selectedDocument.tags?.map((tag: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedDocument.content && (
                <div className="space-y-2">
                  <strong>Content Preview:</strong>
                  <div className="bg-muted p-4 rounded-md max-h-[300px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {selectedDocument.content}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => handleDownloadDocument(selectedDocument)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button onClick={() => setShowViewDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
