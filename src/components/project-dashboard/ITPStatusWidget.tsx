'use client';

import { useState } from 'react';
import { ITPStatusResponse } from '@/lib/types/project-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

interface ITPStatusWidgetProps {
  data: ITPStatusResponse;
  onRefresh?: () => void;
}

export function ITPStatusWidget({ data, onRefresh }: ITPStatusWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Not approved';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Under Review':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">ITP Status</CardTitle>
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
        
        {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-2 mt-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{data.total}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-500/10">
            <p className="text-xs text-green-700 dark:text-green-400">Approved</p>
            <p className="text-lg font-semibold text-green-700 dark:text-green-400">
              {data.approved}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-yellow-500/10">
            <p className="text-xs text-yellow-700 dark:text-yellow-400">Pending</p>
            <p className="text-lg font-semibold text-yellow-700 dark:text-yellow-400">
              {data.pending}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-500/10">
            <p className="text-xs text-red-700 dark:text-red-400">Rejected</p>
            <p className="text-lg font-semibold text-red-700 dark:text-red-400">
              {data.rejected}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-orange-500/10">
            <p className="text-xs text-orange-700 dark:text-orange-400">Overdue</p>
            <p className="text-lg font-semibold text-orange-700 dark:text-orange-400">
              {data.overdue}
            </p>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ITP Number</TableHead>
                  <TableHead>Rev</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activities Progress</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.itps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No ITP found for this project
                    </TableCell>
                  </TableRow>
                ) : (
                  data.itps.map((itp) => {
                    const progress = itp.totalActivities > 0
                      ? (itp.completedActivities / itp.totalActivities) * 100
                      : 0;

                    return (
                      <TableRow key={itp.id}>
                        <TableCell className="font-medium">{itp.itpNumber}</TableCell>
                        <TableCell>{itp.revision}</TableCell>
                        <TableCell>{itp.type}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                              itp.status
                            )}`}
                          >
                            {itp.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={progress} className="h-2 w-20" />
                            <span className="text-xs text-muted-foreground">
                              {itp.completedActivities}/{itp.totalActivities}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(itp.dateCreated).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
