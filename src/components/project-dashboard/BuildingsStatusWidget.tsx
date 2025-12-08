'use client';

import { useState } from 'react';
import { BuildingStatus } from '@/lib/types/project-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw, Building2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BuildingsStatusWidgetProps {
  data: BuildingStatus[];
  onRefresh?: () => void;
}

export function BuildingsStatusWidget({ data, onRefresh }: BuildingsStatusWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-600 dark:text-green-400';
    if (percentage >= 50) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 25) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="size-5" />
            Buildings Status
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
        
        {/* Summary */}
        <div className="mt-3 text-sm text-muted-foreground">
          Total Buildings: <span className="font-semibold text-foreground">{data.length}</span>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
          <div className="space-y-4">
            {data.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No buildings found for this project
              </p>
            ) : (
              data.map((building) => (
                <Card key={building.id} className="border">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Building Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-base">
                            {building.designation} — {building.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {building.requiredWeight.toFixed(2)} tons required
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="size-4" />
                        </Button>
                      </div>

                      {/* Production Progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Production</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {building.producedWeight.toFixed(2)} / {building.requiredWeight.toFixed(2)} tons
                            </span>
                            <span className={`font-semibold ${getProgressColor(building.productionProgress)}`}>
                              {building.productionProgress.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <Progress value={building.productionProgress} className="h-2" />
                      </div>

                      {/* QC & Dispatch Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* QC Status */}
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">QC Status</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-green-600 dark:text-green-400">
                              ✓ {building.qcStatus.completed}
                            </span>
                            <span className="text-red-600 dark:text-red-400">
                              ✗ {building.qcStatus.rejected}
                            </span>
                            <span className="text-muted-foreground">
                              / {building.qcStatus.total}
                            </span>
                          </div>
                        </div>

                        {/* Dispatch Status */}
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">Dispatch</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {building.dispatchStatus.dispatched} / {building.dispatchStatus.total}
                            </span>
                            <span className={`text-xs font-semibold ${getProgressColor(building.dispatchStatus.percentage)}`}>
                              {building.dispatchStatus.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={building.dispatchStatus.percentage} className="h-1 mt-1" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
