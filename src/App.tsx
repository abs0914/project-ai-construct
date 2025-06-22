
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import Dashboard from "@/pages/Dashboard";
import ProjectManagement from "@/pages/ProjectManagement";
import DocumentManagement from "@/pages/DocumentManagement";
import ComplianceTracker from "@/pages/ComplianceTracker";
import SafetyCompliance from "@/pages/SafetyCompliance";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/project-management" element={<ProjectManagement />} />
            <Route path="/document-management" element={<DocumentManagement />} />
            <Route path="/document-management/compliance-tracker" element={<ComplianceTracker />} />
            <Route path="/safety-compliance" element={<SafetyCompliance />} />
            {/* Placeholder routes for other modules */}
            <Route path="/project-updates" element={<div className="p-8 text-center text-muted-foreground">Project Updates - Coming Soon</div>} />
            <Route path="/tasks" element={<div className="p-8 text-center text-muted-foreground">Tasks - Coming Soon</div>} />
            <Route path="/resource-management" element={<div className="p-8 text-center text-muted-foreground">Resource Management - Coming Soon</div>} />
            <Route path="/budgets" element={<div className="p-8 text-center text-muted-foreground">Budgets - Coming Soon</div>} />
            <Route path="/siteguard" element={<div className="p-8 text-center text-muted-foreground">SiteGuard - Coming Soon</div>} />
            <Route path="/chatbot" element={<div className="p-8 text-center text-muted-foreground">AI Chatbot - Coming Soon</div>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
