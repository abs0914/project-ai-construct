
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Plus, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { mockProjects } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

// Mock budgets data
const mockBudgets = [
  {
    id: "1",
    projectId: "1",
    totalBudget: 2500000,
    allocatedBudget: 2400000,
    spentBudget: 1800000,
    remainingBudget: 700000,
    approvedBy: "Finance Director",
    approvalDate: "2024-06-01",
    lineItems: [
      {
        id: "1",
        category: "Labor",
        description: "Construction workers and supervisors",
        allocatedAmount: 800000,
        spentAmount: 650000,
        vendor: "Construction Workers Union",
        status: "approved" as const,
      },
      {
        id: "2",
        category: "Materials",
        description: "Concrete, steel, and building supplies",
        allocatedAmount: 900000,
        spentAmount: 720000,
        vendor: "BuildMart Supplies",
        status: "approved" as const,
      },
      {
        id: "3",
        category: "Equipment",
        description: "Heavy machinery rental",
        allocatedAmount: 400000,
        spentAmount: 300000,
        vendor: "Heavy Equipment Co.",
        status: "approved" as const,
      },
      {
        id: "4",
        category: "Permits",
        description: "Building permits and inspections",
        allocatedAmount: 50000,
        spentAmount: 45000,
        vendor: "City Planning Office",
        status: "paid" as const,
      },
    ],
    createdAt: "2024-06-01",
    updatedAt: "2024-06-20",
  },
  {
    id: "2",
    projectId: "2",
    totalBudget: 5000000,
    allocatedBudget: 4800000,
    spentBudget: 2100000,
    remainingBudget: 2900000,
    approvedBy: "CFO",
    approvalDate: "2024-05-15",
    lineItems: [
      {
        id: "5",
        category: "Infrastructure",
        description: "Road and utility infrastructure",
        allocatedAmount: 2000000,
        spentAmount: 800000,
        vendor: "Infrastructure Corp",
        status: "approved" as const,
      },
      {
        id: "6",
        category: "Environmental",
        description: "Environmental compliance and mitigation",
        allocatedAmount: 800000,
        spentAmount: 600000,
        vendor: "EcoConsulting Ltd",
        status: "approved" as const,
      },
    ],
    createdAt: "2024-05-15",
    updatedAt: "2024-06-18",
  },
];

export default function Budgets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBudget, setNewBudget] = useState({
    projectId: "",
    totalBudget: "",
    description: "",
  });
  const { toast } = useToast();

  const filteredBudgets = mockBudgets.filter(budget => {
    const project = mockProjects.find(p => p.id === budget.projectId);
    const matchesSearch = project?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = projectFilter === "all" || budget.projectId === projectFilter;
    return matchesSearch && matchesProject;
  });

  const totalBudgetAcrossProjects = mockBudgets.reduce((sum, budget) => sum + budget.totalBudget, 0);
  const totalSpentAcrossProjects = mockBudgets.reduce((sum, budget) => sum + budget.spentBudget, 0);
  const totalRemainingAcrossProjects = mockBudgets.reduce((sum, budget) => sum + budget.remainingBudget, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "pending": return <Badge variant="outline">Pending</Badge>;
      case "paid": return <Badge className="bg-blue-100 text-blue-800">Paid</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getBudgetProgress = (spent: number, allocated: number) => {
    return (spent / allocated) * 100;
  };

  const handleCreateBudget = () => {
    if (!newBudget.projectId || !newBudget.totalBudget) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Budget Created",
      description: "New budget has been created successfully.",
    });

    setIsCreateDialogOpen(false);
    setNewBudget({ projectId: "", totalBudget: "", description: "" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Budget Management</h1>
          <p className="text-muted-foreground">
            Track project budgets, expenses, and financial performance across all projects.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
              <DialogDescription>
                Set up a new budget for a project with initial allocation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select value={newBudget.projectId} onValueChange={(value) => setNewBudget({...newBudget, projectId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
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
              <div className="space-y-2">
                <Label htmlFor="budget">Total Budget (PHP)</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="Enter total budget amount"
                  value={newBudget.totalBudget}
                  onChange={(e) => setNewBudget({...newBudget, totalBudget: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Budget description or notes"
                  value={newBudget.description}
                  onChange={(e) => setNewBudget({...newBudget, description: e.target.value})}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBudget}>
                  Create Budget
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudgetAcrossProjects)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpentAcrossProjects)}</div>
            <p className="text-xs text-muted-foreground">
              {((totalSpentAcrossProjects / totalBudgetAcrossProjects) * 100).toFixed(1)}% of total budget
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRemainingAcrossProjects)}</div>
            <p className="text-xs text-muted-foreground">
              {((totalRemainingAcrossProjects / totalBudgetAcrossProjects) * 100).toFixed(1)}% remaining
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((totalSpentAcrossProjects / totalBudgetAcrossProjects) * 100).toFixed(1)}%
            </div>
            <Progress value={(totalSpentAcrossProjects / totalBudgetAcrossProjects) * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by project name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
          </div>
        </CardContent>
      </Card>

      {/* Budgets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Project Budgets</CardTitle>
          <CardDescription>
            Overview of all project budgets and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Total Budget</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBudgets.map((budget) => {
                const project = mockProjects.find(p => p.id === budget.projectId);
                const progress = getBudgetProgress(budget.spentBudget, budget.totalBudget);
                return (
                  <TableRow key={budget.id}>
                    <TableCell>
                      <div className="font-medium">{project?.name || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">ID: {budget.id}</div>
                    </TableCell>
                    <TableCell>{formatCurrency(budget.totalBudget)}</TableCell>
                    <TableCell>{formatCurrency(budget.spentBudget)}</TableCell>
                    <TableCell>
                      <span className={budget.remainingBudget < 0 ? "text-red-600" : "text-green-600"}>
                        {formatCurrency(budget.remainingBudget)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={progress} className="h-2" />
                        <span className="text-xs text-muted-foreground">{progress.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {progress > 90 ? (
                        <Badge variant="destructive">Over Budget Risk</Badge>
                      ) : progress > 75 ? (
                        <Badge className="bg-orange-100 text-orange-800">High Usage</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">On Track</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedBudget(budget.id)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Budget Details Modal */}
      {selectedBudget && (
        <Dialog open={!!selectedBudget} onOpenChange={() => setSelectedBudget(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Budget Details</DialogTitle>
              <DialogDescription>
                Detailed breakdown of budget line items and expenses
              </DialogDescription>
            </DialogHeader>
            {(() => {
              const budget = mockBudgets.find(b => b.id === selectedBudget);
              const project = mockProjects.find(p => p.id === budget?.projectId);
              
              if (!budget) return null;
              
              return (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="line-items">Line Items</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">{project?.name}</CardTitle>
                          <CardDescription>Budget Overview</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between">
                            <span>Total Budget:</span>
                            <span className="font-semibold">{formatCurrency(budget.totalBudget)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Allocated:</span>
                            <span>{formatCurrency(budget.allocatedBudget)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Spent:</span>
                            <span>{formatCurrency(budget.spentBudget)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Remaining:</span>
                            <span className={budget.remainingBudget < 0 ? "text-red-600" : "text-green-600"}>
                              {formatCurrency(budget.remainingBudget)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Budget Progress</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Progress 
                            value={getBudgetProgress(budget.spentBudget, budget.totalBudget)} 
                            className="h-4"
                          />
                          <p className="text-sm text-muted-foreground mt-2">
                            {getBudgetProgress(budget.spentBudget, budget.totalBudget).toFixed(1)}% utilized
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="line-items">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Allocated</TableHead>
                          <TableHead>Spent</TableHead>
                          <TableHead>Remaining</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {budget.lineItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Badge variant="outline">{item.category}</Badge>
                            </TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{formatCurrency(item.allocatedAmount)}</TableCell>
                            <TableCell>{formatCurrency(item.spentAmount)}</TableCell>
                            <TableCell>
                              <span className={item.allocatedAmount - item.spentAmount < 0 ? "text-red-600" : "text-green-600"}>
                                {formatCurrency(item.allocatedAmount - item.spentAmount)}
                              </span>
                            </TableCell>
                            <TableCell>{item.vendor}</TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
