'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield,
  History,
  Trash2,
  RotateCcw,
  FileText,
  Eye,
  Search,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function GovernanceQuickGuidePage() {
  return (
    <div className="container mx-auto py-6 space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/governance">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-2" />
            Back to Governance
          </Button>
        </Link>
      </div>

      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Shield className="size-16 text-primary" />
        </div>
        <h1 className="text-4xl font-bold">Governance Center Quick Guide</h1>
        <p className="text-xl text-muted-foreground">
          Enterprise audit trail, version history, and data recovery for OTS
        </p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            What is the Governance Center?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            The Governance Center provides complete operational traceability for OTS. It tracks every important 
            action, state change, and system operation with enough detail for:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Audit Compliance</strong> - ISO 9001/45001 audit evidence</li>
            <li><strong>Debugging</strong> - Trace issues back to their source</li>
            <li><strong>Data Recovery</strong> - Restore accidentally deleted items</li>
            <li><strong>Operational Intelligence</strong> - Understand system usage patterns</li>
          </ul>
        </CardContent>
      </Card>

      {/* Three Main Features */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="size-5 text-blue-600" />
              Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Every change to critical entities is logged with:
            </p>
            <ul className="text-sm space-y-1">
              <li>• Who made the change</li>
              <li>• What was changed (field-level)</li>
              <li>• When it happened</li>
              <li>• Old vs new values</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="size-5 text-purple-600" />
              Version History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Full snapshots of entities are stored for:
            </p>
            <ul className="text-sm space-y-1">
              <li>• Point-in-time recovery</li>
              <li>• Historical comparison</li>
              <li>• Compliance evidence</li>
              <li>• Change tracking</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trash2 className="size-5 text-orange-600" />
              Soft Delete & Recovery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Deleted items can be recovered:
            </p>
            <ul className="text-sm space-y-1">
              <li>• Projects</li>
              <li>• Buildings</li>
              <li>• Assembly Parts</li>
              <li>• With full history</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Tracked Entities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="size-5" />
            What Gets Tracked?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              'Projects',
              'Buildings',
              'Assembly Parts',
              'Production Logs',
              'Tasks',
              'RFI Requests',
              'NCR Reports',
              'ITP Documents',
              'WPS Documents',
              'Users',
              'Roles',
              'Settings',
            ].map((entity) => (
              <Badge key={entity} variant="outline" className="justify-center py-2">
                {entity}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions Tracked */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="size-5" />
            Actions Tracked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Badge className="bg-green-100 text-green-800">CREATE</Badge>
              <p className="text-xs text-muted-foreground">New records created</p>
            </div>
            <div className="space-y-2">
              <Badge className="bg-blue-100 text-blue-800">UPDATE</Badge>
              <p className="text-xs text-muted-foreground">Records modified</p>
            </div>
            <div className="space-y-2">
              <Badge className="bg-red-100 text-red-800">DELETE</Badge>
              <p className="text-xs text-muted-foreground">Records removed</p>
            </div>
            <div className="space-y-2">
              <Badge className="bg-purple-100 text-purple-800">RESTORE</Badge>
              <p className="text-xs text-muted-foreground">Records recovered</p>
            </div>
            <div className="space-y-2">
              <Badge className="bg-emerald-100 text-emerald-800">APPROVE</Badge>
              <p className="text-xs text-muted-foreground">Items approved</p>
            </div>
            <div className="space-y-2">
              <Badge className="bg-orange-100 text-orange-800">REJECT</Badge>
              <p className="text-xs text-muted-foreground">Items rejected</p>
            </div>
            <div className="space-y-2">
              <Badge className="bg-cyan-100 text-cyan-800">SYNC</Badge>
              <p className="text-xs text-muted-foreground">External syncs</p>
            </div>
            <div className="space-y-2">
              <Badge className="bg-gray-100 text-gray-800">LOGIN/LOGOUT</Badge>
              <p className="text-xs text-muted-foreground">Auth events</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How to Use */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-5" />
            How to Use
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full size-6 flex items-center justify-center text-sm">1</span>
              View Recent Activity
            </h3>
            <p className="text-sm text-muted-foreground ml-8">
              The Overview tab shows the latest changes across the system. Click on any entry to see full details.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full size-6 flex items-center justify-center text-sm">2</span>
              Search Audit Trail
            </h3>
            <p className="text-sm text-muted-foreground ml-8">
              Use the Audit Trail tab to search and filter logs by entity type, action, or user. 
              Click the eye icon to see field-level changes.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full size-6 flex items-center justify-center text-sm">3</span>
              Recover Deleted Items
            </h3>
            <p className="text-sm text-muted-foreground ml-8">
              Go to the Deleted tab, select the entity type, find the item you want to recover, 
              and click the Restore button.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="size-5" />
            Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="size-5 text-green-600 mt-0.5 shrink-0" />
              <span><strong>Regular Review:</strong> Check the audit trail weekly for unusual activity</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="size-5 text-green-600 mt-0.5 shrink-0" />
              <span><strong>Document Reasons:</strong> When deleting items, always provide a reason</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="size-5 text-green-600 mt-0.5 shrink-0" />
              <span><strong>Quick Recovery:</strong> Restore deleted items within 90 days for best results</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="size-5 text-green-600 mt-0.5 shrink-0" />
              <span><strong>Export for Audits:</strong> Use the export feature to generate audit reports</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Clock className="size-5" />
            Data Retention Policy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>• <strong>Detailed Events:</strong> Kept for 90 days</li>
            <li>• <strong>Summary Data:</strong> Archived after 90 days (daily aggregates)</li>
            <li>• <strong>Raw Events:</strong> Deleted after 1 year</li>
            <li>• <strong>Deleted Items:</strong> Recoverable for 90 days</li>
          </ul>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Link href="/governance">
          <Button>
            <Shield className="size-4 mr-2" />
            Open Governance Center
          </Button>
        </Link>
        <Link href="/events">
          <Button variant="outline">
            <History className="size-4 mr-2" />
            View System Events
          </Button>
        </Link>
        <Link href="/admin/pm2-errors">
          <Button variant="outline">
            <AlertCircle className="size-4 mr-2" />
            View PM2 Errors
          </Button>
        </Link>
      </div>
    </div>
  );
}
