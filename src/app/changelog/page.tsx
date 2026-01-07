'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Wrench } from 'lucide-react';

type ChangelogVersion = {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch';
  status: 'current' | 'previous';
  mainTitle: string;
  highlights: string[];
  changes: {
    added: Array<{ title: string; items: string[] }>;
    fixed: string[];
    changed: string[];
  };
};

// Version order: Major versions first, then their minor versions
const hardcodedVersions: ChangelogVersion[] = [
  {
    version: '13.2.1',
    date: 'January 7, 2026',
    type: 'patch',
    status: 'current',
    mainTitle: '🔧 Fixing Changelog Versioning System',
    highlights: [
      'Accurate Timeline Based on Development History',
      'Proper Module Separation',
      'Corrected Version Numbers',
    ],
    changes: {
      added: [
        {
          title: 'Changelog Improvements',
          items: [
            'Created accurate changelog based on actual development timeline',
            'Separated modules by their actual development phases',
            'Each major module gets its own major version number',
            'Included all incremental updates and patches',
          ],
        },
      ],
      fixed: [
        'Fixed changelog version numbering inconsistencies',
        'Corrected module development dates based on actual code artifacts',
        'Aligned version numbers with module importance and development phases',
      ],
      changed: [
        'Restructured changelog to reflect true development history',
        'Updated version numbering scheme to be more meaningful',
      ],
    },
  },
  {
    version: '13.2.0',
    date: 'January 7, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🔧 Logout Session Handling Fix',
    highlights: [
      'Fixed Production Logout Session Termination',
      'Enhanced Cookie Deletion with Domain Settings',
      'Client-Side Logout with Full Page Redirect',
    ],
    changes: {
      added: [
        {
          title: 'Session Management Improvements',
          items: [
            'Enhanced cookie deletion with domain-specific settings for hexasteel.sa',
            'Implemented client-side logout with full page redirect to prevent cached sessions',
            'Updated both UserMenu and Sidebar logout buttons to use fetch API with forced redirect',
            'Ensured logout redirects to ots.hexasteel.sa/login in production environment',
          ],
        },
      ],
      fixed: [
        'Fixed logout session handling to properly end sessions in production',
        'Replaced form-based logout with fetch API for better session control',
        'Added window.location.href redirect to bypass Next.js router cache',
        'Prevented redirect back to dashboard after logout',
      ],
      changed: [
        'Updated logout mechanism to use fetch API instead of form submission',
        'Added domain-specific cookie deletion for production environment',
      ],
    },
  },
  {
    version: '13.1.1',
    date: 'January 7, 2026',
    type: 'patch',
    status: 'previous',
    mainTitle: '🔧 Version Consistency & Logout Fixes',
    highlights: [
      'Synchronized All Version Displays',
      'Fixed Production Logout Redirect',
      'Package.json Version Updated',
    ],
    changes: {
      added: [
        {
          title: 'Version Consistency System',
          items: [
            'Created comprehensive version synchronization across all components',
            'Updated package.json to match UI version displays',
            'Fixed login page OTS version display',
            'Updated settings/version page with correct version numbers',
          ],
        },
      ],
      fixed: [
        'Fixed logout redirect to use ots.hexasteel.sa/login in production',
        'Synchronized package.json version',
        'Fixed login page version display',
        'Fixed settings/version page',
        'Ensured all version displays are consistent',
      ],
      changed: [
        'Updated changelog to reflect version consistency improvements',
        'Standardized version update process for future releases',
      ],
    },
  },
  {
    version: '13.1.0',
    date: 'January 6, 2026',
    type: 'minor',
    status: 'previous',
    mainTitle: '🎯 QC Dashboard & Process Management Updates',
    highlights: [
      'Process-Dependent Inspection Types',
      'Enhanced Process Types (Fit-up, Welding, Visualization)',
      'QC Dashboard Layout Optimization',
      'RFI/NCR Creation Pages',
    ],
    changes: {
      added: [
        {
          title: 'RFI Process & Inspection Management',
          items: [
            'Updated process types to include Fit-up, Welding, Visualization, Painting, Assembly, Inspection',
            'Inspection types now dynamically update based on selected process type',
            'Process-specific inspection types (e.g., NDT for Welding, Coating for Visualization)',
            'Automatic inspection type reset when process changes',
          ],
        },
        {
          title: 'Create RFI/NCR Pages',
          items: [
            'New dedicated page for creating RFIs at /qc/rfi/new',
            'Multi-select production logs for batch RFI creation',
            'New dedicated page for creating NCRs at /qc/ncr/new',
            'Severity level selection: Critical, High, Medium, Low',
          ],
        },
        {
          title: 'Work Order & Task Management',
          items: [
            'Work Order Production Progress tracking',
            'CEO role now sees ALL tasks across all projects and users',
            'New TaskAuditLog model for tracking all task changes',
            'Task completion tracking with visual progress indicators',
          ],
        },
        {
          title: 'Tasks Counter Enhancement',
          items: [
            'Redesigned tasks counter to match project summary widget style',
            'Added real-time status breakdown with colored indicators',
            'Shows counts for Pending, In Progress, Waiting for Approval, and Completed tasks',
            'Visual separation with gradient background and border',
            'Total tasks count with filtered context display',
          ],
        },
        {
          title: 'Colorized Filter Buttons',
          items: [
            'Status filters: Pending (yellow), In Progress (blue), Waiting for Approval (purple), Completed (green)',
            'Priority filters: High (red), Medium (orange), Low (gray)',
            'Hover states with matching color themes',
            'Improved visual feedback for active filters',
          ],
        },
        {
          title: 'Private Task Feature',
          items: [
            'Auto-mark tasks as private when user assigns to themselves',
            'Manual private task checkbox in full task form',
            'Private tasks only visible to creator and assignee',
            'Lock icon indicator for private tasks in table and grid views',
            'API-level permission enforcement for private task access',
          ],
        },
      ],
      fixed: [
        'Fixed QC dashboard error: "Cannot read properties of undefined (reading assemblyPart)"',
        'Updated QC dashboard to handle productionLogs array structure',
        'Fixed NCR recent items to access production logs through rfiRequest relationship',
        'Fixed QC dashboard layout orientation to match system-wide layout pattern',
        'Optimized QC dashboard width utilization with proper layout structure',
      ],
      changed: [
        'Updated QC dashboard layout to use lg:pl-64 pattern for better width utilization',
        'Standardized QC page structure to match production page layout',
        'Improved error handling for missing production log data',
      ],
    },
  },
  {
    version: '13.0.1',
    date: 'December 28, 2025',
    type: 'patch',
    status: 'previous',
    mainTitle: '📋 Enterprise Audit Trail System',
    highlights: [
      'Automatic Audit Logging',
      'Field-level Change Tracking',
      'Dolibarr-Style Event Management',
      'Bulk Operation Logging',
    ],
    changes: {
      added: [
        {
          title: 'Enterprise Audit Trail System',
          items: [
            'Automatic audit logging for all CRUD operations on critical entities',
            'Field-level change tracking with before/after values',
            'User context and request tracing for all operations',
            'Audit logging integrated into Projects, Tasks, Buildings, Assembly Parts, Production Logs',
            'Login/Logout event tracking',
            'System event logging for bulk operations',
            'API utility helpers: logActivity(), logAuditEvent(), logSystemEvent()',
          ],
        },
        {
          title: 'Dolibarr-Style Event Management',
          items: [
            'Redesigned /events page with professional table layout',
            'Proper date and time display in separate columns (MM/DD/YYYY, HH:MM:SS AM/PM)',
            'Event reference numbers with icons',
            'Owner/user tracking for each event',
            'Category badges (production, auth, record, QC, etc.)',
            'Entity type and project association display',
            'Enhanced filtering by category and event type',
            'Improved pagination with total counts',
          ],
        },
        {
          title: 'Bulk Operation Logging',
          items: [
            'Bulk assembly part import logging',
            'Mass production logging event tracking',
            'Individual production log create/delete logging',
            'Success/failure count tracking for bulk operations',
            'Process type aggregation for mass operations',
          ],
        },
        {
          title: 'Governance Center Documentation',
          items: [
            'Comprehensive Governance Center Guide (docs/GOVERNANCE_CENTER_GUIDE.md)',
            'Quick Reference Guide (docs/GOVERNANCE_QUICK_GUIDE.md)',
            'Audit trail usage documentation',
            'Data recovery procedures',
            'Version history explanation',
            'Best practices for governance',
            'Troubleshooting guide',
            'Permission matrix documentation',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '13.0.0',
    date: 'December 23, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '📚 Knowledge Center Module',
    highlights: [
      'Knowledge Management System',
      'Best Practices Repository',
      'Lessons Learned Database',
      'Project Knowledge Sharing',
    ],
    changes: {
      added: [
        {
          title: 'Knowledge Center',
          items: [
            'Centralized knowledge management system',
            'Best practices documentation and sharing',
            'Lessons learned from completed projects',
            'Technical documentation repository',
            'Search and filter capabilities',
            'Knowledge categorization and tagging',
          ],
        },
        {
          title: 'Knowledge Application',
          items: [
            'Link knowledge entries to specific projects',
            'Track knowledge application and effectiveness',
            'Knowledge reuse metrics and analytics',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '12.1.0',
    date: 'December 21, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '✅ Tasks Interface Enhancements',
    highlights: [
      'Building Selection in Tasks',
      'Project-Building Dependency',
      'Default Status Changes',
      'Automatic Department Lookup',
    ],
    changes: {
      added: [
        {
          title: 'Tasks Interface Enhancements',
          items: [
            'Building selection in task creation (inline and full form)',
            'Building column added to tasks table',
            'Project-building dependency: buildings filter by selected project',
            'Default task status changed to "In Progress"',
            'Default status filter set to "In Progress"',
            'Automatic department lookup when selecting user',
            'Department auto-populates based on assigned user',
            'Building dropdown disabled until project selected',
            'Building selection resets when project changes',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '12.0.0',
    date: 'December 21, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '📋 Product Backlog Module',
    highlights: [
      'Product Backlog Management',
      'Feature Request Tracking',
      'Priority Management',
      'CEO Control Center',
    ],
    changes: {
      added: [
        {
          title: 'Product Backlog',
          items: [
            'Comprehensive backlog management system',
            'Feature request tracking and prioritization',
            'User story management',
            'Sprint planning capabilities',
            'Backlog grooming and refinement tools',
          ],
        },
        {
          title: 'CEO Control Center',
          items: [
            'Executive dashboard for high-level overview',
            'Strategic decision support tools',
            'Cross-project visibility and analytics',
            'Key metrics and KPI tracking',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '11.0.0',
    date: 'December 18, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🛡️ System Events & Governance Framework',
    highlights: [
      'System Events Management',
      'Governance Rules Engine',
      'Audit Logging System',
      'Policy Enforcement',
      'Compliance Monitoring',
    ],
    changes: {
      added: [
        {
          title: 'Governance Framework',
          items: [
            'System events management and tracking',
            'Configurable governance rules engine',
            'Automated policy enforcement mechanisms',
            'Real-time compliance monitoring',
            'Audit logging for all system activities',
          ],
        },
        {
          title: 'Policy Management',
          items: [
            'Centralized policy configuration interface',
            'Role-based policy enforcement',
            'Automated compliance checks and validations',
            'Policy violation detection and alerting',
            'Comprehensive audit trail for governance',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '10.1.0',
    date: 'December 18, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '🔄 PTS Sync Enhancements',
    highlights: [
      'Skipped Items Tracking',
      'Field Mapping Wizard',
      'Production Logs Sync Improvements',
      'Streamlined PTS Sync',
    ],
    changes: {
      added: [
        {
          title: 'PTS Sync Enhancements',
          items: [
            'Show skipped/corrupted items that were not synced',
            'Display reason for each skipped item (missing data, invalid format)',
            'Rollback option per project - delete all PTS-synced data',
            'Completion percentage per synced project',
            'Project stats showing synced parts/logs vs total',
            'Confirmation dialog before rollback with warning',
          ],
        },
        {
          title: 'PTS Sync Field Mapping Wizard',
          items: [
            'New 3-step wizard flow: Map Raw Data → Map Logs → Execute Sync',
            'Visual column mapping UI showing Google Sheets headers with sample data',
            'Map OTS database fields to any Google Sheets column',
            'Required field validation before proceeding',
            'Default mappings pre-configured for standard PTS format',
            'Mappings saved locally for reuse',
          ],
        },
        {
          title: 'Production Logs Sync Improvements',
          items: [
            'Only fetches required fields from Google Sheets: Part#, Process, Processed Qty, Process Date, Process Location, Processed By, Report No.',
            'Project, building, weight, and part name are now read from existing assembly parts (not Google Sheets)',
            'Only syncs logs that have matching assembly parts in OTS',
            'Shows list of skipped items (logs without matching assembly parts) after sync',
            'Shows list of successfully synced items with details (Part#, Process, Project, Building, Action)',
            'Reduced field mapping UI to only show relevant fields',
          ],
        },
        {
          title: 'Streamlined PTS Sync',
          items: [
            'Simplified PTS Sync page with sidebar navigation',
            'Two-phase sync: Assembly Parts first, then Production Logs',
            'Selective sync: Choose which projects and buildings to sync',
            'Select All / Select None buttons for quick selection',
            'Stop Sync button to abort long-running syncs',
            'Live progress indicators showing created/updated/errors counts',
            'Pre-sync validation showing matched vs unmatched projects/buildings',
          ],
        },
        {
          title: 'Assembly Parts & Logs Pagination',
          items: [
            'Pagination for Assembly Parts page (100 items per page)',
            'Pagination for Production Logs page (100 items per page)',
            'Server-side search across all pages (not just current page)',
            'Faster page loads for large datasets (20K+ records)',
          ],
        },
        {
          title: 'PTS/OTS Source Indicators',
          items: [
            'Assembly Parts page shows source badge (PTS Imported / OTS Added)',
            'Production Logs page shows source badge for PTS imported logs',
            'Visual distinction between externally synced and manually added data',
          ],
        },
      ],
      fixed: [
        'Fixed SidebarProvider import error on PTS Sync page',
        'PTS Sync page now uses layout-based sidebar (consistent with other pages)',
        'Fixed PTS-imported items showing as OTS source instead of PTS',
        'Fixed missing weight and area fields during PTS sync',
        'Updated 4581 existing assembly parts to correct PTS source',
      ],
      changed: [
        'Items without building designation are now skipped during sync',
        'Sync results now include detailed project-level statistics',
        'PTS sync now properly sets source=PTS and includes all weight/area fields',
        'PTS Sync page now has separate buttons for Assembly Parts and Production Logs',
        'Added "Import Logs from PTS" button on Production Log page for quick access',
      ],
    },
  },
  {
    version: '10.0.0',
    date: 'December 18, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🔄 PTS Sync Module',
    highlights: [
      'PTS Data Synchronization',
      'Automated Data Import',
      'Real-time Sync Status',
      'Data Validation',
    ],
    changes: {
      added: [
        {
          title: 'PTS Sync Integration',
          items: [
            'PTS data synchronization system',
            'Automated data import from external systems',
            'Real-time sync status monitoring',
            'Data validation and cleansing',
            'Sync error reporting and recovery',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '9.1.0',
    date: 'December 17, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '📅 Project Planning Enhancements',
    highlights: [
      'Multi-select Bulk Deletion',
      'Inline Schedule Editing',
      'Early Warning System Improvements',
    ],
    changes: {
      added: [
        {
          title: 'Project Planning Enhancements',
          items: [
            'Multi-select capability for bulk schedule deletion',
            'Inline editing of existing schedules (start/end dates)',
            'Select all/deselect all functionality',
            'Visual feedback for selected rows',
            'Edit mode with save/cancel actions',
          ],
        },
      ],
      fixed: [
        'Early Warning System now uses actual production log data for progress',
        'Fabrication progress calculated from assembly part weights',
        'Operations Control sidebar emoji characters removed',
        'WorkUnit sync status mapping improved',
      ],
      changed: [
        'Leading indicators service uses production logs for accurate progress',
        'Schedule editing now supports inline date changes',
      ],
    },
  },
  {
    version: '9.0.0',
    date: 'December 17, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '⚡ Early Warning System & Risk Intelligence',
    highlights: [
      'Predictive Risk Detection',
      'Dependency Management',
      'Capacity Planning',
      'Risk Dashboard',
    ],
    changes: {
      added: [
        {
          title: 'Early Warning System',
          items: [
            'Predictive risk detection algorithms',
            'Advanced dependency management system',
            'Real-time capacity planning tools',
            'Comprehensive risk dashboard',
            'Automated risk mitigation strategies',
          ],
        },
        {
          title: 'Risk Intelligence',
          items: [
            'AI-powered risk analysis and prediction',
            'Dynamic risk scoring and prioritization',
            'Historical risk pattern recognition',
            'Proactive risk alerting system',
            'Risk mitigation recommendation engine',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '8.1.0',
    date: 'December 17, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '🎯 Operations Intelligence Dashboard',
    highlights: [
      'Dependency Blueprint System',
      'Load Estimation Rules',
      'Capacity Auto-Consumption',
      'Operations Intelligence Dashboard',
    ],
    changes: {
      added: [
        {
          title: 'Dependency Blueprint System',
          items: [
            'Template-based automatic dependency creation',
            'Blueprint matching by project structure type (PEB, Heavy Steel, etc.)',
            'Default blueprint fallback for unmatched projects',
            'Pre-seeded blueprints: Standard Steel Fabrication, PEB Project, Heavy Steel Structure',
            'Workflow: DESIGN → PROCUREMENT → PRODUCTION → QC → DOCUMENTATION',
            'Support for FS (Finish-to-Start), SS (Start-to-Start), FF (Finish-to-Finish) dependencies',
            'Configurable lag days per dependency step',
          ],
        },
        {
          title: 'Load Estimation Rules',
          items: [
            'Smart quantity estimation based on work type and context',
            'Design tasks: Keyword-based drawing count (shop drawing=10, detail=8, connection=6)',
            'Production: Weight from WorkOrder automatically populated',
            'QC: 1 inspection per RFI',
            'Documentation: 1 document per submission',
            'All WorkUnits now have quantity for capacity calculation',
          ],
        },
        {
          title: 'Capacity Auto-Consumption',
          items: [
            'ResourceCapacityService automatically pulls load from WorkUnits',
            'Early Warning Engine detects overloads based on actual work data',
            'No manual capacity entry required per WorkUnit',
            'Real-time capacity utilization tracking',
          ],
        },
        {
          title: 'Operations Intelligence Dashboard',
          items: [
            'Unified view of WorkUnits, Dependencies, and Capacity',
            'System-wide view with project and building filters',
            'Three layout modes: Table, Network Graph, Split View',
            'Interactive dependency network visualization',
            'Real-time capacity utilization per resource type',
            'Create WorkUnit button with live impact preview',
            'Shows blocking dependencies and capacity impact before creation',
            'Click any WorkUnit to see its dependencies and capacity impact',
          ],
        },
      ],
      fixed: [],
      changed: [
        'WorkUnitSyncService now uses blueprint-based dependency creation',
        'Legacy dependency logic retained as fallback when no blueprint exists',
        'Task sync now includes title for load estimation context',
      ],
    },
  },
  {
    version: '7.4.0',
    date: 'December 14, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '📊 Planning Activities Widget',
    highlights: [
      'New Planning Activities Widget',
      'Real-time Progress Calculation',
      'Building-level Details',
    ],
    changes: {
      added: [
        {
          title: 'Planning Activities Widget',
          items: [
            'New Planning Activities widget in Project Dashboard',
            'Shows all scope schedules (Design, Shop Drawing, Fabrication, Galvanization, Painting)',
            'Real-time progress calculation based on actual production data',
            'Overall project progress with status breakdown (Completed, On Track, At Risk, Critical)',
            'Expandable building-level details for each activity type',
            'Visual progress bars and status indicators',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '8.0.0',
    date: 'December 15, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🎯 Operations Control System',
    highlights: [
      'Operations Control Center',
      'Work Unit Tracking',
      'Resource Allocation',
      'At-Risk Identification',
    ],
    changes: {
      added: [
        {
          title: 'Operations Control Center',
          items: [
            'Centralized operations monitoring',
            'Real-time work unit tracking',
            'At-risk work units identification',
            'Resource allocation optimization',
            'Operations dashboard and analytics',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '7.3.0',
    date: 'December 14, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '📈 Dashboard Improvements',
    highlights: [
      'New Work Orders Widget',
      'Widget Remove Functionality',
      'Improved Mobile Layout',
    ],
    changes: {
      added: [
        {
          title: 'Dashboard Enhancements',
          items: [
            'New Work Orders widget showing pending, in-progress, completed, and overdue counts',
            'Widget remove functionality - hover over widget to see remove button',
            'Improved mobile-responsive grid layout for dashboard widgets',
            'Collapsed sidebar now shows all module icons (not just 3)',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '7.2.0',
    date: 'December 14, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '🎨 Login Page Branding',
    highlights: [
      'Dolibarr-style Login Page',
      'Configurable Login Logo',
      'Motivational Footer',
    ],
    changes: {
      added: [
        {
          title: 'Login Page Improvements',
          items: [
            'Dolibarr-style login page with white card on dark (#2c3e50) background',
            'Logo displayed inside white card for better visibility',
            'Configurable login logo via Settings → Company → Login Page Logo',
            'Fallback to "HEXA STEEL® - THRIVE DIFFERENT" text if no logo uploaded',
            'Motivational footer with slogan: Hexa Steel® — "Forward Thinking"',
            'Version header showing current system version',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '7.1.0',
    date: 'December 14, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '🤖 AI Summary Enhancements',
    highlights: [
      'Colorized AI Summary Display',
      'Automatic Urgent Item Detection',
      'Improved Readability',
    ],
    changes: {
      added: [
        {
          title: 'AI Summary Improvements',
          items: [
            'Colorized and structured AI summary display',
            'Automatic detection of urgent items (red highlighting)',
            'Warning items highlighted in orange',
            'Info items displayed in blue',
            'Section headers with visual separation',
            'Improved readability with icons and borders',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '7.0.0',
    date: 'December 14, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '📋 Work Orders Module',
    highlights: [
      'Work Orders Management',
      'User Preferences Menu',
      'Notification Center Restructure',
    ],
    changes: {
      added: [
        {
          title: 'Work Orders Module',
          items: [
            'New Work Orders page under Production module',
            'Create, view, and manage production work orders',
            'Work order status tracking and assignment',
            'Integration with production planning workflow',
          ],
        },
        {
          title: 'User Preferences Menu',
          items: [
            'New user dropdown menu accessible from sidebar',
            'Quick access to profile settings',
            'Change password functionality with secure validation',
            'Direct links to notifications and settings',
            'One-click sign out option',
          ],
        },
        {
          title: 'Notification Center Restructure',
          items: [
            'Notifications now a collapsible menu in sidebar',
            'Quick access sub-items: Delayed Tasks, Approvals, Deadlines',
            'URL-based tab navigation for direct linking',
            'Total badge count displayed on Notifications section header',
            'Per-item sidebar badges for: All Notifications (unread), Delayed Tasks, Deadlines',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '6.0.0',
    date: 'December 8, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🔔 Notification Center',
    highlights: [
      'Real-time Notifications',
      'AI-powered Summaries',
      'Automatic Deadline Warnings',
      'Task Assignment Alerts',
    ],
    changes: {
      added: [
        {
          title: 'Notification System',
          items: [
            'Real-time notification system for tasks, approvals, and deadlines',
            'Notification bell with unread count badge',
            'Dropdown notification panel with 5 tabs',
            'Full-page notification center at /notifications',
            'AI-powered notification summaries using OpenAI GPT-4',
            'Automatic deadline scanner (runs daily at 8:00 AM)',
            '6 notification types: Task Assigned, Approval Required, Deadline Warning, Approved, Rejected, System',
          ],
        },
        {
          title: 'Database Changes',
          items: [
            'New notifications table with indexes',
            'New NotificationType enum',
            'Foreign key relationship to users table',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '5.0.0',
    date: 'November 25, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '📊 Business Planning Module',
    highlights: [
      'OKR System',
      'Balanced Scorecard KPIs',
      'Annual Plans & Initiatives',
      'SWOT Analysis',
    ],
    changes: {
      added: [
        {
          title: 'Business Planning Module',
          items: [
            'OKR (Objectives and Key Results) system',
            'Balanced Scorecard KPIs tracking',
            'Annual plans and initiatives management',
            'SWOT analysis framework',
            'Strategic goal alignment tools',
            'Performance metrics and dashboards',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '4.0.0',
    date: 'October 25, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🤖 AI Assistant',
    highlights: [
      'Context-aware AI Assistant',
      'OpenAI Integration',
      'Conversation History',
    ],
    changes: {
      added: [
        {
          title: 'AI Assistant',
          items: [
            'Context-aware AI assistant for operations',
            'OpenAI GPT-4 integration',
            'Natural language processing for task management',
            'Conversation history and context retention',
            'Smart recommendations based on historical data',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '3.1.0',
    date: 'October 21, 2025',
    type: 'minor',
    status: 'previous',
    mainTitle: '📐 Engineering Module',
    highlights: [
      'ITP Management',
      'WPS Management',
      'Document Management',
      'Approval Workflows',
    ],
    changes: {
      added: [
        {
          title: 'Engineering Module',
          items: [
            'ITP (Inspection and Test Plan) management',
            'WPS (Welding Procedure Specification) management',
            'Document management system',
            'Approval workflows',
            'Engineering document timeline',
            'Revision control',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '3.0.0',
    date: 'October 18, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '✅ Quality Control Module',
    highlights: [
      'RFI System',
      'NCR Management',
      'Material, Welding, Dimensional, NDT Inspections',
    ],
    changes: {
      added: [
        {
          title: 'Quality Control Module',
          items: [
            'RFI (Request for Inspection) system',
            'NCR (Non-Conformance Report) management',
            'Material inspection tracking',
            'Welding inspection management',
            'Dimensional inspection records',
            'NDT (Non-Destructive Testing) inspection',
            'QC status tracking and reporting',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '2.0.0',
    date: 'October 13, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🏭 Production Module',
    highlights: [
      'Assembly Part Tracking',
      'Production Log System',
      'Mass Production Logging',
      'Processing Teams and Locations',
    ],
    changes: {
      added: [
        {
          title: 'Production Module',
          items: [
            'Assembly part tracking and management',
            'Production log system',
            'Mass production logging',
            'Processing teams and locations',
            'Production status tracking',
            'Work order management',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '1.0.0',
    date: 'October 9, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🚀 Initial Release - Core System',
    highlights: [
      'Initial Release',
      'Core System Foundation',
      'Project Management',
      'User Management with RBAC',
      'Task Management System',
    ],
    changes: {
      added: [
        {
          title: 'Core System',
          items: [
            'Project management with multi-building support',
            'Client management and relationship tracking',
            'User management with Role-Based Access Control (RBAC)',
            'Department management and organizational structure',
            'Task management system with assignment and tracking',
          ],
        },
        {
          title: 'Foundation Features',
          items: [
            'Comprehensive dashboard with real-time analytics',
            'Secure authentication and session management',
            'Responsive design for all device types',
            'Audit logging and activity tracking',
            'Permission system with role-based access',
          ],
        },
        {
          title: 'Project Features',
          items: [
            'Multi-building project support',
            'Project timeline and milestones',
            'Payment milestone tracking',
            'Project status management',
            'Client assignment and tracking',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
];

export default function ChangelogPage() {
  // Display versions as they are in the array (newest at top, oldest at bottom)
  const versions = hardcodedVersions;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Changelog</h1>
        <p className="text-muted-foreground">
          Track all updates and improvements to the Hexa Steel Operation Tracking System
        </p>
      </div>

      <div className="space-y-8">
        {versions.map((version) => (
          <Card key={version.version} className={version.status === 'current' ? 'border-blue-500' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-xl">
                      {version.mainTitle || `Version ${version.version}`}
                    </CardTitle>
                    {version.status === 'current' && (
                      <Badge variant="default" className="bg-blue-500">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{version.date}</span>
                    <Badge variant={version.type === 'major' ? 'destructive' : version.type === 'minor' ? 'default' : 'secondary'}>
                      {version.type.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-muted-foreground">
                    v{version.version}
                  </div>
                </div>
              </div>
              {version.highlights && (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {version.highlights.map((highlight, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {version.changes.added.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Added
                    </h4>
                    <div className="space-y-4">
                      {version.changes.added.map((addition, idx) => (
                        <div key={idx}>
                          <h5 className="font-medium text-sm mb-2">{addition.title}</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                            {addition.items.map((item, itemIdx) => (
                              <li key={itemIdx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {version.changes.changed.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Changed
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                      {version.changes.changed.map((change, idx) => (
                        <li key={idx}>{change}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {version.changes.fixed.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Fixed
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                      {version.changes.fixed.map((fix, idx) => (
                        <li key={idx}>{fix}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
