/**
 * TypeScript interfaces for Single Project Dashboard
 * Hexa Steel® — Operation Tracking System (OTS)
 * Module: Single Project Dashboard v1.0
 * Author: Walid Dami
 */

// ============================================
// PROJECT SUMMARY TYPES
// ============================================

export interface ProjectSummary {
  id: string;
  projectNumber: string;
  name: string;
  clientName: string;
  totalBuildings: number;
  totalTonnage: number;
  startDate: Date | null;
  expectedCompletion: Date | null;
  contractDate: Date | null;
  status: string;
  projectManager: {
    id: string;
    name: string;
  };
  salesEngineer?: {
    id: string;
    name: string;
  } | null;
}

// ============================================
// WPS STATUS TYPES
// ============================================

export interface WPSStatus {
  id: string;
  wpsNumber: string;
  revision: number;
  weldingProcess: string;
  status: 'Draft' | 'Approved' | 'Superseded';
  dateIssued: Date | null;
  preparedBy: {
    id: string;
    name: string;
  };
  approvedBy?: {
    id: string;
    name: string;
  } | null;
}

export interface WPSStatusResponse {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  wps: WPSStatus[];
}

// ============================================
// ITP STATUS TYPES
// ============================================

export interface ITPStatus {
  id: string;
  itpNumber: string;
  revision: number;
  type: string;
  status: 'Draft' | 'Under Review' | 'Approved' | 'Rejected';
  dateCreated: Date;
  dateApproved: Date | null;
  createdBy: {
    id: string;
    name: string;
  };
  approvedBy?: {
    id: string;
    name: string;
  } | null;
  totalActivities: number;
  completedActivities: number;
}

export interface ITPStatusResponse {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  overdue: number;
  itps: ITPStatus[];
}

// ============================================
// PRODUCTION PROGRESS TYPES
// ============================================

export interface ProductionProgress {
  requiredWeight: number; // in tons
  producedWeight: number; // in tons
  progressPercentage: number;
  weeklyTrend: {
    week: string;
    produced: number;
  }[];
  byProcess: {
    processType: string;
    weight: number;
    percentage: number;
  }[];
}

// ============================================
// QC PROGRESS TYPES
// ============================================

export interface QCProgress {
  totalInspections: number;
  completedInspections: number;
  rejectedInspections: number;
  pendingInspections: number;
  progressPercentage: number;
  timeline: {
    date: string;
    inspections: number;
  }[];
  byType: {
    type: string;
    total: number;
    completed: number;
    rejected: number;
  }[];
}

// ============================================
// BUILDING STATUS TYPES
// ============================================

export interface BuildingStatus {
  id: string;
  designation: string;
  name: string;
  requiredWeight: number; // in tons
  producedWeight: number; // in tons
  productionProgress: number; // percentage
  qcStatus: {
    total: number;
    completed: number;
    rejected: number;
  };
  dispatchStatus: {
    total: number;
    dispatched: number;
    percentage: number;
  };
}

// ============================================
// DOCUMENTATION STATUS TYPES
// ============================================

export interface DocumentationCategory {
  category: string;
  fileCount: number;
  missingItems: number;
  lastUpdate: Date | null;
}

export interface DocumentationStatus {
  categories: DocumentationCategory[];
  totalDocuments: number;
  pendingApprovals: number;
}

// ============================================
// TASKS OVERVIEW TYPES
// ============================================

export interface TaskOverview {
  id: string;
  title: string;
  description: string | null;
  assignedTo: {
    id: string;
    name: string;
  } | null;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  dueDate: Date | null;
  createdAt: Date;
  buildingId: string | null;
  buildingName: string | null;
}

export interface TasksOverviewResponse {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  tasks: TaskOverview[];
}

// ============================================
// WORK ORDERS TYPES
// ============================================

export interface WorkOrderPart {
  id: string;
  partDesignation: string;
  quantity: number;
  status: string;
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  status: string;
  priority: string;
  targetDate: string | null;
  assignedTo: {
    id: string;
    name: string;
  } | null;
  parts: WorkOrderPart[];
  createdAt: string;
}

// ============================================
// PLANNING ACTIVITIES / SCHEDULES TYPES
// ============================================

export interface BuildingScheduleProgress {
  id: string;
  name: string;
  designation: string;
  progress: number;
  expectedProgress: number;
  status: 'not-started' | 'on-track' | 'at-risk' | 'critical' | 'completed';
  startDate: string;
  endDate: string;
  daysRemaining: number;
  daysOverdue: number;
}

export interface ActivitySummary {
  scopeType: string;
  scopeLabel: string;
  buildingCount: number;
  avgProgress: number;
  avgExpectedProgress: number;
  status: 'not-started' | 'on-track' | 'at-risk' | 'critical' | 'completed';
  buildings: BuildingScheduleProgress[];
}

export interface ScheduleStats {
  totalActivities: number;
  completed: number;
  onTrack: number;
  atRisk: number;
  critical: number;
  notStarted: number;
  overallProgress: number;
}

export interface SchedulesResponse {
  summary: ActivitySummary[];
  stats: ScheduleStats;
}

// ============================================
// COMBINED DASHBOARD RESPONSE
// ============================================

export interface ProjectDashboardData {
  summary: ProjectSummary;
  wps: WPSStatusResponse;
  itp: ITPStatusResponse;
  production: ProductionProgress;
  qc: QCProgress;
  buildings: BuildingStatus[];
  documentation: DocumentationStatus;
  tasks: TasksOverviewResponse;
  workOrders: WorkOrder[];
  schedules: SchedulesResponse;
}
