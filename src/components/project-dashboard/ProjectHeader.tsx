'use client';

import { ProjectSummary } from '@/lib/types/project-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Calendar, ExternalLink, FileText, Scale, User } from 'lucide-react';
import Link from 'next/link';

interface ProjectHeaderProps {
  summary: ProjectSummary;
}

export function ProjectHeader({ summary }: ProjectHeaderProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleExportPDF = () => {
    // TODO: Implement proper PDF report generation
    // This will be implemented with Power BI integration or custom report designer
    alert('PDF Export feature coming soon!\n\nThis will generate a professional report with:\n- Project summary\n- Production metrics\n- QC statistics\n- Charts and visualizations\n\nIntegration with Power BI or custom report designer is planned.');
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">
              {summary.projectNumber} — {summary.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Client: {summary.clientName}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/projects/${summary.id}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="size-4 mr-2" />
                Open in Projects
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="size-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total Buildings */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-md bg-blue-500/10">
              <Building2 className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Buildings</p>
              <p className="text-lg font-semibold">{summary.totalBuildings}</p>
            </div>
          </div>

          {/* Total Tonnage */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-md bg-purple-500/10">
              <Scale className="size-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Tonnage</p>
              <p className="text-lg font-semibold">{summary.totalTonnage.toFixed(2)} T</p>
            </div>
          </div>

          {/* Project Manager */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-md bg-green-500/10">
              <User className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Project Manager</p>
              <p className="text-sm font-medium truncate">{summary.projectManager.name}</p>
            </div>
          </div>

          {/* Contract Date */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-md bg-orange-500/10">
              <Calendar className="size-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contract Date</p>
              <p className="text-sm font-medium">{formatDate(summary.contractDate)}</p>
            </div>
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-md bg-cyan-500/10">
              <Calendar className="size-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="text-sm font-medium">{formatDate(summary.startDate)}</p>
            </div>
          </div>

          {/* Expected Completion */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-md bg-red-500/10">
              <Calendar className="size-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expected End</p>
              <p className="text-sm font-medium">{formatDate(summary.expectedCompletion)}</p>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              summary.status === 'Active'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : summary.status === 'Completed'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {summary.status}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
