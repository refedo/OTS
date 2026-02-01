/**
 * Module-level access restrictions for granular RBAC
 * Similar to Dolibarr ERP's module access control
 * Allows admin roles to have restricted access to sensitive modules
 */

export type ModuleRestriction = {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'operational' | 'administrative' | 'strategic';
  permissions: string[]; // List of permission IDs that belong to this module
};

// Define all modules with their associated permissions
export const MODULE_RESTRICTIONS: ModuleRestriction[] = [
  {
    id: 'financial_contracts',
    name: 'Financial - Contracts & Payments',
    description: 'Access to contract values, payment schedules, and financial terms',
    category: 'financial',
    permissions: [
      'projects.view', // Can view projects but financial data will be hidden
      'projects.create',
      'projects.edit',
    ],
  },
  {
    id: 'financial_reports',
    name: 'Financial - Reports & Analytics',
    description: 'Access to financial reports and analytics',
    category: 'financial',
    permissions: [
      'reports.view',
      'reports.export',
      'reports.view_all',
    ],
  },
  {
    id: 'user_management',
    name: 'User & Role Management',
    description: 'Manage users, roles, and permissions',
    category: 'administrative',
    permissions: [
      'users.view',
      'users.create',
      'users.edit',
      'users.delete',
      'users.manage_roles',
      'roles.view',
      'roles.create',
      'roles.edit',
      'roles.delete',
      'roles.manage_permissions',
    ],
  },
  {
    id: 'department_management',
    name: 'Department Management',
    description: 'Manage departments and organizational structure',
    category: 'administrative',
    permissions: [
      'departments.view',
      'departments.create',
      'departments.edit',
      'departments.delete',
    ],
  },
  {
    id: 'project_operations',
    name: 'Project Operations',
    description: 'Operational project management (non-financial)',
    category: 'operational',
    permissions: [
      'projects.view',
      'projects.view_all',
      'projects.create',
      'projects.edit',
      'projects.delete',
      'projects.assign',
      'buildings.view',
      'buildings.create',
      'buildings.edit',
      'buildings.delete',
    ],
  },
  {
    id: 'task_management',
    name: 'Task Management',
    description: 'Create and manage tasks',
    category: 'operational',
    permissions: [
      'tasks.view',
      'tasks.view_all',
      'tasks.create',
      'tasks.edit',
      'tasks.delete',
      'tasks.assign',
    ],
  },
  {
    id: 'production_management',
    name: 'Production Management',
    description: 'Production tracking and logging',
    category: 'operational',
    permissions: [
      'production.view_dashboard',
      'production.view_status',
      'production.view_parts',
      'production.create_parts',
      'production.edit_parts',
      'production.delete_parts',
      'production.view_logs',
      'production.create_logs',
      'production.edit_logs',
      'production.delete_logs',
      'production.view_reports',
      'production.export_reports',
    ],
  },
  {
    id: 'quality_control',
    name: 'Quality Control',
    description: 'Quality management and inspections',
    category: 'operational',
    permissions: [
      'quality.view_itp',
      'quality.create_itp',
      'quality.edit_itp',
      'quality.approve_itp',
      'quality.view_wps',
      'quality.create_wps',
      'quality.edit_wps',
      'quality.approve_wps',
      'quality.view_rfi',
      'quality.create_rfi',
      'quality.approve_rfi',
      'quality.view_ncr',
      'quality.create_ncr',
      'quality.close_ncr',
    ],
  },
  {
    id: 'document_management',
    name: 'Document Management',
    description: 'Document control and management',
    category: 'operational',
    permissions: [
      'documents.view',
      'documents.upload',
      'documents.edit',
      'documents.delete',
      'documents.approve',
      'documents.manage_categories',
    ],
  },
  {
    id: 'business_planning',
    name: 'Business Planning & Strategy',
    description: 'Strategic planning, OKRs, and KPIs',
    category: 'strategic',
    permissions: [
      'business.view_dashboard',
      'business.view_foundation',
      'business.edit_foundation',
      'business.view_swot',
      'business.edit_swot',
      'business.view_objectives',
      'business.manage_objectives',
      'business.view_kpis',
      'business.manage_kpis',
      'business.view_initiatives',
      'business.manage_initiatives',
      'business.view_dept_plans',
      'business.manage_dept_plans',
      'business.view_issues',
      'business.manage_issues',
    ],
  },
  {
    id: 'operations_control',
    name: 'Operations Control Center',
    description: 'Operations intelligence and control',
    category: 'operational',
    permissions: [
      'operations.view_dashboard',
      'operations.view_intelligence',
      'operations.view_work_units',
      'operations.manage_work_units',
      'operations.view_dependencies',
      'operations.manage_dependencies',
      'operations.view_capacity',
      'operations.ai_digest',
    ],
  },
  {
    id: 'risk_management',
    name: 'Risk Management',
    description: 'Risk assessment and early warning',
    category: 'strategic',
    permissions: [
      'risk.view_dashboard',
      'risk.view_alerts',
      'risk.manage',
    ],
  },
  {
    id: 'knowledge_center',
    name: 'Knowledge Center',
    description: 'Knowledge base and documentation',
    category: 'operational',
    permissions: [
      'knowledge.view',
      'knowledge.create',
      'knowledge.edit',
      'knowledge.delete',
      'knowledge.validate',
    ],
  },
  {
    id: 'system_settings',
    name: 'System Settings',
    description: 'System configuration and settings',
    category: 'administrative',
    permissions: [
      'settings.view',
      'settings.edit',
    ],
  },
];

// Get all permissions that are considered financial/sensitive
export function getFinancialPermissions(): string[] {
  return MODULE_RESTRICTIONS
    .filter(m => m.category === 'financial')
    .flatMap(m => m.permissions);
}

// Get module by ID
export function getModuleById(moduleId: string): ModuleRestriction | undefined {
  return MODULE_RESTRICTIONS.find(m => m.id === moduleId);
}

// Get modules by category
export function getModulesByCategory(category: string): ModuleRestriction[] {
  return MODULE_RESTRICTIONS.filter(m => m.category === category);
}

// Check if a permission is financial/sensitive
export function isFinancialPermission(permissionId: string): boolean {
  const financialPerms = getFinancialPermissions();
  return financialPerms.includes(permissionId);
}

// Get all module IDs
export function getAllModuleIds(): string[] {
  return MODULE_RESTRICTIONS.map(m => m.id);
}

// Filter permissions based on restricted modules
export function filterPermissionsByModules(
  allPermissions: string[],
  restrictedModules: string[]
): string[] {
  if (restrictedModules.length === 0) {
    return allPermissions;
  }

  // Get all permissions from restricted modules
  const restrictedPermissions = new Set<string>();
  restrictedModules.forEach(moduleId => {
    const module = getModuleById(moduleId);
    if (module) {
      module.permissions.forEach(perm => restrictedPermissions.add(perm));
    }
  });

  // Return permissions that are NOT in restricted modules
  return allPermissions.filter(perm => !restrictedPermissions.has(perm));
}
