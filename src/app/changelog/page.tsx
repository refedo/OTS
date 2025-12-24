'use client';

/**
 * Changelog Page
 * Displays system version history and updates
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Sparkles, Wrench, FileText } from 'lucide-react';

type ChangelogVersion = {
  version: string;
  date: string;
  type: string;
  status: string;
  highlights: string[];
  mainTitle?: string;
  changes: {
    added: Array<{ title: string; items: string[] }>;
    fixed: string[];
    changed: string[];
  };
};

const hardcodedVersions = [
  {
    version: '2.10.0',
    date: 'December 24, 2025',
    type: 'minor',
    status: 'current',
    mainTitle: '🚀 GitHub Release Management & System Improvements',
    highlights: [
      'GitHub Release Management System',
      'Version Manager Script & Automation',
      'Knowledge Center File Attachments',
      'Permission-Based Task Creation',
      'Navigation Permission Fixes',
    ],
    changes: {
      added: [
        {
          title: 'GitHub Release Management System',
          items: [
            'Version Manager Script for automated version bumping (patch/minor/major)',
            'GitHub Actions workflow for automatic release creation',
            'Version Management UI at /settings/version',
            'Deployment package generation (.tar.gz)',
            'Comprehensive documentation (RELEASE_QUICK_START.md, RELEASE_MANAGEMENT.md)',
            'Production deployment guide',
          ],
        },
        {
          title: 'Knowledge Center Enhancements',
          items: [
            'File attachment support for lessons learned entries',
            'Multiple file upload capability',
            'File metadata tracking (fileName, filePath, uploadedAt)',
            'Visual file list with remove capability',
            'Upload progress indication',
          ],
        },
        {
          title: 'Permission System Improvements',
          items: [
            'Navigation permissions for notification tabs (Delayed Tasks, Approvals, Deadlines)',
            'Permission mapping for Version Management page',
            'Query parameter routes now properly mapped to permissions',
          ],
        },
      ],
      fixed: [
        'Version inconsistency across package.json, CHANGELOG.md, and UI components',
        'Missing "Delayed Tasks" and "Deadlines" in sidebar for Admin/CEO roles',
        'Quick Add Task and Full Form buttons not appearing despite having task permissions',
        'Version Management link not appearing in Settings section',
        'Navigation permission filtering for notification sub-items',
      ],
      changed: [
        'Version display updated to v2.10.0 across all UI components',
        'Task creation buttons now use permission-based visibility instead of role-based',
        'Navigation permissions system extended to support query parameter routes',
      ],
    },
  },
  {
    version: '2.6.0',
    date: 'December 21, 2025',
    type: 'minor',
    status: 'stable',
    highlights: [
      'Performance Optimizations',
      'Tasks Interface Enhancements',
      'Custom User Permissions',
      'Reduced Server Load by 60%',
    ],
    changes: {
      added: [
        {
          title: 'Performance Optimizations',
          items: [
            'Reduced Prisma query logging to errors only (95% less terminal output)',
            'Increased notification polling from 30s to 60s (50% fewer API calls)',
            'Added 30-second cache for notification endpoints',
            'Implemented in-memory cache system (src/lib/cache.ts)',
            'Fixed N+1 query problem in underperforming schedules endpoint',
            'Added per-request cache for assembly parts queries',
            'Automatic cache cleanup every 5 minutes',
            'Database load reduced by ~60%',
            'API response time improved by ~40%',
          ],
        },
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
        {
          title: 'Custom User Permissions Matrix',
          items: [
            'Per-user permission overrides beyond role defaults',
            'Comprehensive permissions UI with 11 categories',
            'Visual matrix showing all 65+ system permissions',
            'Badge indicators for role vs custom permissions',
            'Collapsible permission categories',
            'Tabbed user forms (Basic Info + Custom Permissions)',
            'Added customPermissions JSON field to User model',
            'API support for custom permissions in user CRUD',
          ],
        },
      ],
      fixed: [
        'Terminal noise from hundreds of Prisma query logs',
        'Notification polling causing excessive server load',
        'N+1 query problem causing slow notification endpoints',
        'Building selection not filtering by project',
        'Tasks defaulting to wrong status',
      ],
      changed: [
        'Notification polling interval: 30s → 60s',
        'Prisma logging: verbose → errors only',
        'Task default status: Pending → In Progress',
        'Task status filter: All → In Progress',
        'Building selection now project-dependent',
      ],
    },
  },
  {
    version: '2.5.0',
    date: 'December 18, 2025',
    type: 'minor',
    status: 'stable',
    highlights: [
      'System Events Tracking',
      'PTS Sync Rollback',
      'Skipped Items Display',
      'Project Completion Stats',
    ],
    changes: {
      added: [
        {
          title: 'Enterprise Governance Spine (EGS) - Complete',
          items: [
            'Governance Center UI at /governance with audit trail, deleted items, and stats',
            'Automatic audit logging via Prisma middleware (Dolibarr-style)',
            'All CREATE/UPDATE/DELETE operations automatically logged',
            'AuditLog model for tracking all changes with field-level detail',
            'EntityVersion model for point-in-time entity snapshots',
            'Soft delete support for Project, Building, and AssemblyPart with restore capability',
            'Request context service for userId/requestId propagation',
            'Audit service with automatic change logging',
            'Version service for entity snapshots and time-travel queries',
            'Transaction wrapper for atomic multi-step operations',
            'Governance API endpoints: /api/governance/audit, /versions, /deleted, /stats',
            'Navigation link added under Notifications > Governance Center',
          ],
        },
        {
          title: 'System Events Management',
          items: [
            'New System Events page to track all system activities',
            'Track file uploads, record creation/updates, syncs, and more',
            'Filter events by category (file, record, sync, production, QC)',
            'Filter events by type (created, updated, deleted, uploaded, synced)',
            'Event statistics dashboard showing today\'s and total events',
            'Accessible from Notifications > System Events in sidebar',
          ],
        },
        {
          title: 'Buildings Multi-Select & Bulk Delete',
          items: [
            'Multi-select checkboxes in buildings table view',
            'Select all / deselect all functionality',
            'Bulk delete with confirmation dialog showing selected buildings',
            'Protection against deleting buildings with assembly parts',
            'Visual feedback for selected rows',
          ],
        },
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
    version: '2.4.0',
    date: 'December 18, 2025',
    type: 'minor',
    status: 'stable',
    highlights: [
      'Streamlined PTS Sync',
      'Selective Project/Building Sync',
      'Pagination for Large Datasets',
      'PTS/OTS Source Indicators',
    ],
    changes: {
      added: [
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
        'Version number in sidebar now shows correct version (was stuck on v2.0.0)',
        'PTS Sync page now includes sidebar navigation',
      ],
      changed: [
        'PTS Sync moved to simplified interface at /pts-sync-simple',
        'Assembly parts and logs sync in separate phases for better control',
      ],
    },
  },
  {
    version: '2.2.0',
    date: 'December 17, 2025',
    type: 'minor',
    status: 'stable',
    highlights: [
      'Import Functions with Field Mapping',
      'Early Warning System Fixes',
      'Project Planning Enhancements',
      'Multi-select & Inline Editing',
    ],
    changes: {
      added: [
        {
          title: 'Import/Upload Functions with Field Mapping',
          items: [
            'Document Timeline Import - Import document submissions from CSV',
            'Production Logs Import - Import production logs with part matching',
            'Reusable ImportModal component for consistent UX',
            'Auto-mapping of columns based on similar names',
            'Preview of data before import',
            'Detailed import results with error reporting',
          ],
        },
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
    version: '2.1.0',
    date: 'December 17, 2025',
    type: 'minor',
    status: 'current',
    highlights: [
      'Dependency Blueprints',
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
    version: '2.0.0',
    date: 'December 15, 2025',
    type: 'major',
    status: 'stable',
    highlights: [
      'Predictive Operations Control',
      'WorkUnit Abstraction Layer',
      'Early Warning Engine',
      'Resource Capacity Planning',
      'Operations Control Dashboard',
    ],
    changes: {
      added: [
        {
          title: 'Predictive Operations Control System',
          items: [
            'New WorkUnit model for cross-project work tracking abstraction',
            'WorkUnit types: DESIGN, PROCUREMENT, PRODUCTION, QC, DOCUMENTATION',
            'WorkUnit statuses: NOT_STARTED, IN_PROGRESS, BLOCKED, COMPLETED',
            'Auto-sets actualStart/actualEnd on status transitions',
            'At-risk detection: late start, approaching deadline, blocked items',
          ],
        },
        {
          title: 'Dependency Tracking (Phase 2)',
          items: [
            'WorkUnitDependency model for dependency relationships',
            'Dependency types: Finish-to-Start, Start-to-Start, Finish-to-Finish',
            'Circular dependency detection using BFS algorithm',
            'Dependency chain traversal (upstream/downstream)',
            'Delay impact analysis with cascading calculations',
          ],
        },
        {
          title: 'Resource Capacity Planning (Phase 3)',
          items: [
            'ResourceCapacity model for capacity tracking',
            'Resource types: LABOR, EQUIPMENT, MATERIAL, SPACE',
            'Capacity vs load analysis per resource',
            'Overloaded resource detection',
            'Capacity summary across all resource types',
          ],
        },
        {
          title: 'Early Warning Engine (Phase 4)',
          items: [
            'RiskEvent model for risk tracking',
            'Risk severities: CRITICAL, HIGH, MEDIUM, LOW',
            'Risk types: DELAY, BOTTLENECK, DEPENDENCY, OVERLOAD',
            'Automated rule evaluation for risk detection',
            'Recommended actions for each risk type',
            'Automatic scheduler runs every hour (node-cron)',
            'Environment toggle: ENABLE_RISK_SCHEDULER',
            'Auto-create WorkUnits from Tasks, WorkOrders, RFIs, DocumentSubmissions',
            'WorkUnitSyncService for seamless integration',
            'Auto-update WorkUnit status when source records change',
            'Automatic actualStart/actualEnd timestamps on status transitions',
            '"No Silent Work" validation rule for WorkOrders and Production logs',
            'WorkTrackingValidatorService for tracking compliance checks',
            'Work Units browser page - view all tracked work items',
            'Dependency Graph page - visualize and manage work dependencies',
            'Capacity Management page - define resources and monitor load vs capacity',
            'AI Risk Digest page - AI-ready risk summaries for analysis',
            'Human-readable names in risk reasons (replaces UUIDs)',
            'Dependency types: FS (Finish-to-Start), SS (Start-to-Start), FF (Finish-to-Finish)',
            'Operations Risks tab in Notification Center',
            'Quick Guide UI page for Operations Control',
            'Filter orphaned seeded data from all Operations Control pages',
            'Automatic dependency creation when WorkOrders, RFIs, Documents are created',
            'Script to clear seeded test data: scripts/clear-operations-seed-data.ts',
            'Work Orders: Table view with sortable columns',
            'Work Orders: Select one/multiple/all for bulk operations',
            'Work Orders: Bulk delete functionality',
            '⚡ Early Warning System - Leading Indicators Dashboard',
            'Auto-detect: Tasks not started but due soon',
            'Auto-detect: Resource overload (too many tasks assigned)',
            'Auto-detect: Procurement risks (materials not ready)',
            'Auto-detect: Schedule slippage (behind planned progress)',
            'Auto-detect: Cascade risks (upstream delays affecting downstream)',
            'Auto-detect: Capacity overload (welding, laser, design capacity)',
            'Specific risk messages: "Late by X days because Y capacity exceeded by Z%"',
            'Live data sync script: scripts/sync-live-data-to-operations.ts',
          ],
        },
        {
          title: 'AI Assistant Integration (Phase 5)',
          items: [
            'Risk summary builder for AI context',
            'Structured risk data formatting for AI prompts',
            'Project-level risk aggregation',
            'Priority action recommendations',
          ],
        },
        {
          title: 'Operations Control Dashboard (Phase 6)',
          items: [
            'New /operations-control page with read-only view',
            'Summary cards: total risks, critical, high, affected projects',
            'Active risks table sorted by severity',
            'Affected projects list with risk counts',
            'Priority actions from CRITICAL/HIGH risks',
            'Risk type breakdown statistics',
          ],
        },
      ],
      fixed: [
        'All new API routes use custom JWT authentication (not NextAuth)',
        'Consistent session verification across all endpoints',
      ],
      changed: [
        'Version bumped to 2.0.0 - major architectural enhancement',
        'Sidebar updated with Operations Control navigation link',
        'System transformed from recording/reporting to predictive control',
      ],
    },
  },
  {
    version: '1.2.2',
    date: 'December 14, 2025',
    type: 'minor',
    status: 'stable',
    highlights: [
      'Work Orders Module',
      'Enhanced Notification Center',
      'User Preferences Menu',
      'AI Summary Improvements',
      'Login Page Branding',
      'Planning Activities Widget',
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
        {
          title: 'AI Summary Enhancements',
          items: [
            'Colorized and structured AI summary display',
            'Automatic detection of urgent items (red highlighting)',
            'Warning items highlighted in orange',
            'Info items displayed in blue',
            'Section headers with visual separation',
            'Improved readability with icons and borders',
          ],
        },
        {
          title: 'Login Page Branding',
          items: [
            'Dolibarr-style login page with white card on dark (#2c3e50) background',
            'Logo displayed inside white card for better visibility',
            'Configurable login logo via Settings → Company → Login Page Logo',
            'Fallback to "HEXA STEEL® - THRIVE DIFFERENT" text if no logo uploaded',
            'Motivational footer with slogan: Hexa Steel® — "Forward Thinking"',
            'Version header showing current system version',
          ],
        },
        {
          title: 'Dashboard Improvements',
          items: [
            'New Work Orders widget showing pending, in-progress, completed, and overdue counts',
            'Widget remove functionality - hover over widget to see remove button',
            'Improved mobile-responsive grid layout for dashboard widgets',
            'Collapsed sidebar now shows all module icons (not just 3)',
          ],
        },
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
      fixed: [
        'Logout button now correctly redirects to production URL (ots.hexasteel.sa) instead of localhost',
        'Sidebar version now syncs with changelog version',
        'Fixed User Preferences menu not appearing by aligning UserMenu parsing with /api/auth/me response shape',
        'Updated Version badge to reflect current release (v1.2.2)',
        'Fixed Notifications sidebar section total badge to match the sum of visible sub-badges (Unread + Delayed Tasks + Deadlines)',
        'Expanded middleware route protection to ensure expired sessions redirect to /login across all protected pages (Notifications, Reports, AI Assistant, QC, etc.)',
        'Fixed collapsed sidebar showing only 3 icons - now shows all module section icons',
        'Fixed UserMenu slow loading by caching user data after first fetch',
        'Improved dashboard mobile responsiveness with optimized grid layout',
      ],
      changed: [
        'Notifications moved from single nav item to collapsible section',
        'Sidebar navigation improved: Projects section moved before Production, Projects Dashboard moved to top, and Reports moved into Production menu',
        'AI Summary card redesigned with purple gradient theme',
        'Generate Summary button now shows loading spinner',
        'Notification badge API calls now run in parallel for faster sidebar loading',
      ],
    },
  },
  {
    version: '1.2.1',
    date: 'December 14, 2025',
    type: 'patch',
    status: 'stable',
    highlights: [
      'Deployment stability fixes',
      'OpenAI SDK dependency compatibility',
      'Reduced production cache issues',
    ],
    changes: {
      added: [
        {
          title: 'Deployment Improvements',
          items: [
            'Deployment troubleshooting documentation for production',
            'Recommended clean install workflow (remove node_modules + lockfile on dependency conflicts)',
            'PM2 restart guidance to avoid stale runtime artifacts after build',
          ],
        },
      ],
      fixed: [
        'Fixed npm dependency resolution error (ERESOLVE) caused by zod v4 conflicting with OpenAI SDK peer dependency (zod v3)',
        'Reduced risk of Next.js Server Action ID mismatch after deployment by recommending cache-clearing deployment flow',
      ],
      changed: [
        'Downgraded zod dependency to ^3.23.8 for OpenAI SDK compatibility',
      ],
    },
  },
  {
    version: '1.2.0',
    date: 'December 9, 2024',
    type: 'minor',
    status: 'stable',
    highlights: [
      'Real-time Notifications',
      'Project Dashboard v2.0',
      'Enhanced UI/UX',
    ],
    changes: {
      added: [
        {
          title: 'Notification Center Enhancements',
          items: [
            'Real-time badge updates without page refresh',
            'Redesigned notification panel with modern UI/UX',
            'Colored circular icon backgrounds (green, blue, orange)',
            'Green left border indicator for unread notifications',
            'NotificationContext for centralized state management',
            'Integrated across all 20+ authenticated layouts',
            'Immediate badge updates when marking as read/archived',
            'Polling mechanism for real-time updates (30-second intervals)',
            'Automatic unread count synchronization across all pages',
          ],
        },
        {
          title: 'Project Dashboard Module v2.0',
          items: [
            'Enhanced widget performance with optimized data fetching',
            'Improved error handling and loading states',
            'Better mobile responsiveness',
            'Interactive charts for production and QC trends',
            'Per-building status breakdown',
            'Task filtering (all, my tasks, non-completed, completed)',
          ],
        },
        {
          title: 'Dashboard Widget System Updates',
          items: [
            'Standardized widget architecture across all dashboard types',
            'Consistent loading and error states',
            'Unified refresh mechanism for all widgets',
            'Improved data caching and performance',
            'Better visual consistency with updated color schemes',
            'Enhanced accessibility features',
          ],
        },
      ],
      fixed: [
        'Runtime error when using notifications on pages without NotificationProvider',
        'Notification badge not updating without page refresh',
        'Inconsistent notification state across different pages',
      ],
      changed: [
        'Navigation reordering: Notifications now appears before Tasks in sidebar',
        'Tab reordering: Notifications tab now first in notification panel',
        'Cleaner header design with blue "Mark as read" link button',
        'Improved tab styling with blue bottom border for active state',
      ],
    },
  },
  {
    version: '1.1.0',
    date: 'December 8, 2024',
    type: 'minor',
    status: 'stable',
    highlights: [
      'Notification Center Module',
      'AI-powered summaries',
      'Automatic deadline warnings',
    ],
    changes: {
      added: [
        {
          title: 'Notification Center Module',
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
        {
          title: 'API Endpoints',
          items: [
            'GET /api/notifications - List notifications with filters',
            'PATCH /api/notifications/[id]/read - Mark as read',
            'PATCH /api/notifications/[id]/archive - Archive notification',
            'POST /api/notifications/bulk-read - Mark all as read',
            'GET /api/notifications/summary - AI-powered summary',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '1.0.0',
    date: 'November 25, 2024',
    type: 'major',
    status: 'stable',
    highlights: [
      'Initial Release',
      'Core System',
      'All Major Modules',
    ],
    changes: {
      added: [
        {
          title: 'Core System',
          items: [
            'Project management with multi-building support',
            'Client management',
            'User management with RBAC',
            'Department management',
            'Task management system',
          ],
        },
        {
          title: 'Production Module',
          items: [
            'Assembly part tracking',
            'Production log system',
            'Mass production logging',
            'Processing teams and locations',
          ],
        },
        {
          title: 'Quality Control Module',
          items: [
            'RFI system',
            'NCR management',
            'Material, Welding, Dimensional, NDT inspections',
          ],
        },
        {
          title: 'Engineering Module',
          items: [
            'ITP management',
            'WPS management',
            'Document management',
            'Approval workflows',
          ],
        },
        {
          title: 'Business Planning Module',
          items: [
            'OKR system',
            'Balanced Scorecard KPIs',
            'Annual plans and initiatives',
            'SWOT analysis',
          ],
        },
        {
          title: 'AI Assistant',
          items: [
            'Context-aware AI assistant',
            'OpenAI integration',
            'Conversation history',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
];

const getTypeColor = (type: string) => {
  switch (type) {
    case 'major':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'minor':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'patch':
      return 'bg-green-100 text-green-700 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'current':
      return <Badge className="bg-green-500">Current</Badge>;
    case 'stable':
      return <Badge variant="outline">Stable</Badge>;
    default:
      return null;
  }
};

export default function ChangelogPage() {
  const [versions, setVersions] = useState<ChangelogVersion[]>(hardcodedVersions);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChangelog() {
      try {
        const response = await fetch('/api/changelog');
        if (response.ok) {
          const data = await response.json();
          setVersions(data);
        }
      } catch (error) {
        console.error('Failed to fetch changelog:', error);
        // Keep using hardcoded versions as fallback
      } finally {
        setLoading(false);
      }
    }
    fetchChangelog();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading changelog...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Changelog</h1>
        <p className="text-muted-foreground">
          Track all updates and improvements to the Hexa Steel Operation Tracking System
        </p>
      </div>

      <div className="space-y-8">
        {versions.map((version, index) => (
          <Card key={version.version} className={version.status === 'current' ? 'border-blue-500' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-2xl font-mono">v{version.version}</CardTitle>
                    {getStatusBadge(version.status)}
                    <Badge variant="outline" className={getTypeColor(version.type)}>
                      {version.type.toUpperCase()}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">{version.date}</CardDescription>
                </div>
              </div>

              {version.highlights.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {version.highlights.map((highlight, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {highlight}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Added Features */}
              {version.changes.added.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-lg">Added</h3>
                  </div>
                  <div className="space-y-4 ml-7">
                    {version.changes.added.map((section, i) => (
                      <div key={i}>
                        <h4 className="font-medium text-sm mb-2 text-blue-600">{section.title}</h4>
                        <ul className="space-y-1">
                          {section.items.map((item, j) => (
                            <li key={j} className="text-sm text-muted-foreground flex items-start">
                              <span className="mr-2">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fixed Issues */}
              {version.changes.fixed.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Wrench className="h-5 w-5 text-orange-600" />
                      <h3 className="font-semibold text-lg">Fixed</h3>
                    </div>
                    <ul className="space-y-1 ml-7">
                      {version.changes.fixed.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start">
                          <span className="mr-2">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Changed/Improved */}
              {version.changes.changed.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-lg">Changed</h3>
                    </div>
                    <ul className="space-y-1 ml-7">
                      {version.changes.changed.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start">
                          <span className="mr-2">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Roadmap Section */}
      <Card className="mt-8 border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Product Roadmap</CardTitle>
          </div>
          <CardDescription>Planned features and enhancements organized by module</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Projects Module */}
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-600">Projects Module</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Enhanced project card outlook</li>
                <li className="text-sm text-muted-foreground">• Automated task creation based on project wizard workflow</li>
                <li className="text-sm text-muted-foreground">• Project contributors management</li>
                <li className="text-sm text-muted-foreground">• Project checklist integration with timeline</li>
                <li className="text-sm text-muted-foreground">• Client login for external users (project-specific access)</li>
              </ul>
            </div>

            {/* Production Module */}
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-600">Production Module</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Fix assembly parts (add length, exclude cold formed)</li>
                <li className="text-sm text-muted-foreground">• Add non-producible items</li>
                <li className="text-sm text-muted-foreground">• Auto-detection for plates and cold formed sections</li>
                <li className="text-sm text-muted-foreground">• Booking system as per plan</li>
                <li className="text-sm text-muted-foreground">• Show monthly production target on dashboard</li>
              </ul>
            </div>

            {/* Tasks Module */}
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-600">Tasks Module</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Add more task statuses (configurable from settings)</li>
                <li className="text-sm text-muted-foreground">• Quick add from sidebar</li>
                <li className="text-sm text-muted-foreground">• WhatsApp integration for task notifications</li>
              </ul>
            </div>

            {/* Notifications & Communication */}
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-600">Notifications & Communication</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Email notifications</li>
                <li className="text-sm text-muted-foreground">• SMS notifications</li>
                <li className="text-sm text-muted-foreground">• WhatsApp notifications</li>
                <li className="text-sm text-muted-foreground">• User notification preferences</li>
                <li className="text-sm text-muted-foreground">• WebSocket for real-time updates</li>
                <li className="text-sm text-muted-foreground">• Mobile push notifications</li>
              </ul>
            </div>

            {/* Reporting & Analytics */}
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-600">Reporting & Analytics</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• PDF & Excel reporting</li>
                <li className="text-sm text-muted-foreground">• Power BI integration and dashboards</li>
                <li className="text-sm text-muted-foreground">• Global customized dashboard per user</li>
                <li className="text-sm text-muted-foreground">• Custom dashboard builder</li>
                <li className="text-sm text-muted-foreground">• Advanced widgets development</li>
              </ul>
            </div>

            {/* Supply Chain Module */}
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-600">Supply Chain Module</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Scrap report system</li>
                <li className="text-sm text-muted-foreground">• Suppliers agreements management</li>
                <li className="text-sm text-muted-foreground">• Master Business Agreement tracking</li>
                <li className="text-sm text-muted-foreground">• Contracts management (Form to PDF)</li>
                <li className="text-sm text-muted-foreground">• Material API integration with Dolibarr</li>
                <li className="text-sm text-muted-foreground">• Warehouse management (raw materials & accessories)</li>
                <li className="text-sm text-muted-foreground">• Disbursement voucher system</li>
                <li className="text-sm text-muted-foreground">• MCG for warehouse/material</li>
                <li className="text-sm text-muted-foreground">• Gasses log</li>
              </ul>
            </div>

            {/* Finance Module */}
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-600">Finance Module</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Payment certificate system</li>
                <li className="text-sm text-muted-foreground">• Subcontractors payment certificates</li>
                <li className="text-sm text-muted-foreground">• Opened credit accounts tracking</li>
              </ul>
            </div>

            {/* Logistics Module */}
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-600">Logistics Module</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Delivery notes management</li>
                <li className="text-sm text-muted-foreground">• Dispatch notes system</li>
                <li className="text-sm text-muted-foreground">• Drivers database</li>
              </ul>
            </div>

            {/* HR Module */}
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-600">HR Module</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Staff report (import from TIS)</li>
                <li className="text-sm text-muted-foreground">• Team form management</li>
                <li className="text-sm text-muted-foreground">• Qiwa - Contracts and dashboard</li>
                <li className="text-sm text-muted-foreground">• Memos system</li>
                <li className="text-sm text-muted-foreground">• Overtime sheet tracking</li>
              </ul>
            </div>

            {/* Safety Module */}
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-600">Safety Module</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Safety incidents tracking</li>
                <li className="text-sm text-muted-foreground">• Safety inspections</li>
                <li className="text-sm text-muted-foreground">• Safety compliance reports</li>
              </ul>
            </div>

            {/* Business Planning Enhancements */}
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-600">Business Planning Enhancements</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Business model canvas</li>
                <li className="text-sm text-muted-foreground">• Enhanced KPI system (task-based, initiative-based, score-based)</li>
                <li className="text-sm text-muted-foreground">• Company ruling rules</li>
                <li className="text-sm text-muted-foreground">• Major company events timeline</li>
              </ul>
            </div>

            {/* Knowledge Centre */}
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-600">Knowledge Centre</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Courses management</li>
                <li className="text-sm text-muted-foreground">• Books and PDFs library</li>
                <li className="text-sm text-muted-foreground">• Meetings register</li>
                <li className="text-sm text-muted-foreground">• Lessons learned database</li>
                <li className="text-sm text-muted-foreground">• Company policy repository</li>
              </ul>
            </div>

            {/* System Enhancements */}
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-600">System Enhancements</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Roles and authorization matrix updates</li>
                <li className="text-sm text-muted-foreground">• Event register (like Dolibarr)</li>
                <li className="text-sm text-muted-foreground">• Google Calendar integration</li>
                <li className="text-sm text-muted-foreground">• Email integration</li>
                <li className="text-sm text-muted-foreground">• Enhanced UI colorization</li>
                <li className="text-sm text-muted-foreground">• Announcements system</li>
                <li className="text-sm text-muted-foreground">• Development quotes on OTS startup</li>
                <li className="text-sm text-muted-foreground">• Backup system and database migration</li>
                <li className="text-sm text-muted-foreground">• Assets management</li>
              </ul>
            </div>

            {/* Settings Enhancements */}
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-600">Settings Enhancements</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Add more production processes</li>
                <li className="text-sm text-muted-foreground">• Department management</li>
                <li className="text-sm text-muted-foreground">• Configurable task statuses</li>
                <li className="text-sm text-muted-foreground">• Logo setup</li>
                <li className="text-sm text-muted-foreground">• User preferences</li>
                <li className="text-sm text-muted-foreground">• Password vault (WiFi, DVR, portals)</li>
              </ul>
            </div>

            {/* Documentation Module */}
            <div>
              <h4 className="font-semibold text-base mb-3 text-blue-600">Documentation Module</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• PQD management</li>
                <li className="text-sm text-muted-foreground">• Important documents (CR, VAT, GOSI, etc.)</li>
                <li className="text-sm text-muted-foreground">• Approvals tracking (Aramco, etc.)</li>
                <li className="text-sm text-muted-foreground">• Templates library (drawings, letters, quotations)</li>
                <li className="text-sm text-muted-foreground">• Company handbook</li>
                <li className="text-sm text-muted-foreground">• SOP repository</li>
              </ul>
            </div>

            {/* Future Versions */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold text-base mb-3 text-purple-600">v2.0.0 & Beyond</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Mobile application (iOS & Android)</li>
                <li className="text-sm text-muted-foreground">• Offline mode support</li>
                <li className="text-sm text-muted-foreground">• Multi-language support</li>
                <li className="text-sm text-muted-foreground">• Advanced analytics and AI insights</li>
                <li className="text-sm text-muted-foreground">• Data export/import improvements</li>
                <li className="text-sm text-muted-foreground">• Bulk operations enhancements</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
