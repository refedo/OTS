'use client';

/**
 * Changelog Page
 * Displays system version history and updates
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Sparkles, Wrench, FileText } from 'lucide-react';

const versions = [
  {
    version: '1.2.2',
    date: 'December 14, 2025',
    type: 'minor',
    status: 'current',
    highlights: [
      'Work Orders Module',
      'Enhanced Notification Center',
      'User Preferences Menu',
      'AI Summary Improvements',
      'Login Page Branding',
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
      ],
      fixed: [
        'Logout button now correctly redirects to production URL (ots.hexasteel.sa) instead of localhost',
        'Sidebar version now syncs with changelog version',
        'Fixed User Preferences menu not appearing by aligning UserMenu parsing with /api/auth/me response shape',
        'Updated Version badge to reflect current release (v1.2.2)',
        'Fixed Notifications sidebar section total badge to match the sum of visible sub-badges (Unread + Delayed Tasks + Deadlines)',
        'Expanded middleware route protection to ensure expired sessions redirect to /login across all protected pages (Notifications, Reports, AI Assistant, QC, etc.)',
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
