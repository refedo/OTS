'use client';

import { useState } from 'react';
import { DocumentationStatus } from '@/lib/types/project-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw, FileText, AlertCircle } from 'lucide-react';

interface DocumentationStatusWidgetProps {
  data: DocumentationStatus;
  onRefresh?: () => void;
  projectId: string;
}

export function DocumentationStatusWidget({ data, onRefresh, projectId }: DocumentationStatusWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return 'No updates';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="size-5" />
            Documentation Status
          </CardTitle>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`/documents?projectId=${projectId}`, '_blank')}
            >
              <ExternalLink className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronUp className="size-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="text-center p-3 rounded-lg bg-blue-500/10">
            <p className="text-xs text-blue-700 dark:text-blue-400">Total Documents</p>
            <p className="text-2xl font-semibold text-blue-700 dark:text-blue-400">
              {data.totalDocuments}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-yellow-500/10">
            <p className="text-xs text-yellow-700 dark:text-yellow-400">Pending Approvals</p>
            <p className="text-2xl font-semibold text-yellow-700 dark:text-yellow-400">
              {data.pendingApprovals}
            </p>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
          <div className="space-y-2">
            {data.categories.map((category) => (
              <div
                key={category.category}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{category.category}</h4>
                    {category.missingItems > 0 && (
                      <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                        <AlertCircle className="size-3" />
                        {category.missingItems} missing
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last update: {formatDate(category.lastUpdate)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{category.fileCount}</p>
                    <p className="text-xs text-muted-foreground">files</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
