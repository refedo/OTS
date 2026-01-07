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

const hardcodedVersions: ChangelogVersion[] = [
  {
    version: '8.1.2',
    date: 'January 7, 2026',
    type: 'patch',
    status: 'current',
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
    version: '8.1.1',
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
    version: '8.1.0',
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
    version: '8.0.0',
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
    version: '7.0.0',
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
    version: '6.0.0',
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
        {
          title: 'PTS Sync Integration',
          items: [
            'PTS data synchronization system',
            'Automated data import from external systems',
            'Real-time sync status monitoring',
            'Data validation and cleansing',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '5.0.0',
    date: 'December 15, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '⚡ Early Warning System & Risk Intelligence',
    highlights: [
      'Predictive Risk Detection',
      'Dependency Management',
      'Capacity Planning',
      'Risk Dashboard',
      'Operations Control Center',
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
        {
          title: 'Operations Control Center',
          items: [
            'Centralized operations monitoring',
            'Real-time work unit tracking',
            'At-risk work units identification',
            'Resource allocation optimization',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '4.0.0',
    date: 'December 8, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🤖 AI Assistant & Notification Center',
    highlights: [
      'AI-Powered Assistant',
      'Real-time Notifications',
      'AI-powered Summaries',
      'Automatic Deadline Warnings',
      'Task Assignment Alerts',
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
          title: 'Changelog & Reports',
          items: [
            'Comprehensive changelog page',
            'Version history tracking',
            'System reports and analytics',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '3.0.0',
    date: 'November 25, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '📊 Business Planning Module',
    highlights: [
      'OKR System',
      'Balanced Scorecard KPIs',
      'Annual Plans & Initiatives',
      'SWOT Analysis',
      'Strategic Planning Tools',
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
        {
          title: 'Planning Features',
          items: [
            'Hierarchical objectives structure',
            'Key result tracking and progress monitoring',
            'Initiative planning and execution',
            'Strategic alignment visualization',
            'Performance review and reporting',
          ],
        },
      ],
      fixed: [],
      changed: [],
    },
  },
  {
    version: '2.0.0',
    date: 'October 20, 2025',
    type: 'major',
    status: 'previous',
    mainTitle: '🏭 Production & Quality Control Modules',
    highlights: [
      'Production Module',
      'Quality Control Module',
      'Engineering Module',
      'Assembly Part Tracking',
      'RFI & NCR Management',
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
