// Navigation permission mapping
// Maps navigation items to required permissions

export type NavigationPermissionMap = {
  [key: string]: string | string[] | null; // null means no permission required (public)
};

// Map navigation items to required permissions
// If a user has ANY of the listed permissions, they can access the module
export const NAVIGATION_PERMISSIONS: NavigationPermissionMap = {
  // Single navigation items
  '/dashboard': null, // Everyone can access dashboard
  '/risk-dashboard': ['risk.view_dashboard', 'risk.view_alerts'],
  '/tasks': ['tasks.view', 'tasks.view_all'],
  '/tasks?filter=my-tasks': ['tasks.view'],
  '/tasks?filter=requested-by-me': ['tasks.view'],
  '/tasks/new': ['tasks.create'],
  '/tasks/dashboard': ['tasks.view_all'],
  '/ai-assistant': ['ai.use'],
  
  // Operations Control
  '/operations-control': ['operations.view_dashboard'],
  '/operations-control/intelligence': ['operations.view_intelligence'],
  '/operations-control/work-units': ['operations.view_work_units', 'operations.manage_work_units'],
  '/operations-control/dependencies': ['operations.view_dependencies', 'operations.manage_dependencies'],
  '/operations-control/capacity': ['operations.view_capacity'],
  '/operations-control/ai-digest': ['operations.ai_digest'],
  '/operations-control/guide': ['operations.view_dashboard'],
  
  // Notifications
  '/notifications': ['notifications.view'],
  '/notifications?tab=delayed-tasks': ['notifications.view'],
  '/notifications?tab=approvals': ['notifications.view'],
  '/notifications?tab=deadlines': ['notifications.view'],
  '/events': ['events.view'],
  '/governance': ['governance.view'],
  
  // Projects
  '/projects-dashboard': ['projects.view', 'projects.view_all'],
  '/projects': ['projects.view', 'projects.view_all'],
  '/buildings': ['buildings.view'],
  '/projects/wizard': ['projects.create'],
  '/planning': ['planning.view'],
  '/timeline': ['timeline.view'],
  '/operations/dashboard': ['timeline.operations'],
  '/operations/events': ['timeline.events'],
  '/document-timeline': ['timeline.engineering'],
  
  // Production
  '/production': ['production.view_dashboard'],
  '/reports': ['reports.view', 'production.view_reports'],
  '/production/work-orders': ['production.view_dashboard'],
  '/production/status': ['production.view_status'],
  '/production/assembly-parts': ['production.view_parts'],
  '/production/logs': ['production.view_logs'],
  '/pts-sync-simple': ['production.create_parts', 'production.edit_parts'],
  '/production/dispatch-reports': ['production.view_reports'],
  '/production/reports/daily': ['production.view_reports'],
  '/production/reports/period': ['production.view_reports'],
  '/production/reports/production-plan': ['production.view_reports'],
  '/production/reports/status-by-name': ['production.view_reports'],
  '/production/mass-log': ['production.create_logs'],
  '/settings/production': ['settings.edit', 'production.view_dashboard'],
  
  // Quality Control
  '/qc': ['quality.view_itp', 'quality.view_wps', 'quality.view_rfi'],
  '/qc/material': ['quality.view_itp'],
  '/qc/welding': ['quality.view_wps'],
  '/qc/dimensional': ['quality.view_itp'],
  '/qc/ndt': ['quality.view_itp'],
  '/qc/rfi': ['quality.view_rfi'],
  '/qc/rfi/new': ['quality.create_rfi', 'quality.view_rfi'],
  '/qc/ncr': ['quality.view_ncr'],
  '/qc/ncr/new': ['quality.create_ncr', 'quality.view_ncr'],
  '/itp': ['quality.view_itp'],
  '/itp/new': ['quality.create_itp'],
  '/wps': ['quality.view_wps'],
  '/wps/new': ['quality.create_wps'],
  
  // Documentation
  '/documents': ['documents.view'],
  '/documents/upload': ['documents.upload'],
  '/documents/categories': ['documents.manage_categories'],
  
  // Business Planning
  '/business-planning/dashboard': ['business.view_dashboard'],
  '/business-planning/guide': ['business.view_dashboard'],
  '/business-planning/foundation': ['business.view_foundation', 'business.edit_foundation'],
  '/business-planning/strategic-objectives': ['business.view_objectives', 'business.manage_objectives'],
  '/business-planning/swot': ['business.view_swot', 'business.edit_swot'],
  '/business-planning/objectives': ['business.view_objectives', 'business.manage_objectives'],
  '/business-planning/kpis': ['business.view_kpis', 'business.manage_kpis'],
  '/business-planning/initiatives': ['business.view_initiatives', 'business.manage_initiatives'],
  '/business-planning/departments': ['business.view_dept_plans', 'business.manage_dept_plans'],
  '/business-planning/issues': ['business.view_issues', 'business.manage_issues'],
  
  // Knowledge Center
  '/knowledge-center': ['knowledge.view'],
  '/knowledge-center/new': ['knowledge.create'],
  
  // Product Backlog
  '/backlog/new': ['backlog.create'],
  '/backlog': ['backlog.view'],
  '/ceo-control-center': ['backlog.ceo_center'],
  
  // Financial Reports
  '/financial': ['financial.view'],
  '/financial/chart-of-accounts': ['financial.manage', 'financial.view'],
  '/financial/reports/trial-balance': ['financial.view'],
  '/financial/reports/income-statement': ['financial.view'],
  '/financial/reports/balance-sheet': ['financial.view'],
  '/financial/reports/vat': ['financial.view'],
  '/financial/reports/aging': ['financial.view'],
  '/financial/reports/soa': ['financial.view'],
  '/financial/reports/cash-flow': ['financial.view'],
  '/financial/reports/cash-flow-forecast': ['financial.view'],
  '/financial/reports/project-profitability': ['financial.view'],
  '/financial/reports/wip': ['financial.view'],
  '/financial/reports/projects-dashboard': ['financial.view'],
  '/financial/reports/project-cost-structure': ['financial.view'],
  '/financial/reports/expenses-analysis': ['financial.view'],
  '/financial/reports/project-analysis': ['financial.view'],
  '/financial/reports/assets': ['financial.view'],
  '/financial/reports/salaries': ['financial.view'],
  '/financial/journal-entries': ['financial.view'],
  '/financial/account-mapping': ['financial.manage', 'financial.view'],
  '/financial/product-categories': ['financial.manage', 'financial.view'],
  '/financial/supplier-classification': ['financial.manage', 'financial.view'],
  '/financial/product-coa-mapping': ['financial.manage', 'financial.view'],
  '/financial/settings': ['financial.manage'],

  // Supply Chain
  '/supply-chain/lcr': ['supply_chain.view'],
  '/supply-chain/lcr/reports': ['supply_chain.view'],
  '/supply-chain/lcr/aliases': ['supply_chain.alias'],
  '/supply-chain/purchase-orders': ['supply_chain.view'],

  // Project Status Tracker
  '/project-tracker': ['project_tracker.view'],

  // Detailed Planner
  '/detailed-project-planner': ['planning.view', 'projects.view'],

  // Dolibarr Integration
  '/dolibarr': ['dolibarr.view'],

  // Organization
  '/users': ['users.view'],
  '/roles': ['roles.view'],
  '/organization': ['users.view', 'departments.view'],
  
  // Settings
  '/settings': ['settings.view'],
  '/settings/about': null,
  '/settings/version': ['settings.view'],
  '/settings/backups': ['backups.view'],
  '/settings/cron-jobs': ['settings.view_cron'],
  '/settings/sidebar': ['settings.edit'],
  '/changelog': null, // Public - Everyone can view changelog
};

// Helper function to check if user has permission to access a route
export function hasAccessToRoute(userPermissions: string[], route: string): boolean {
  const requiredPermissions = NAVIGATION_PERMISSIONS[route];
  
  // If no permission required (null), allow access
  if (requiredPermissions === null) {
    return true;
  }
  
  // If no permissions defined for this route, deny access by default
  if (!requiredPermissions) {
    return false;
  }
  
  // Defensive check: ensure userPermissions is an array
  if (!Array.isArray(userPermissions)) {
    console.warn('userPermissions is not an array:', userPermissions);
    return false;
  }
  
  // If single permission string
  if (typeof requiredPermissions === 'string') {
    return userPermissions.includes(requiredPermissions);
  }
  
  // If array of permissions, user needs ANY of them
  return requiredPermissions.some(perm => userPermissions.includes(perm));
}

// Helper to check if user has access to any item in a section
export function hasAccessToSection(userPermissions: string[], sectionRoutes: string[]): boolean {
  // Defensive check: ensure userPermissions is an array
  if (!Array.isArray(userPermissions)) {
    return false;
  }
  return sectionRoutes.some(route => hasAccessToRoute(userPermissions, route));
}

/**
 * Find the required permissions for a given pathname by matching against
 * the NAVIGATION_PERMISSIONS map. Handles dynamic segments (e.g., /projects/abc123)
 * by walking up the path tree until a match is found.
 *
 * Returns:
 * - `null` if the route is explicitly public (no permission needed)
 * - `string[]` of required permissions if a match is found
 * - `undefined` if no matching route exists in the map (unregistered route)
 */
export function getRequiredPermissionsForPath(pathname: string): string[] | null | undefined {
  // Strip query params for matching
  const cleanPath = pathname.split('?')[0];

  // 1. Exact match (with and without trailing slash)
  const exactMatch = NAVIGATION_PERMISSIONS[cleanPath] ?? NAVIGATION_PERMISSIONS[cleanPath.replace(/\/$/, '')];
  if (exactMatch !== undefined) {
    if (exactMatch === null) return null;
    return Array.isArray(exactMatch) ? exactMatch : [exactMatch];
  }

  // 2. Walk up the path segments to find the closest parent match.
  //    This handles dynamic routes like /projects/abc123 → /projects,
  //    /qc/rfi/abc123 → /qc/rfi, etc.
  const segments = cleanPath.split('/').filter(Boolean);
  for (let i = segments.length - 1; i >= 1; i--) {
    const parentPath = '/' + segments.slice(0, i).join('/');
    const parentMatch = NAVIGATION_PERMISSIONS[parentPath];
    if (parentMatch !== undefined) {
      if (parentMatch === null) return null;
      return Array.isArray(parentMatch) ? parentMatch : [parentMatch];
    }
  }

  // 3. No match found - this is an unregistered route
  return undefined;
}

/**
 * Check if a user has access to a given pathname.
 * Unlike hasAccessToRoute, this handles dynamic segments and sub-paths.
 *
 * Returns:
 * - { allowed: true } if access is granted
 * - { allowed: false, requiredPermissions } if access is denied
 */
export function checkPathAccess(userPermissions: string[], pathname: string): {
  allowed: boolean;
  requiredPermissions?: string[];
} {
  if (!Array.isArray(userPermissions)) {
    return { allowed: false, requiredPermissions: [] };
  }

  const required = getRequiredPermissionsForPath(pathname);

  // Public route or unregistered route (allow unregistered to avoid blocking legitimate pages)
  if (required === null || required === undefined) {
    return { allowed: true };
  }

  // Check if user has ANY of the required permissions
  const hasAccess = required.some(perm => userPermissions.includes(perm));
  return hasAccess
    ? { allowed: true }
    : { allowed: false, requiredPermissions: required };
}
