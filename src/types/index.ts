
export type ProjectStatus = 'Initiation' | 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Archived';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  projectManager: string;
  startDate: string;
  endDate: string;
  budget: number;
  progress: number;
  location: string;
  client: string;
  
  // Project Management Phases
  scopeStatement: string;
  riskAssessmentSummary: string;
  lessonsLearned: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  title: string;
  content: string;
  author: string;
  type: 'progress' | 'milestone' | 'issue' | 'general';
  priority: 'low' | 'medium' | 'high';
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyIncident {
  id: string;
  projectId: string;
  incidentDate: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  location: string;
  involvedPersonnel: string[];
  rootCauseAnalysis: string;
  preventiveActions: string;
  isoStandards: string[];
  status: 'reported' | 'investigating' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface WorkerCertification {
  id: string;
  workerId: string;
  workerName: string;
  certificationType: string;
  certificationNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'suspended';
  isoCompliance: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SafetyTrainingRecord {
  id: string;
  workerId: string;
  workerName: string;
  trainingType: string;
  trainingDate: string;
  trainer: string;
  duration: number; // in hours
  completionStatus: 'completed' | 'in-progress' | 'failed';
  certificationEarned?: string;
  nextTrainingDue: string;
  isoStandards: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: string;
  name: string;
  type: 'equipment' | 'material' | 'personnel';
  description: string;
  status: 'available' | 'in-use' | 'maintenance' | 'unavailable';
  location: string;
  projectId?: string;
  acquisitionDate: string;
  cost: number;
  repairHistory?: RepairHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface RepairHistoryEntry {
  id: string;
  date: string;
  description: string;
  partsReplaced: string[];
  cost: number;
  technician: string;
  nextMaintenanceDate: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignee: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string;
  estimatedHours: number;
  actualHours?: number;
  dependencies: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  projectId: string;
  totalBudget: number;
  allocatedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  lineItems: BudgetLineItem[];
  approvedBy: string;
  approvalDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetLineItem {
  id: string;
  category: string;
  description: string;
  allocatedAmount: number;
  spentAmount: number;
  vendor?: string;
  purchaseOrderNumber?: string;
  status: 'pending' | 'approved' | 'paid';
}

export interface Document {
  id: string;
  projectId: string;
  name: string;
  type: string;
  category: 'contract' | 'permit' | 'drawing' | 'specification' | 'compliance' | 'other';
  fileUrl: string;
  fileSize: number;
  uploadedBy: string;
  uploadDate: string;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'archived';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceItem {
  id: string;
  projectId: string;
  documentType: string;
  description: string;
  requiredBy: string;
  dueDate: string;
  status: 'not-started' | 'in-progress' | 'submitted' | 'approved' | 'rejected';
  assignee: string;
  notes: string;
  submissionDate?: string;
  approvalDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CCTVCamera {
  id: string;
  name: string;
  location: string;
  ipAddress: string;
  status: 'online' | 'offline' | 'maintenance';
  type: 'fixed' | 'ptz' | 'dome';
  resolution: string;
  installDate: string;
  lastMaintenance: string;
  nextMaintenance: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  projectContext?: string;
}

// Dashboard metrics
export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalBudget: number;
  spentBudget: number;
  safetyIncidents: number;
  tasksCompleted: number;
  resourceUtilization: number;
}
