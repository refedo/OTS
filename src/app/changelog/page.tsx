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
    version: '12.0.1',
    date: 'January 7, 2026',
    type: 'patch',
    status: 'current',
    mainTitle: '🔧 Version Consistency & Dolibarr-Style Logout Fixes',
    highlights: [
      'Restructured Version Numbering to Reflect Major Module Additions',
      'Fixed Production Logout Session Termination',
      'Enhanced Cookie Deletion with Domain Settings',
      'Client-Side Logout with Full Page Redirect',
      'Prevents Cached Session Redirects',
    ],
    changes: {
      added: [
        {
          title: 'Version Management Restructure',
          items: [
            'Corrected version numbering: Major versions for new modules (1.0=Core, 8.0=Early Warning, 9.0=Operations Control, 12.0=Product Backlog)',
            'Minor versions for enhancements, patch versions for bug fixes',
            'Updated all version displays across system to consistent version structure',
            'Enhanced version manager script for consistent updates',
          ],
        },
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
        'Added window.location.replace() redirect to bypass Next.js router cache',
        'Prevented redirect back to dashboard after logout',
        'Fixed duplicate version keys in changelog causing React error',
      ],
      changed: [
        'Updated logout mechanism to use fetch API instead of form submission',
        'Added domain-specific cookie deletion for production environment',
        'Restructured version numbering to reflect major system milestones',
      ],
    },
  },
  {
    version: '12.0.0',
    date: 'December 22, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🚀 Product Backlog Module & CEO Control Center',
    highlights: [
      'Product Backlog Module - Single Source of Truth',
      'CEO Control Center - Strategic Insights Dashboard',
      'Task Linking & Progress Tracking',
      'Business Reason Workflow',
    ],
    changes: {
      added: [
        {
          title: 'Product Backlog Module',
          items: [
            'Complete backlog management interface with advanced filtering',
            'Color-coded priority indicators and status workflow enforcement',
            'Real-time task linking and progress tracking',
            'Summary statistics dashboard',
          ],
        },
        {
          title: 'CEO Control Center',
          items: [
            'Strategic Snapshot with total backlog overview',
            'Priority Radar with top 10 high/critical items',
            'WHY Dashboard grouping by business reason themes',
            'Investment Insight with visual percentage breakdowns',
          ],
        },
      ],
      fixed: [
        'Fixed backlog creation errors with enum validation',
        'Fixed task creation API with backlog support',
        'Fixed session authentication across all routes',
      ],
      changed: [
        'Product Backlog section added to sidebar navigation',
        'Task sync includes backlog integration',
      ],
    },
  },
  {
    version: '11.0.0',
    date: 'December 23, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🧠 Knowledge Center Module - Operational Intelligence',
    highlights: [
      'Knowledge Center - Operational Memory System',
      'Challenges, Issues, Lessons, Best Practices',
      'Rule-based Validation Workflow',
      'Dashboard Analytics Integration',
    ],
    changes: {
      added: [
        {
          title: 'Knowledge Center Core Features',
          items: [
            'Four entry types: CHALLENGE, ISSUE, LESSON, BEST_PRACTICE',
            'Fast entry creation with minimum required fields',
            'Status lifecycle: Open → InProgress → PendingValidation → Validated',
            'Project and process linkage with tag-based categorization',
          ],
        },
        {
          title: 'Validation & Analytics',
          items: [
            'Role-based validation (Supervisor and above required)',
            'Dashboard integration with key metrics widgets',
            'Full-text search and advanced filtering',
            'Visual status indicators and validation badges',
          ],
        },
      ],
      fixed: [
        'Fixed knowledge entry creation validation',
        'Fixed search functionality across all entry types',
      ],
      changed: [
        'Knowledge Center section added to sidebar navigation',
        'Enhanced dashboard with knowledge widgets',
      ],
    },
  },
  {
    version: '10.0.0',
    date: 'December 18, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '📊 PTS Sync Module - Data Integration',
    highlights: [
      'Streamlined PTS Sync with Selective Import',
      'Pagination for Large Datasets',
      'PTS/OTS Source Indicators',
      'Field Mapping Wizard',
    ],
    changes: {
      added: [
        {
          title: 'Streamlined PTS Sync',
          items: [
            'Simplified PTS Sync page with sidebar navigation',
            'Two-phase sync: Assembly Parts first, then Production Logs',
            'Selective sync: Choose which projects and buildings to sync',
            'Live progress indicators with created/updated/errors counts',
          ],
        },
        {
          title: 'Performance & Usability',
          items: [
            'Pagination for Assembly Parts and Production Logs (100 items per page)',
            'Server-side search across all pages',
            'PTS/OTS source indicators for visual distinction',
            'Pre-sync validation with matched/unmatched counts',
          ],
        },
      ],
      fixed: [
        'Fixed version number in sidebar display',
        'Fixed PTS Sync page navigation integration',
      ],
      changed: [
        'PTS Sync moved to simplified interface',
        'Assembly parts and logs sync in separate phases',
      ],
    },
  },
  {
    version: '9.0.0',
    date: 'December 15, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🎯 Operations Control System - Predictive Management',
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
            'WorkUnit model for cross-project work tracking abstraction',
            'WorkUnit types: DESIGN, PROCUREMENT, PRODUCTION, QC, DOCUMENTATION',
            'Auto-sets actualStart/actualEnd on status transitions',
            'At-risk detection: late start, approaching deadline, blocked items',
          ],
        },
        {
          title: 'Early Warning Engine',
          items: [
            'RiskEvent model for risk tracking with CRITICAL, HIGH, MEDIUM, LOW severities',
            'Automated rule evaluation for risk detection',
            'Automatic scheduler runs every hour with environment toggle',
            'Auto-create WorkUnits from Tasks, WorkOrders, RFIs, DocumentSubmissions',
          ],
        },
        {
          title: 'Operations Control Dashboard',
          items: [
            'New /operations-control page with read-only view',
            'Summary cards: total risks, critical, high, affected projects',
            'Active risks table sorted by severity',
            'Priority actions from CRITICAL/HIGH risks',
          ],
        },
      ],
      fixed: [
        'All new API routes use custom JWT authentication',
        'Consistent session verification across all endpoints',
      ],
      changed: [
        'System transformed from recording/reporting to predictive control',
        'Sidebar updated with Operations Control navigation link',
      ],
    },
  },
  {
    version: '8.0.0',
    date: 'December 17, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '⚡ Early Warning System - Risk Intelligence',
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
            'Workflow: DESIGN → PROCUREMENT → PRODUCTION → QC → DOCUMENTATION',
            'Support for FS, SS, FF dependencies with configurable lag days',
          ],
        },
        {
          title: 'Load Estimation & Capacity',
          items: [
            'Smart quantity estimation based on work type and context',
            'ResourceCapacityService automatically pulls load from WorkUnits',
            'Early Warning Engine detects overloads based on actual work data',
            'Real-time capacity utilization tracking',
          ],
        },
        {
          title: 'Operations Intelligence Dashboard',
          items: [
            'Unified view of WorkUnits, Dependencies, and Capacity',
            'Three layout modes: Table, Network Graph, Split View',
            'Interactive dependency network visualization',
            'Create WorkUnit button with live impact preview',
          ],
        },
      ],
      fixed: [
        'Fixed WorkUnitSyncService blueprint-based dependency creation',
        'Fixed task sync with title for load estimation context',
      ],
      changed: [
        'Legacy dependency logic retained as fallback',
        'Enhanced dependency tracking with circular detection',
      ],
    },
  },
  {
    version: '7.0.0',
    date: 'December 14, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🤖 Operations Timeline & AI Assistant',
    highlights: [
      'AI-Powered Assistant Integration',
      'Context-Aware Conversations',
      'Conversation History Management',
      'OpenAI GPT-4 Integration',
    ],
    changes: {
      added: [
        {
          title: 'AI Assistant System',
          items: [
            'Context-aware AI assistant with OpenAI GPT-4 integration',
            'Conversation history management with session persistence',
            'Context injection from projects, tasks, and production data',
            'Smart suggestions for operational improvements',
          ],
        },
        {
          title: 'Operations Timeline',
          items: [
            'Real-time timeline view of all operational activities',
            'Automatic event categorization and prioritization',
            'Interactive timeline with drill-down capabilities',
            'Export functionality for reporting',
          ],
        },
      ],
      fixed: [
        'Fixed AI assistant context loading issues',
        'Fixed timeline event synchronization',
      ],
      changed: [
        'Enhanced AI response accuracy with better context',
        'Improved timeline performance with optimized queries',
      ],
    },
  },
  {
    version: '6.0.0',
    date: 'December 14, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🔧 Engineering Module - ITP/WPS/Documents',
    highlights: [
      'ITP Management System',
      'WPS Management',
      'Document Management',
      'Approval Workflows',
    ],
    changes: {
      added: [
        {
          title: 'Engineering Document Management',
          items: [
            'ITP (Inspection Test Plan) management with status tracking',
            'WPS (Welding Procedure Specification) management',
            'Document upload, version control, and approval workflows',
            'Engineering drawing management with revision tracking',
          ],
        },
        {
          title: 'Approval System',
          items: [
            'Multi-level approval workflows for engineering documents',
            'Digital signature capabilities',
            'Approval history tracking and audit trail',
            'Automated notification system for pending approvals',
          ],
        },
      ],
      fixed: [
        'Fixed document upload validation issues',
        'Fixed approval workflow routing',
      ],
      changed: [
        'Enhanced engineering module integration',
        'Improved document search and filtering',
      ],
    },
  },
  {
    version: '5.0.0',
    date: 'December 14, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '📈 Business Planning Module - OKR & KPI',
    highlights: [
      'OKR System',
      'Balanced Scorecard KPIs',
      'Annual Plans and Initiatives',
      'SWOT Analysis',
    ],
    changes: {
      added: [
        {
          title: 'Strategic Planning Tools',
          items: [
            'OKR (Objectives and Key Results) management system',
            'Balanced Scorecard with comprehensive KPI tracking',
            'Annual plan creation and initiative management',
            'SWOT analysis with action item tracking',
          ],
        },
        {
          title: 'Performance Analytics',
          items: [
            'Real-time KPI dashboards with visual indicators',
            'Progress tracking against strategic objectives',
            'Automated reporting and trend analysis',
            'Executive summary generation',
          ],
        },
      ],
      fixed: [
        'Fixed KPI calculation accuracy issues',
        'Fixed OKR progress tracking',
      ],
      changed: [
        'Enhanced strategic planning capabilities',
        'Improved analytics performance',
      ],
    },
  },
  {
    version: '4.0.0',
    date: 'December 14, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🔍 Quality Control Module - RFI & NCR',
    highlights: [
      'RFI System',
      'NCR Management',
      'Material, Welding, Dimensional Inspections',
      'Quality Dashboard',
    ],
    changes: {
      added: [
        {
          title: 'Quality Control Management',
          items: [
            'RFI (Request for Information) system with tracking',
            'NCR (Non-Conformance Report) management',
            'Material, Welding, Dimensional, and NDT inspection types',
            'Quality dashboard with real-time metrics',
          ],
        },
        {
          title: 'Inspection Workflows',
          items: [
            'Process-dependent inspection types',
            'Multi-select production logs for batch RFI creation',
            'Severity level management for NCRs',
            'Root cause analysis and corrective action tracking',
          ],
        },
      ],
      fixed: [
        'Fixed QC dashboard error handling',
        'Fixed production logs array structure handling',
      ],
      changed: [
        'Enhanced QC module integration',
        'Improved inspection workflow efficiency',
      ],
    },
  },
  {
    version: '3.0.0',
    date: 'December 14, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🏭 Production Module - Manufacturing Management',
    highlights: [
      'Assembly Part Tracking',
      'Production Log System',
      'Mass Production Logging',
      'Processing Teams and Locations',
    ],
    changes: {
      added: [
        {
          title: 'Production Management',
          items: [
            'Assembly part tracking with weight and area calculations',
            'Production log system with process tracking',
            'Mass production logging capabilities',
            'Processing teams and location management',
          ],
        },
        {
          title: 'Manufacturing Analytics',
          items: [
            'Real-time production progress tracking',
            'Efficiency metrics and performance indicators',
            'Production capacity planning',
            'Quality control integration',
          ],
        },
      ],
      fixed: [
        'Fixed production log validation',
        'Fixed assembly part calculation accuracy',
      ],
      changed: [
        'Enhanced production module capabilities',
        'Improved manufacturing analytics',
      ],
    },
  },
  {
    version: '2.0.0',
    date: 'December 8, 2024',
    type: 'major',
    status: 'previous',
    mainTitle: '🔔 Notification Center Module - Real-time Alerts',
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
          ],
        },
        {
          title: 'AI Integration',
          items: [
            'AI-powered notification summaries using OpenAI GPT-4',
            'Automatic deadline scanner (runs daily at 8:00 AM)',
            'Six notification types with smart categorization',
            'Intelligent priority-based notification routing',
          ],
        },
      ],
      fixed: [
        'Fixed notification real-time updates',
        'Fixed notification badge synchronization',
      ],
      changed: [
        'Enhanced notification delivery system',
        'Improved AI summary accuracy',
      ],
    },
  },
  {
    version: '1.0.0',
    date: 'November 25, 2024',
    type: 'major',
    status: 'previous',
    mainTitle: '🚀 Initial Release - Core System',
    highlights: [
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
          ],
        },
      ],
      fixed: [
        'Initial system stability and performance',
        'Core functionality validation',
      ],
      changed: [
        'Established system architecture',
        'Implemented foundational frameworks',
      ],
    },
  },
];

export default function ChangelogPage() {
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
        {versions.map((version, index) => (
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
