'use client';

import { useState } from 'react';
import { WPSStatusResponse } from '@/lib/types/project-dashboard';
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

interface WPSStatusWidgetProps {
  data: WPSStatusResponse;
  onRefresh?: () => void;
}

export function WPSStatusWidget({ data, onRefresh }: WPSStatusWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Not issued';
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
      case 'Draft':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Superseded':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">WPS Status</CardTitle>
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
        <div className="grid grid-cols-4 gap-2 mt-3">
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
            <p className="text-xs text-red-700 dark:text-red-400">Superseded</p>
            <p className="text-lg font-semibold text-red-700 dark:text-red-400">
              {data.rejected}
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
                  <TableHead>WPS Number</TableHead>
                  <TableHead>Rev</TableHead>
                  <TableHead>Process</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Issued</TableHead>
                  <TableHead>Prepared By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.wps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No WPS found for this project
                    </TableCell>
                  </TableRow>
                ) : (
                  data.wps.map((wps) => (
                    <TableRow key={wps.id}>
                      <TableCell className="font-medium">{wps.wpsNumber}</TableCell>
                      <TableCell>{wps.revision}</TableCell>
                      <TableCell>{wps.weldingProcess}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                            wps.status
                          )}`}
                        >
                          {wps.status}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(wps.dateIssued)}</TableCell>
                      <TableCell>{wps.preparedBy.name}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
