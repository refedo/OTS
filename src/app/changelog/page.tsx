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
    version: '1.1.0',
    date: 'December 8, 2024',
    type: 'minor',
    status: 'current',
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
            <CardTitle>Upcoming Features</CardTitle>
          </div>
          <CardDescription>Planned for future releases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">v1.2.0 (Planned)</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Email notifications</li>
                <li className="text-sm text-muted-foreground">• SMS notifications</li>
                <li className="text-sm text-muted-foreground">• User notification preferences</li>
                <li className="text-sm text-muted-foreground">• WebSocket for real-time updates</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">v1.3.0 (Planned)</h4>
              <ul className="space-y-1 ml-4">
                <li className="text-sm text-muted-foreground">• Advanced reporting module</li>
                <li className="text-sm text-muted-foreground">• Custom dashboard builder</li>
                <li className="text-sm text-muted-foreground">• Data export/import improvements</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
