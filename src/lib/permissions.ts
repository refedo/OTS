// Permission system for Hexa Steel OTS

export type Permission = {
  id: string;
  name: string;
  description: string;
  category: string;
};

export type PermissionCategory = {
  id: string;
  name: string;
  permissions: Permission[];
};

// Define all available permissions
export const PERMISSIONS: PermissionCategory[] = [
  {
    id: 'users',
    name: 'User Management',
    permissions: [
      { id: 'users.view', name: 'View Users', description: 'View user list and details', category: 'users' },
      { id: 'users.create', name: 'Create Users', description: 'Create new user accounts', category: 'users' },
      { id: 'users.edit', name: 'Edit Users', description: 'Modify user information', category: 'users' },
      { id: 'users.delete', name: 'Delete Users', description: 'Delete user accounts', category: 'users' },
      { id: 'users.manage_roles', name: 'Manage User Roles', description: 'Assign roles to users', category: 'users' },
    ],
  },
  {
    id: 'roles',
    name: 'Role Management',
    permissions: [
      { id: 'roles.view', name: 'View Roles', description: 'View role list and details', category: 'roles' },
      { id: 'roles.create', name: 'Create Roles', description: 'Create new roles', category: 'roles' },
      { id: 'roles.edit', name: 'Edit Roles', description: 'Modify role information', category: 'roles' },
      { id: 'roles.delete', name: 'Delete Roles', description: 'Delete roles', category: 'roles' },
      { id: 'roles.manage_permissions', name: 'Manage Permissions', description: 'Assign permissions to roles', category: 'roles' },
    ],
  },
  {
    id: 'departments',
    name: 'Department Management',
    permissions: [
      { id: 'departments.view', name: 'View Departments', description: 'View department list and details', category: 'departments' },
      { id: 'departments.create', name: 'Create Departments', description: 'Create new departments', category: 'departments' },
      { id: 'departments.edit', name: 'Edit Departments', description: 'Modify department information', category: 'departments' },
      { id: 'departments.delete', name: 'Delete Departments', description: 'Delete departments', category: 'departments' },
    ],
  },
  {
    id: 'projects',
    name: 'Project Management',
    permissions: [
      { id: 'projects.view', name: 'View Projects', description: 'View project list and details', category: 'projects' },
      { id: 'projects.view_all', name: 'View All Projects', description: 'View all projects across departments', category: 'projects' },
      { id: 'projects.create', name: 'Create Projects', description: 'Create new projects', category: 'projects' },
      { id: 'projects.edit', name: 'Edit Projects', description: 'Modify project information', category: 'projects' },
      { id: 'projects.delete', name: 'Delete Projects', description: 'Delete projects', category: 'projects' },
      { id: 'projects.assign', name: 'Assign Projects', description: 'Assign users to projects', category: 'projects' },
    ],
  },
  {
    id: 'tasks',
    name: 'Task Management',
    permissions: [
      { id: 'tasks.view', name: 'View Tasks', description: 'View task list and details', category: 'tasks' },
      { id: 'tasks.view_all', name: 'View All Tasks', description: 'View all tasks across projects', category: 'tasks' },
      { id: 'tasks.create', name: 'Create Tasks', description: 'Create new tasks', category: 'tasks' },
      { id: 'tasks.edit', name: 'Edit Tasks', description: 'Modify task information', category: 'tasks' },
      { id: 'tasks.delete', name: 'Delete Tasks', description: 'Delete tasks', category: 'tasks' },
      { id: 'tasks.assign', name: 'Assign Tasks', description: 'Assign users to tasks', category: 'tasks' },
    ],
  },
  {
    id: 'production',
    name: 'Production Management',
    permissions: [
      { id: 'production.view_dashboard', name: 'View Production Dashboard', description: 'View production dashboard and overview', category: 'production' },
      { id: 'production.view_status', name: 'View Production Status', description: 'View production status reports', category: 'production' },
      { id: 'production.view_parts', name: 'View Assembly Parts', description: 'View assembly parts and raw data', category: 'production' },
      { id: 'production.create_parts', name: 'Create Assembly Parts', description: 'Create and upload assembly parts', category: 'production' },
      { id: 'production.edit_parts', name: 'Edit Assembly Parts', description: 'Modify assembly part information', category: 'production' },
      { id: 'production.delete_parts', name: 'Delete Assembly Parts', description: 'Delete assembly parts', category: 'production' },
      { id: 'production.view_logs', name: 'View Production Logs', description: 'View production logs and history', category: 'production' },
      { id: 'production.create_logs', name: 'Log Production', description: 'Create production logs (single and mass)', category: 'production' },
      { id: 'production.edit_logs', name: 'Edit Production Logs', description: 'Modify production log entries', category: 'production' },
      { id: 'production.delete_logs', name: 'Delete Production Logs', description: 'Delete production log entries', category: 'production' },
      { id: 'production.view_reports', name: 'View Dispatch Reports', description: 'View and generate dispatch reports', category: 'production' },
      { id: 'production.export_reports', name: 'Export Reports', description: 'Export production and dispatch reports', category: 'production' },
    ],
  },
  {
    id: 'quality',
    name: 'Quality Control',
    permissions: [
      { id: 'quality.view_itp', name: 'View ITP', description: 'View Inspection and Test Plans', category: 'quality' },
      { id: 'quality.create_itp', name: 'Create ITP', description: 'Create new ITP documents', category: 'quality' },
      { id: 'quality.edit_itp', name: 'Edit ITP', description: 'Modify ITP documents', category: 'quality' },
      { id: 'quality.approve_itp', name: 'Approve ITP', description: 'Approve ITP documents', category: 'quality' },
      { id: 'quality.view_wps', name: 'View WPS', description: 'View Welding Procedure Specifications', category: 'quality' },
      { id: 'quality.create_wps', name: 'Create WPS', description: 'Create new WPS documents', category: 'quality' },
      { id: 'quality.edit_wps', name: 'Edit WPS', description: 'Modify WPS documents', category: 'quality' },
      { id: 'quality.approve_wps', name: 'Approve WPS', description: 'Approve WPS documents', category: 'quality' },
      { id: 'quality.view_rfi', name: 'View RFI', description: 'View Requests for Inspection', category: 'quality' },
      { id: 'quality.create_rfi', name: 'Create RFI', description: 'Create RFI requests', category: 'quality' },
      { id: 'quality.approve_rfi', name: 'Approve RFI', description: 'Approve/Reject RFI requests', category: 'quality' },
      { id: 'quality.view_ncr', name: 'View NCR', description: 'View Non-Conformance Reports', category: 'quality' },
      { id: 'quality.create_ncr', name: 'Create NCR', description: 'Create NCR reports', category: 'quality' },
      { id: 'quality.close_ncr', name: 'Close NCR', description: 'Close NCR reports', category: 'quality' },
    ],
  },
  {
    id: 'planning',
    name: 'Project Planning',
    permissions: [
      { id: 'planning.view', name: 'View Planning', description: 'View project planning dashboard and timelines', category: 'planning' },
      { id: 'planning.create', name: 'Create Plans', description: 'Initialize project plans', category: 'planning' },
      { id: 'planning.edit', name: 'Edit Plans', description: 'Modify project phase timelines', category: 'planning' },
      { id: 'planning.delete', name: 'Delete Plans', description: 'Delete project phases', category: 'planning' },
    ],
  },
  {
    id: 'documents',
    name: 'Document Management',
    permissions: [
      { id: 'documents.view', name: 'View Documents', description: 'View document library', category: 'documents' },
      { id: 'documents.upload', name: 'Upload Documents', description: 'Upload new documents', category: 'documents' },
      { id: 'documents.edit', name: 'Edit Documents', description: 'Modify document information', category: 'documents' },
      { id: 'documents.delete', name: 'Delete Documents', description: 'Delete documents', category: 'documents' },
      { id: 'documents.approve', name: 'Approve Documents', description: 'Approve documents for release', category: 'documents' },
      { id: 'documents.manage_categories', name: 'Manage Categories', description: 'Create and manage document categories', category: 'documents' },
    ],
  },
  {
    id: 'buildings',
    name: 'Building Management',
    permissions: [
      { id: 'buildings.view', name: 'View Buildings', description: 'View building list and details', category: 'buildings' },
      { id: 'buildings.create', name: 'Create Buildings', description: 'Create new buildings', category: 'buildings' },
      { id: 'buildings.edit', name: 'Edit Buildings', description: 'Modify building information', category: 'buildings' },
      { id: 'buildings.delete', name: 'Delete Buildings', description: 'Delete buildings', category: 'buildings' },
    ],
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    permissions: [
      { id: 'reports.view', name: 'View Reports', description: 'View reports and analytics', category: 'reports' },
      { id: 'reports.export', name: 'Export Reports', description: 'Export reports to files', category: 'reports' },
      { id: 'reports.view_all', name: 'View All Reports', description: 'View reports across all departments', category: 'reports' },
    ],
  },
  {
    id: 'risk_management',
    name: 'Risk Management & Early Warning',
    permissions: [
      { id: 'risk.view_dashboard', name: 'View Risk Dashboard', description: 'Access early warning and risk dashboard', category: 'risk_management' },
      { id: 'risk.view_alerts', name: 'View Risk Alerts', description: 'View risk alerts and warnings', category: 'risk_management' },
      { id: 'risk.manage', name: 'Manage Risks', description: 'Create and manage risk items', category: 'risk_management' },
    ],
  },
  {
    id: 'operations_control',
    name: 'Operations Control',
    permissions: [
      { id: 'operations.view_dashboard', name: 'View Operations Dashboard', description: 'Access operations control dashboard', category: 'operations_control' },
      { id: 'operations.view_intelligence', name: 'View Intelligence', description: 'Access operations intelligence data', category: 'operations_control' },
      { id: 'operations.view_work_units', name: 'View Work Units', description: 'View work units and assignments', category: 'operations_control' },
      { id: 'operations.manage_work_units', name: 'Manage Work Units', description: 'Create and manage work units', category: 'operations_control' },
      { id: 'operations.view_dependencies', name: 'View Dependencies', description: 'View project dependencies', category: 'operations_control' },
      { id: 'operations.manage_dependencies', name: 'Manage Dependencies', description: 'Manage project dependencies', category: 'operations_control' },
      { id: 'operations.view_capacity', name: 'View Capacity', description: 'View capacity planning', category: 'operations_control' },
      { id: 'operations.ai_digest', name: 'AI Risk Digest', description: 'Access AI-generated risk digests', category: 'operations_control' },
    ],
  },
  {
    id: 'business_planning',
    name: 'Business Planning & Strategy',
    permissions: [
      { id: 'business.view_dashboard', name: 'View Business Dashboard', description: 'Access business planning dashboard', category: 'business_planning' },
      { id: 'business.view_foundation', name: 'View Strategic Foundation', description: 'View strategic foundation and vision', category: 'business_planning' },
      { id: 'business.edit_foundation', name: 'Edit Strategic Foundation', description: 'Edit strategic foundation', category: 'business_planning' },
      { id: 'business.view_swot', name: 'View SWOT Analysis', description: 'View SWOT analysis', category: 'business_planning' },
      { id: 'business.edit_swot', name: 'Edit SWOT Analysis', description: 'Create and edit SWOT analysis', category: 'business_planning' },
      { id: 'business.view_objectives', name: 'View Objectives (OKRs)', description: 'View company objectives and key results', category: 'business_planning' },
      { id: 'business.manage_objectives', name: 'Manage Objectives', description: 'Create and manage OKRs', category: 'business_planning' },
      { id: 'business.view_kpis', name: 'View KPIs', description: 'View business KPIs', category: 'business_planning' },
      { id: 'business.manage_kpis', name: 'Manage KPIs', description: 'Create and manage KPIs', category: 'business_planning' },
      { id: 'business.view_initiatives', name: 'View Initiatives', description: 'View business initiatives', category: 'business_planning' },
      { id: 'business.manage_initiatives', name: 'Manage Initiatives', description: 'Create and manage initiatives', category: 'business_planning' },
      { id: 'business.view_dept_plans', name: 'View Department Plans', description: 'View department plans', category: 'business_planning' },
      { id: 'business.manage_dept_plans', name: 'Manage Department Plans', description: 'Create and manage department plans', category: 'business_planning' },
      { id: 'business.view_issues', name: 'View Weekly Issues', description: 'View weekly issues', category: 'business_planning' },
      { id: 'business.manage_issues', name: 'Manage Weekly Issues', description: 'Create and manage weekly issues', category: 'business_planning' },
    ],
  },
  {
    id: 'knowledge_center',
    name: 'Knowledge Center',
    permissions: [
      { id: 'knowledge.view', name: 'View Knowledge', description: 'Access knowledge center and entries', category: 'knowledge_center' },
      { id: 'knowledge.create', name: 'Create Knowledge', description: 'Create new knowledge entries', category: 'knowledge_center' },
      { id: 'knowledge.edit', name: 'Edit Knowledge', description: 'Edit knowledge entries', category: 'knowledge_center' },
      { id: 'knowledge.delete', name: 'Delete Knowledge', description: 'Delete knowledge entries', category: 'knowledge_center' },
      { id: 'knowledge.validate', name: 'Validate Knowledge', description: 'Validate and approve knowledge entries', category: 'knowledge_center' },
    ],
  },
  {
    id: 'product_backlog',
    name: 'Product Backlog & Development',
    permissions: [
      { id: 'backlog.view', name: 'View Backlog', description: 'View product backlog board', category: 'product_backlog' },
      { id: 'backlog.create', name: 'Create Backlog Items', description: 'Create new backlog items', category: 'product_backlog' },
      { id: 'backlog.edit', name: 'Edit Backlog Items', description: 'Edit backlog items', category: 'product_backlog' },
      { id: 'backlog.delete', name: 'Delete Backlog Items', description: 'Delete backlog items', category: 'product_backlog' },
      { id: 'backlog.prioritize', name: 'Prioritize Backlog', description: 'Set priorities and manage backlog order', category: 'product_backlog' },
      { id: 'backlog.ceo_center', name: 'CEO Control Center', description: 'Access CEO control center', category: 'product_backlog' },
    ],
  },
  {
    id: 'notifications',
    name: 'Notifications & Events',
    permissions: [
      { id: 'notifications.view', name: 'View Notifications', description: 'View own notifications', category: 'notifications' },
      { id: 'notifications.view_all', name: 'View All Notifications', description: 'View all system notifications', category: 'notifications' },
      { id: 'notifications.manage', name: 'Manage Notifications', description: 'Create and manage system notifications', category: 'notifications' },
      { id: 'events.view', name: 'View System Events', description: 'View system events log', category: 'notifications' },
      { id: 'events.manage', name: 'Manage Events', description: 'Manage system events', category: 'notifications' },
      { id: 'governance.view', name: 'View Governance', description: 'Access governance center', category: 'notifications' },
    ],
  },
  {
    id: 'ai_assistant',
    name: 'AI Assistant',
    permissions: [
      { id: 'ai.use', name: 'Use AI Assistant', description: 'Access and use AI assistant', category: 'ai_assistant' },
      { id: 'ai.view_history', name: 'View AI History', description: 'View AI conversation history', category: 'ai_assistant' },
      { id: 'ai.admin', name: 'AI Administration', description: 'Manage AI settings and configurations', category: 'ai_assistant' },
    ],
  },
  {
    id: 'timeline',
    name: 'Timeline & Scheduling',
    permissions: [
      { id: 'timeline.view', name: 'View Timeline', description: 'View project timelines', category: 'timeline' },
      { id: 'timeline.edit', name: 'Edit Timeline', description: 'Edit project timelines', category: 'timeline' },
      { id: 'timeline.operations', name: 'Operations Timeline', description: 'Access operations timeline', category: 'timeline' },
      { id: 'timeline.engineering', name: 'Engineering Timeline', description: 'Access engineering document timeline', category: 'timeline' },
      { id: 'timeline.events', name: 'Event Management', description: 'Manage timeline events', category: 'timeline' },
    ],
  },
  {
    id: 'settings',
    name: 'System Settings',
    permissions: [
      { id: 'settings.view', name: 'View Settings', description: 'View system settings', category: 'settings' },
      { id: 'settings.edit', name: 'Edit Settings', description: 'Modify system settings', category: 'settings' },
    ],
  },
];

// Flatten all permissions for easy lookup
export const ALL_PERMISSIONS = PERMISSIONS.flatMap(cat => cat.permissions);

// Helper function to check if a user has a specific permission
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission);
}

// Helper function to check if a user has any of the required permissions
export function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some(perm => userPermissions.includes(perm));
}

// Helper function to check if a user has all required permissions
export function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every(perm => userPermissions.includes(perm));
}

// Get permissions by category
export function getPermissionsByCategory(categoryId: string): Permission[] {
  const category = PERMISSIONS.find(cat => cat.id === categoryId);
  return category?.permissions || [];
}

// Get permission details by ID
export function getPermissionById(permissionId: string): Permission | undefined {
  return ALL_PERMISSIONS.find(perm => perm.id === permissionId);
}

// Default role permissions (for seeding)
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: ALL_PERMISSIONS.map(p => p.id), // Admin has all permissions
  Manager: [
    // User Management
    'users.view',
    'users.create',
    'users.edit',
    'departments.view',
    'departments.edit',
    // Project Management
    'projects.view',
    'projects.view_all',
    'projects.create',
    'projects.edit',
    'projects.assign',
    'buildings.view',
    'buildings.create',
    'buildings.edit',
    // Task Management
    'tasks.view',
    'tasks.view_all',
    'tasks.create',
    'tasks.edit',
    'tasks.assign',
    // Production Management
    'production.view_dashboard',
    'production.view_status',
    'production.view_parts',
    'production.create_parts',
    'production.edit_parts',
    'production.view_logs',
    'production.create_logs',
    'production.edit_logs',
    'production.view_reports',
    'production.export_reports',
    // Quality Control
    'quality.view_itp',
    'quality.create_itp',
    'quality.edit_itp',
    'quality.approve_itp',
    'quality.view_wps',
    'quality.create_wps',
    'quality.edit_wps',
    'quality.approve_wps',
    // Project Planning
    'planning.view',
    'planning.create',
    'planning.edit',
    'planning.delete',
    // Document Management
    'documents.view',
    'documents.upload',
    'documents.edit',
    'documents.approve',
    'documents.manage_categories',
    // Reports
    'reports.view',
    'reports.export',
    // Risk Management
    'risk.view_dashboard',
    'risk.view_alerts',
    'risk.manage',
    // Operations Control
    'operations.view_dashboard',
    'operations.view_intelligence',
    'operations.view_work_units',
    'operations.manage_work_units',
    'operations.view_dependencies',
    'operations.manage_dependencies',
    'operations.view_capacity',
    'operations.ai_digest',
    // Business Planning
    'business.view_dashboard',
    'business.view_foundation',
    'business.view_swot',
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
    // Knowledge Center
    'knowledge.view',
    'knowledge.create',
    'knowledge.edit',
    'knowledge.validate',
    // Product Backlog
    'backlog.view',
    'backlog.create',
    'backlog.edit',
    'backlog.prioritize',
    // Notifications
    'notifications.view',
    'notifications.view_all',
    'events.view',
    'governance.view',
    // AI Assistant
    'ai.use',
    'ai.view_history',
    // Timeline
    'timeline.view',
    'timeline.edit',
    'timeline.operations',
    'timeline.engineering',
    'timeline.events',
  ],
  Engineer: [
    // Basic Access
    'users.view',
    'departments.view',
    // Project Access
    'projects.view',
    'buildings.view',
    // Task Management
    'tasks.view',
    'tasks.edit',
    // Production Access
    'production.view_dashboard',
    'production.view_status',
    'production.view_parts',
    'production.create_parts',
    'production.view_logs',
    'production.create_logs',
    'production.view_reports',
    // Quality Control
    'quality.view_itp',
    'quality.create_itp',
    'quality.edit_itp',
    'quality.view_wps',
    'quality.create_wps',
    'quality.edit_wps',
    // Project Planning
    'planning.view',
    // Document Access
    'documents.view',
    'documents.upload',
    // Reports
    'reports.view',
    // Risk Management
    'risk.view_dashboard',
    'risk.view_alerts',
    // Operations Control
    'operations.view_dashboard',
    'operations.view_intelligence',
    'operations.view_work_units',
    'operations.view_dependencies',
    'operations.view_capacity',
    // Business Planning (View Only)
    'business.view_dashboard',
    'business.view_foundation',
    'business.view_swot',
    'business.view_objectives',
    'business.view_kpis',
    'business.view_initiatives',
    // Knowledge Center
    'knowledge.view',
    'knowledge.create',
    'knowledge.edit',
    // Product Backlog
    'backlog.view',
    'backlog.create',
    'backlog.edit',
    // Notifications
    'notifications.view',
    'events.view',
    // AI Assistant
    'ai.use',
    'ai.view_history',
    // Timeline
    'timeline.view',
    'timeline.operations',
    'timeline.engineering',
  ],
  Operator: [
    // Basic Access
    'projects.view',
    'buildings.view',
    // Task Access
    'tasks.view',
    'tasks.edit',
    // Production Access (Read-Only + Logging)
    'production.view_dashboard',
    'production.view_status',
    'production.view_parts',
    'production.view_logs',
    'production.create_logs',
    'production.view_reports',
    // Quality View
    'quality.view_itp',
    'quality.view_wps',
    // Document View
    'documents.view',
    // Risk Management (View Only)
    'risk.view_dashboard',
    'risk.view_alerts',
    // Operations Control (View Only)
    'operations.view_dashboard',
    'operations.view_work_units',
    // Knowledge Center (View Only)
    'knowledge.view',
    // Notifications
    'notifications.view',
    // AI Assistant
    'ai.use',
    // Timeline (View Only)
    'timeline.view',
    'timeline.operations',
  ],
};
