
"use client";

import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Newspaper,
  Briefcase,
  ListChecks,
  Truck,
  Landmark,
  FileText,
  CheckCircle,
  ShieldCheck,
  Video,
  MessageCircle,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Project Updates",
    url: "/project-updates",
    icon: Newspaper,
  },
  {
    title: "Project Management",
    url: "/project-management",
    icon: Briefcase,
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: ListChecks,
  },
  {
    title: "Resource Management",
    url: "/resource-management",
    icon: Truck,
  },
  {
    title: "Budgets",
    url: "/budgets",
    icon: Landmark,
  },
  {
    title: "Document Management",
    url: "/document-management",
    icon: FileText,
  },
  {
    title: "Compliance Tracker",
    url: "/document-management/compliance-tracker",
    icon: CheckCircle,
  },
  {
    title: "Safety & Compliance",
    url: "/safety-compliance",
    icon: ShieldCheck,
  },
  {
    title: "SiteGuard",
    url: "/siteguard",
    icon: Video,
  },
  {
    title: "AI Chatbot",
    url: "/chatbot",
    icon: MessageCircle,
  },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-accent-foreground font-bold text-sm">CA</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-sidebar-foreground">ConstructAI</h2>
            <p className="text-xs text-sidebar-foreground/70">Project Management</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
                  >
                    <Link to={item.url} className="flex items-center space-x-2">
                      <item.icon size={16} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
