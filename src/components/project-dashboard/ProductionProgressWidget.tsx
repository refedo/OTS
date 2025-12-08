'use client';

import { useState } from 'react';
import { ProductionProgress } from '@/lib/types/project-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ProductionProgressWidgetProps {
  data: ProductionProgress;
  onRefresh?: () => void;
  projectId: string;
}

export function ProductionProgressWidget({ data, onRefresh, projectId }: ProductionProgressWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-600 dark:text-green-400';
    if (percentage >= 50) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 25) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-600';
    if (percentage >= 50) return 'bg-blue-600';
    if (percentage >= 25) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Production Progress</CardTitle>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`/production?projectId=${projectId}`, '_blank')}
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
        
        {/* Overall Progress */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className={`text-2xl font-bold ${getProgressColor(data.progressPercentage)}`}>
              {data.progressPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={data.progressPercentage} 
            className="h-3"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{data.producedWeight.toFixed(2)} tons produced</span>
            <span>{data.requiredWeight.toFixed(2)} tons required</span>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-6">
          {/* By Process */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="size-4" />
              Progress by Process
            </h4>
            <div className="space-y-3">
              {data.byProcess.map((process) => (
                <div key={process.processType} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{process.processType}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {process.weight.toFixed(2)} tons
                      </span>
                      <span className={`font-semibold ${getProgressColor(process.percentage)}`}>
                        {process.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <Progress value={process.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Trend */}
          {data.weeklyTrend.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Weekly Production Trend</h4>
              <div className="h-32 flex items-end justify-between gap-1">
                {data.weeklyTrend.map((week, index) => {
                  const maxProduced = Math.max(...data.weeklyTrend.map(w => w.produced));
                  const height = maxProduced > 0 ? (week.produced / maxProduced) * 100 : 0;
                  
                  return (
                    <div key={week.week} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full relative group">
                        <div
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                          style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                        />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {week.produced.toFixed(2)} tons
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground rotate-45 origin-top-left mt-2">
                        {week.week}
                      </span>
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
