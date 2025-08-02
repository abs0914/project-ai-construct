
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import Dashboard from "@/pages/Dashboard";
import ProjectManagement from "@/pages/ProjectManagement";
import ProjectCreate from "@/pages/ProjectCreate";
import ProjectDetail from "@/pages/ProjectDetail";
import ProjectUpdates from "@/pages/ProjectUpdates";
import ProjectUpdateDetail from "@/pages/ProjectUpdateDetail";
import DocumentManagement from "@/pages/DocumentManagement";
import ComplianceTracker from "@/pages/ComplianceTracker";
import SafetyCompliance from "@/pages/SafetyCompliance";
import Tasks from "@/pages/Tasks";
import ResourceManagement from "@/pages/ResourceManagement";
import Budgets from "@/pages/Budgets";
import SiteGuard from "@/pages/SiteGuard";
import SiteGuardSettings from "@/pages/SiteGuardSettings";
import AIChatbot from "@/pages/AIChatbot";
import IntegrationTest from "@/pages/IntegrationTest";
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
            <Route path="/project-management/create" element={<ProjectCreate />} />
            <Route path="/project-management/:id" element={<ProjectDetail />} />
            <Route path="/project-updates" element={<ProjectUpdates />} />
            <Route path="/project-updates/:updateId" element={<ProjectUpdateDetail />} />
            <Route path="/document-management" element={<DocumentManagement />} />
            <Route path="/document-management/compliance-tracker" element={<ComplianceTracker />} />
            <Route path="/safety-compliance" element={<SafetyCompliance />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/resource-management" element={<ResourceManagement />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/siteguard" element={<SiteGuard />} />
            <Route path="/siteguard/settings" element={<SiteGuardSettings />} />
            <Route path="/chatbot" element={<AIChatbot />} />
            <Route path="/integration-test" element={<IntegrationTest />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
