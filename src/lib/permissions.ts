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
      { id: 'projects.create', name: 'Create Projects', description: 'Create new projects via project wizard', category: 'projects' },
      { id: 'projects.edit', name: 'Edit Projects', description: 'Modify project information', category: 'projects' },
      { id: 'projects.delete', name: 'Delete Projects', description: 'Delete projects', category: 'projects' },
      { id: 'projects.assign', name: 'Assign Projects', description: 'Assign users to projects', category: 'projects' },
      { id: 'projects.browse_users', name: 'Browse Users for Assignment', description: 'Browse user lists when assigning project managers or team members (without full user management access)', category: 'projects' },
    ],
  },
  {
    id: 'tasks',
    name: 'Task Management',
    permissions: [
      { id: 'tasks.view', name: 'View Tasks', description: 'View task list and details', category: 'tasks' },
      { id: 'tasks.view_all', name: 'View All Tasks', description: 'View all tasks across projects', category: 'tasks' },
      { id: 'tasks.view_others', name: 'View Other Users Tasks', description: 'View tasks assigned to other users', category: 'tasks' },
      { id: 'tasks.create', name: 'Create Tasks', description: 'Create new tasks', category: 'tasks' },
      { id: 'tasks.edit', name: 'Edit Own Tasks', description: 'Modify own assigned tasks', category: 'tasks' },
      { id: 'tasks.edit_all', name: 'Edit All Tasks', description: 'Modify any task regardless of assignment', category: 'tasks' },
      { id: 'tasks.delete', name: 'Delete Own Tasks', description: 'Delete own tasks', category: 'tasks' },
      { id: 'tasks.delete_all', name: 'Delete All Tasks', description: 'Delete any task regardless of assignment', category: 'tasks' },
      { id: 'tasks.assign', name: 'Assign Tasks', description: 'Assign users to tasks', category: 'tasks' },
      { id: 'tasks.manage', name: 'Full Task Management', description: 'Complete control over all tasks (legacy permission)', category: 'tasks' },
      { id: 'tasks.manage_ceo_tasks', name: 'Manage CEO Tasks', description: 'Create, view, and modify CEO-level tasks', category: 'tasks' },
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
      // 18.11.0 — Announcements
      { id: 'announcements.view', name: 'View Announcements', description: 'View company-wide and targeted announcements', category: 'notifications' },
      { id: 'announcements.create', name: 'Create Announcements', description: 'Draft and publish new announcements (HR team)', category: 'notifications' },
      { id: 'announcements.manage', name: 'Manage Announcements', description: 'Edit, deactivate, and delete any announcement', category: 'notifications' },
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
    id: 'financial',
    name: 'Financial Module',
    permissions: [
      { id: 'financial.view', name: 'View Financial Reports', description: 'Access financial dashboard and reports', category: 'financial' },
      { id: 'financial.manage', name: 'Manage Financial Data', description: 'Manage chart of accounts and financial settings', category: 'financial' },
      { id: 'financial.sync', name: 'Run Financial Sync', description: 'Trigger Dolibarr financial data sync', category: 'financial' },
      { id: 'financial.export', name: 'Export Financial Reports', description: 'Export financial reports to files', category: 'financial' },
    ],
  },
  {
    id: 'dolibarr',
    name: 'Dolibarr Integration',
    permissions: [
      { id: 'dolibarr.view', name: 'View Dolibarr Dashboard', description: 'Access Dolibarr integration dashboard', category: 'dolibarr' },
      { id: 'dolibarr.sync', name: 'Run Dolibarr Sync', description: 'Trigger Dolibarr data synchronization', category: 'dolibarr' },
    ],
  },
  {
    id: 'supply_chain',
    name: 'Supply Chain Management',
    permissions: [
      { id: 'supply_chain.view', name: 'View Supply Chain', description: 'Access LCR data, reports, and procurement tracking', category: 'supply_chain' },
      { id: 'supply_chain.sync', name: 'Run LCR Sync', description: 'Trigger manual Google Sheets sync for LCR data', category: 'supply_chain' },
      { id: 'supply_chain.alias', name: 'Manage Aliases', description: 'Create and manage supplier/building alias mappings with auto back-fill', category: 'supply_chain' },
    ],
  },
  {
    id: 'project_tracker',
    name: 'Project Status Tracker',
    permissions: [
      { id: 'project_tracker.view', name: 'View Project Tracker', description: 'Access the project status tracker dashboard', category: 'project_tracker' },
      { id: 'project_tracker.export', name: 'Export Tracker Data', description: 'Export project tracker data to CSV/PDF', category: 'project_tracker' },
    ],
  },
  {
    id: 'settings',
    name: 'System Settings',
    permissions: [
      { id: 'settings.view', name: 'View Settings', description: 'View system settings', category: 'settings' },
      { id: 'settings.edit', name: 'Edit Settings', description: 'Modify system settings', category: 'settings' },
      { id: 'settings.view_cron', name: 'View Cron Jobs', description: 'View scheduled cron job definitions and status', category: 'settings' },
      { id: 'settings.manage_cron', name: 'Manage Cron Jobs', description: 'Manually trigger cron jobs from the settings UI', category: 'settings' },
    ],
  },
  {
    id: 'executive',
    name: 'Executive Command Center',
    permissions: [
      { id: 'executive.view', name: 'View Executive Dashboard', description: 'Access the Executive Command Center — real-time CEO/CFO operational intelligence dashboard', category: 'executive' },
    ],
  },
  {
    id: 'backups',
    name: 'Backup Management',
    permissions: [
      { id: 'backups.view', name: 'View Backups', description: 'View system backup list and details', category: 'backups' },
      { id: 'backups.create', name: 'Create Backups', description: 'Trigger new database backups', category: 'backups' },
      { id: 'backups.delete', name: 'Delete Backups', description: 'Delete existing backup files', category: 'backups' },
      { id: 'backups.download', name: 'Download Backups', description: 'Download backup files', category: 'backups' },
      { id: 'backups.restore', name: 'Restore from Backup', description: 'Restore the database from a backup file', category: 'backups' },
    ],
  },
  {
    id: 'hr',
    name: 'HR & Employee Management',
    permissions: [
      { id: 'hr.employee.view', name: 'View Employees', description: 'View employee master data', category: 'hr' },
      { id: 'hr.employee.create', name: 'Create Employees', description: 'Add new employee records', category: 'hr' },
      { id: 'hr.employee.edit', name: 'Edit Employees', description: 'Modify employee records', category: 'hr' },
      { id: 'hr.employee.delete', name: 'Delete Employees', description: 'Soft-delete employee records', category: 'hr' },
      { id: 'hr.employee.viewCompensation', name: 'View Compensation', description: 'See employee salary and allowance fields', category: 'hr' },
      { id: 'hr.employee.sync', name: 'Sync Employees from Dolibarr', description: 'Trigger the Dolibarr → OTS employee mirror', category: 'hr' },
      { id: 'hr.employee.resetToDolibarr', name: 'Reset Employee to Dolibarr', description: 'Discard manual edits and re-pull an employee from Dolibarr on next sync', category: 'hr' },
      // 19.14.0 — Employee self-service (viewOwn)
      { id: 'hr.employee.viewOwn', name: 'View Own Employee Profile', description: 'Navigate to and view own HR profile page (read-only, no compensation fields). Granted to every employee-level role.', category: 'hr' },
      // 18.9.0 — Employment & salary history (HR/Payroll Phase 1)
      { id: 'hr.employee.positionHistory.view', name: 'View Position History', description: 'View each employee\u2019s timeline of position / department changes', category: 'hr' },
      { id: 'hr.employee.positionHistory.manage', name: 'Manage Position History', description: 'Record promotions, transfers, demotions, and role changes on the employee timeline', category: 'hr' },
      { id: 'hr.employee.salaryHistory.view', name: 'View Salary History', description: 'View each employee\u2019s timeline of basic + allowance changes', category: 'hr' },
      { id: 'hr.employee.salaryHistory.manage', name: 'Manage Salary History', description: 'Draft and submit raises, increments, and salary adjustments into the approval cycle', category: 'hr' },
      { id: 'hr.employee.salaryHistory.approveHr', name: 'HR-Approve Salary Changes', description: 'HR step in the raise approval cycle (forwards to CEO for final sign-off)', category: 'hr' },
      { id: 'hr.employee.salaryHistory.approveCeo', name: 'CEO-Approve Salary Changes', description: 'Final CEO sign-off on any raise or salary adjustment \u2014 only CEO-level roles should hold this', category: 'hr' },
      { id: 'hr.agency.view', name: 'View Agencies', description: 'View manpower agency list and details', category: 'hr' },
      { id: 'hr.agency.manage', name: 'Manage Agencies', description: 'Create, edit, and soft-delete manpower agencies', category: 'hr' },
      { id: 'hr.manpowerSlot.view', name: 'View Manpower Slots', description: 'View manpower slot list (agency card codes, hourly rates)', category: 'hr' },
      { id: 'hr.manpowerSlot.manage', name: 'Manage Manpower Slots', description: 'Create, edit, bulk-create, and soft-delete manpower slots', category: 'hr' },
      { id: 'hr.attendance.view', name: 'View Attendance', description: 'View attendance records for all workers', category: 'hr' },
      { id: 'hr.attendance.sync', name: 'Sync Attendance from Google Sheet', description: 'Trigger the Google Sheet → OTS attendance mirror', category: 'hr' },
      { id: 'hr.attendance.probe', name: 'Probe Attendance Sheet', description: 'Dump raw Google Sheet rows for debugging the parser', category: 'hr' },
      { id: 'hr.holiday.view', name: 'View Public Holidays', description: 'View the public holiday calendar', category: 'hr' },
      { id: 'hr.holiday.manage', name: 'Manage Public Holidays', description: 'Create, edit, and delete public holiday entries', category: 'hr' },
      { id: 'hr.section.manage', name: 'Manage HR Sections', description: 'Create, rename, reorder, and archive HR section dropdown options (Preparation / Fabrication / Other)', category: 'hr' },
      // Phase 3 — Leaves
      { id: 'hr.leaves.request', name: 'Request Leaves', description: 'Submit personal leave requests', category: 'hr' },
      { id: 'hr.leaves.view', name: 'View Own Leaves', description: 'View own leave history and balances', category: 'hr' },
      { id: 'hr.leaves.viewAll', name: 'View All Leaves', description: 'View leave requests and balances for every employee', category: 'hr' },
      { id: 'hr.leaves.approve', name: 'Approve Leaves', description: 'Approve or reject leave requests at any stage of the chain', category: 'hr' },
      { id: 'hr.leaves.adjust', name: 'Adjust Leave Balances', description: 'Manually adjust leave balances with an audit reason', category: 'hr' },
      { id: 'hr.leaves.manageTypes', name: 'Manage Leave Types', description: 'Create, rename, archive leave types and set accrual/carry-over rules', category: 'hr' },
      { id: 'hr.leaves.sync', name: 'Sync Leaves from Dolibarr', description: 'Trigger the Dolibarr → OTS leaves mirror and view sync history', category: 'hr' },
      // Phase 3 — Payroll
      { id: 'hr.payroll.view', name: 'View Payroll', description: 'View payroll periods and payslips for all employees', category: 'hr' },
      { id: 'hr.payroll.viewOwn', name: 'View Own Payslip', description: 'View and download own payslips', category: 'hr' },
      { id: 'hr.payroll.calculate', name: 'Calculate Payroll', description: 'Run or rerun payroll calculation for a period', category: 'hr' },
      { id: 'hr.payroll.approve', name: 'Approve Payroll', description: 'Approve or reject a calculated payroll period', category: 'hr' },
      { id: 'hr.payroll.lock', name: 'Lock Payroll', description: 'Lock an approved payroll period (terminal)', category: 'hr' },
      { id: 'hr.payroll.adjust', name: 'Adjust Payroll', description: 'Add bonuses, deductions, or advance repayments to a period', category: 'hr' },
      { id: 'hr.payroll.export', name: 'Export WPS File', description: 'Generate and download the Alinma Bank WPS file for a period', category: 'hr' },
      { id: 'hr.payroll.settings', name: 'Manage Payroll Settings', description: 'Edit GOSI rates, daily-rate basis, OT multiplier, WPS bank and approval chain', category: 'hr' },
      // Phase 3 — End-of-Service
      { id: 'hr.eos.view', name: 'View End-of-Service Awards', description: 'View EOS gratuity records', category: 'hr' },
      { id: 'hr.eos.calculate', name: 'Calculate End-of-Service', description: 'Run EOS gratuity calculation for a terminated employee', category: 'hr' },
      { id: 'hr.eos.pay', name: 'Mark EOS Paid', description: 'Mark an EOS award as paid', category: 'hr' },
      // 18.10.0 — Loans & Custodies
      { id: 'hr.loans.view', name: 'View Employee Loans', description: 'View loan records for all employees', category: 'hr' },
      { id: 'hr.loans.viewOwn', name: 'View Own Loans', description: 'View own active and historical loan records (read-only, self-service)', category: 'hr' },
      { id: 'hr.loans.manage', name: 'Manage Employee Loans', description: 'Create, edit, and cancel employee loans', category: 'hr' },
      { id: 'hr.custodies.view', name: 'View Employee Custodies', description: 'View custody (cash advance / asset) records for all employees', category: 'hr' },
      { id: 'hr.custodies.viewOwn', name: 'View Own Custodies', description: 'View own cash advances and custody records (read-only, self-service)', category: 'hr' },
      { id: 'hr.custodies.manage', name: 'Manage Employee Custodies', description: 'Create, edit, settle, and cancel employee custodies', category: 'hr' },
      // 18.12.0 — Asset Management
      { id: 'hr.assets.view', name: 'View Assets', description: 'View company asset registry and employee assignments', category: 'hr' },
      { id: 'hr.assets.viewOwn', name: 'View Own Asset Assignments', description: 'View assets currently or previously assigned to you (read-only, self-service)', category: 'hr' },
      { id: 'hr.assets.manage', name: 'Manage Assets', description: 'Create, edit, assign, return, and retire company assets', category: 'hr' },
      { id: 'hr.violations.view', name: 'View Traffic Violations', description: 'View traffic violations and infractions for employees', category: 'hr' },
      { id: 'hr.violations.viewOwn', name: 'View Own Traffic Violations', description: 'View your own traffic violations and infraction records (read-only, self-service)', category: 'hr' },
      { id: 'hr.violations.manage', name: 'Manage Traffic Violations', description: 'Record, update, and close traffic violations and infractions', category: 'hr' },
      { id: 'hr.carMaintenance.view', name: 'View Car Maintenance', description: 'View vehicle maintenance records and service history', category: 'hr' },
      { id: 'hr.carMaintenance.manage', name: 'Manage Car Maintenance', description: 'Create and update vehicle maintenance and service records', category: 'hr' },
      // Phase 4 — Manpower Billing
      { id: 'hr.billing.view', name: 'View Manpower Invoices', description: 'View agency invoice drafts generated from manpower attendance', category: 'hr' },
      { id: 'hr.billing.manage', name: 'Manage Manpower Invoices', description: 'Review, adjust, confirm, and mark manpower invoice drafts as paid', category: 'hr' },
      { id: 'hr.billing.push', name: 'Push Invoices to Dolibarr', description: 'Push confirmed manpower invoice drafts as vendor invoices in Dolibarr', category: 'hr' },
      // 18.14.0 — Contracts & Documents Management
      { id: 'hr.contracts.view', name: 'View Contracts', description: 'View company contracts, Iqamas, insurance policies, and legal documents', category: 'hr' },
      { id: 'hr.contracts.manage', name: 'Manage Contracts', description: 'Create, edit, and delete contracts and documents; receive expiry notifications', category: 'hr' },
      // 18.16.0 — Letters & Correspondence
      { id: 'hr.letters.view', name: 'View Letters', description: 'View HR letters and correspondence issued to employees', category: 'hr' },
      { id: 'hr.letters.viewOwn', name: 'View Own HR Letters', description: 'View HR letters and correspondence addressed to you (read-only, self-service)', category: 'hr' },
      { id: 'hr.letters.manage', name: 'Manage Letters', description: 'Create, edit, and delete HR letters and correspondence', category: 'hr' },
      { id: 'hr.letters.approveCeo', name: 'CEO-Approve Letters', description: 'Final CEO sign-off on HR letters — approve or reject letters pending approval', category: 'hr' },
      // 19.4.0 — HR Absence Analytics
      { id: 'hr.analytics.view', name: 'View HR Analytics', description: 'Access the absence and leave behavioral analytics dashboard', category: 'hr' },
    ],
  },
  {
    id: 'admin',
    name: 'System Administration',
    permissions: [
      { id: 'admin.identity.reconcile', name: 'Identity Reconciliation', description: 'Run the one-time wizard linking OTS users to their Dolibarr llx_user identity. CEO-only.', category: 'admin' },
    ],
  },
  {
    id: 'ops_agent',
    name: 'Ops Agent',
    permissions: [
      { id: 'ops_agent.view', name: 'View Ops Agent', description: 'View the Ops Agent dashboard, run history, and risk flags', category: 'ops_agent' },
      { id: 'ops_agent.run', name: 'Trigger Ops Agent Run', description: 'Manually trigger an Ops Agent sweep', category: 'ops_agent' },
      { id: 'ops_agent.configure', name: 'Configure Ops Agent', description: 'Change agent mode, thresholds, and module settings', category: 'ops_agent' },
      { id: 'ops_agent.resolve_flags', name: 'Resolve Risk Flags', description: 'Mark Ops Agent risk flags as resolved', category: 'ops_agent' },
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
  Admin: ALL_PERMISSIONS.map(p => p.id), // Admin has all permissions (includes financial, dolibarr, hr, admin)
  // CEO retains every permission including the admin.identity.reconcile gate
  CEO: ALL_PERMISSIONS.map(p => p.id),
  // HR role — created at runtime in OTS (not in prisma/seed.ts). Walid runs
  // `scripts/update-hr-role-permissions.ts` to patch the existing role's
  // permissions JSON. HR Admin can manage employees/agencies/slots, view
  // compensation, and trigger the Dolibarr sync — but cannot reset manual
  // edits (that's CEO-only) or run identity reconciliation.
  HR: [
    // Basic OTS access to find users and departments
    'users.view',
    'departments.view',
    'notifications.view',
    'events.view',
    'ai.use',
    // Full HR module
    'hr.employee.view',
    'hr.employee.create',
    'hr.employee.edit',
    'hr.employee.delete',
    'hr.employee.viewCompensation',
    'hr.employee.sync',
    'hr.employee.positionHistory.view',
    'hr.employee.positionHistory.manage',
    'hr.employee.salaryHistory.view',
    'hr.employee.salaryHistory.manage',
    'hr.employee.salaryHistory.approveHr',
    'hr.loans.view',
    'hr.loans.manage',
    'hr.custodies.view',
    'hr.custodies.manage',
    'hr.agency.view',
    'hr.agency.manage',
    'hr.manpowerSlot.view',
    'hr.manpowerSlot.manage',
    // Phase 2 — Attendance / Leaves / Overtime
    'hr.attendance.view',
    'hr.attendance.sync',
    'hr.attendance.probe',
    'hr.holiday.view',
    'hr.holiday.manage',
    'hr.section.manage',
    'hr.leaves.sync',
    // Phase 3 — Payroll
    'hr.payroll.view',
    'hr.payroll.calculate',
    'hr.payroll.approve',
    'hr.payroll.lock',
    'hr.payroll.adjust',
    'hr.payroll.export',
    'hr.payroll.settings',
    // Phase 4 — Manpower Billing
    'hr.billing.view',
    'hr.billing.manage',
    'hr.billing.push',
    // 18.14.0 — Contracts & Documents
    'hr.contracts.view',
    'hr.contracts.manage',
    // 18.16.0 — Letters & Correspondence
    'hr.letters.view',
    'hr.letters.manage',
    // 19.4.0 — HR Absence Analytics
    'hr.analytics.view',
    // 19.14.0 — HR Self-Service (viewOwn — so HR staff can test as employees)
    'hr.employee.viewOwn',
    'hr.loans.viewOwn',
    'hr.custodies.viewOwn',
    'hr.assets.viewOwn',
    'hr.violations.viewOwn',
    'hr.letters.viewOwn',
  ],
  // 19.14.0 — Employee self-service role: base permissions for any OTS-linked employee
  Employee: [
    'notifications.view',
    'announcements.view',
    // HR self-service
    'hr.employee.viewOwn',
    'hr.leaves.view',
    'hr.leaves.request',
    'hr.payroll.viewOwn',
    'hr.loans.viewOwn',
    'hr.custodies.viewOwn',
    'hr.assets.viewOwn',
    'hr.violations.viewOwn',
    'hr.letters.viewOwn',
  ],
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
    'tasks.view_others',
    'tasks.create',
    'tasks.edit',
    'tasks.edit_all',
    'tasks.delete',
    'tasks.delete_all',
    'tasks.assign',
    'tasks.manage',
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
    // Financial Module
    'financial.view',
    'financial.manage',
    'financial.sync',
    'financial.export',
    // Dolibarr
    'dolibarr.view',
    'dolibarr.sync',
    // Supply Chain
    'supply_chain.view',
    'supply_chain.sync',
    'supply_chain.alias',
    // Project Tracker
    'project_tracker.view',
    'project_tracker.export',
    // Executive Command Center
    'executive.view',
    // 19.14.0 — HR Self-Service (Managers are employees too)
    'hr.employee.viewOwn',
    'hr.leaves.view',
    'hr.leaves.request',
    'hr.payroll.viewOwn',
    'hr.loans.viewOwn',
    'hr.custodies.viewOwn',
    'hr.assets.viewOwn',
    'hr.violations.viewOwn',
    'hr.letters.viewOwn',
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
    'tasks.delete',
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
    // Project Tracker
    'project_tracker.view',
    // 19.14.0 — HR Self-Service
    'hr.employee.viewOwn',
    'hr.leaves.view',
    'hr.leaves.request',
    'hr.payroll.viewOwn',
    'hr.loans.viewOwn',
    'hr.custodies.viewOwn',
    'hr.assets.viewOwn',
    'hr.violations.viewOwn',
    'hr.letters.viewOwn',
  ],
  Operator: [
    // Basic Access
    'projects.view',
    'buildings.view',
    // Task Access
    'tasks.view',
    'tasks.edit',
    'tasks.delete',
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
    // 19.14.0 — HR Self-Service
    'hr.employee.viewOwn',
    'hr.leaves.view',
    'hr.leaves.request',
    'hr.payroll.viewOwn',
    'hr.loans.viewOwn',
    'hr.custodies.viewOwn',
    'hr.assets.viewOwn',
    'hr.violations.viewOwn',
    'hr.letters.viewOwn',
  ],
  'Document Controller': [
    // Basic Access
    'users.view',
    'departments.view',
    // Project Access
    'projects.view',
    'projects.view_all',
    'buildings.view',
    // Task Management
    'tasks.view',
    'tasks.view_all',
    'tasks.view_others',
    'tasks.create',
    'tasks.edit',
    'tasks.edit_all',
    'tasks.delete',
    'tasks.delete_all',
    'tasks.assign',
    // Document Management (Full Access)
    'documents.view',
    'documents.upload',
    'documents.edit',
    'documents.approve',
    'documents.manage_categories',
    // Quality Control (Document Related)
    'quality.view_itp',
    'quality.view_wps',
    'quality.view_rfi',
    'quality.view_ncr',
    // Project Planning
    'planning.view',
    // Reports
    'reports.view',
    'reports.export',
    // Knowledge Center
    'knowledge.view',
    'knowledge.create',
    'knowledge.edit',
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
    'timeline.engineering',
    'timeline.events',
    // Settings
    'settings.view',
    'settings.view_cron',
    // 19.14.0 — HR Self-Service
    'hr.employee.viewOwn',
    'hr.leaves.view',
    'hr.leaves.request',
    'hr.payroll.viewOwn',
    'hr.loans.viewOwn',
    'hr.custodies.viewOwn',
    'hr.assets.viewOwn',
    'hr.violations.viewOwn',
    'hr.letters.viewOwn',
  ],
};
