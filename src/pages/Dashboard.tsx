
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, DollarSign } from "lucide-react";
import { mockDashboardMetrics, mockProjects } from "@/lib/mock-data";

const projectStatusData = [
  { name: "Active", value: 8, color: "#1E3A8A" },
  { name: "Planning", value: 2, color: "#F97316" },
  { name: "Completed", value: 5, color: "#10B981" },
];

const budgetData = [
  { name: "Jan", budget: 50000000, spent: 45000000 },
  { name: "Feb", budget: 65000000, spent: 60000000 },
  { name: "Mar", budget: 80000000, spent: 75000000 },
  { name: "Apr", budget: 95000000, spent: 88000000 },
  { name: "May", budget: 110000000, spent: 102000000 },
  { name: "Jun", budget: 125000000, spent: 115000000 },
];

export default function Dashboard() {
  const metrics = mockDashboardMetrics;
  const recentProjects = mockProjects.slice(0, 3);

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
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your construction projects.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{metrics.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 inline-flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +2 this month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{metrics.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.resourceUtilization}% resource utilization
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.totalBudget)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics.spentBudget)} spent ({Math.round((metrics.spentBudget / metrics.totalBudget) * 100)}%)
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safety Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{metrics.safetyIncidents}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 inline-flex items-center">
                <TrendingDown className="h-3 w-3 mr-1" />
                -2 from last month
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Spending Trend</CardTitle>
            <CardDescription>Monthly budget allocation and actual spending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `₱${(value / 1000000).toFixed(0)}M`} />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(Number(value)), '']}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Bar dataKey="budget" fill="#1E3A8A" name="Budget" />
                  <Bar dataKey="spent" fill="#F97316" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
            <CardDescription>Current status of all projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
          <CardDescription>Latest project updates and progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentProjects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{project.name}</h4>
                    <Badge variant={
                      project.status === "Active" ? "default" :
                      project.status === "Completed" ? "secondary" : "outline"
                    }>
                      {project.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{project.location}</p>
                  <p className="text-sm">Manager: {project.projectManager}</p>
                </div>
                <div className="text-right space-y-2">
                  <div className="text-sm font-medium">{project.progress}% Complete</div>
                  <Progress value={project.progress} className="w-[100px]" />
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(project.budget)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
