'use client';

import { useState } from 'react';
import { QCProgress } from '@/lib/types/project-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface QCProgressWidgetProps {
  data: QCProgress;
  onRefresh?: () => void;
  projectId: string;
}

export function QCProgressWidget({ data, onRefresh, projectId }: QCProgressWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">QC Progress</CardTitle>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`/qc?projectId=${projectId}`, '_blank')}
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
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-semibold">{data.totalInspections}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-500/10">
            <CheckCircle2 className="size-4 mx-auto mb-1 text-green-600" />
            <p className="text-xl font-semibold text-green-700 dark:text-green-400">
              {data.completedInspections}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-500/10">
            <XCircle className="size-4 mx-auto mb-1 text-red-600" />
            <p className="text-xl font-semibold text-red-700 dark:text-red-400">
              {data.rejectedInspections}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-yellow-500/10">
            <Clock className="size-4 mx-auto mb-1 text-yellow-600" />
            <p className="text-xl font-semibold text-yellow-700 dark:text-yellow-400">
              {data.pendingInspections}
            </p>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Completion Rate</span>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {data.progressPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={data.progressPercentage} className="h-2" />
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-6">
          {/* By Type */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Inspections by Type</h4>
            <div className="space-y-3">
              {data.byType.map((type) => {
                const completionRate = type.total > 0 
                  ? (type.completed / type.total) * 100 
                  : 0;

                return (
                  <div key={type.type} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{type.type}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-green-600 dark:text-green-400">
                          ✓ {type.completed}
                        </span>
                        <span className="text-red-600 dark:text-red-400">
                          ✗ {type.rejected}
                        </span>
                        <span className="text-muted-foreground">
                          / {type.total}
                        </span>
                      </div>
                    </div>
                    <Progress value={completionRate} className="h-2" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline */}
          {data.timeline.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Inspection Timeline (Last 30 Days)</h4>
              <div className="h-24 flex items-end justify-between gap-1">
                {data.timeline.slice(-15).map((day) => {
                  const maxInspections = Math.max(...data.timeline.map(d => d.inspections));
                  const height = maxInspections > 0 ? (day.inspections / maxInspections) * 100 : 0;
                  
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full relative group">
                        <div
                          className="w-full bg-purple-500 rounded-t hover:bg-purple-600 transition-colors"
                          style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                        />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {day.inspections}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
