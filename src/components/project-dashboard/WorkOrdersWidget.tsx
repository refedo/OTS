'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, RefreshCw, ExternalLink, User, Calendar, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  status: string;
  priority: string;
  targetDate: string | null;
  assignedTo: {
    id: string;
    name: string;
  } | null;
  parts: {
    id: string;
    partDesignation: string;
    quantity: number;
    status: string;
  }[];
  createdAt: string;
}

interface WorkOrdersWidgetProps {
  data: WorkOrder[];
  projectId: string;
  onRefresh?: () => void;
}

export function WorkOrdersWidget({ data, projectId, onRefresh }: WorkOrdersWidgetProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'on_hold':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string | null | undefined) => {
    if (!priority) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const activeWorkOrders = data.filter(wo => wo.status !== 'Completed');
  const completedWorkOrders = data.filter(wo => wo.status === 'Completed');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-muted-foreground" />
            <div>
              <CardTitle>Work Orders</CardTitle>
              <CardDescription>
                {activeWorkOrders.length} active, {completedWorkOrders.length} completed
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`size-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/production/work-orders')}
            >
              <ExternalLink className="size-4 mr-2" />
              View All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardCheck className="size-12 mx-auto mb-3 opacity-20" />
            <p>No work orders found for this project</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((workOrder) => (
              <div
                key={workOrder.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/production/work-orders/${workOrder.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-base mb-1">
                      {workOrder.workOrderNumber}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getStatusColor(workOrder.status)}>
                        {formatStatus(workOrder.status)}
                      </Badge>
                      <Badge className={getPriorityColor(workOrder.priority)}>
                        {workOrder.priority || 'Normal'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  {workOrder.assignedTo && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="size-4" />
                      <span>{workOrder.assignedTo.name}</span>
                    </div>
                  )}
                  
                  {workOrder.targetDate && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="size-4" />
                      <span>{new Date(workOrder.targetDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="size-4" />
                    <span>{workOrder.parts.length} part{workOrder.parts.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {workOrder.parts.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Parts:</p>
                    <div className="flex flex-wrap gap-2">
                      {workOrder.parts.slice(0, 3).map((part) => (
                        <Badge key={part.id} variant="outline" className="text-xs">
                          {part.partDesignation} ({part.quantity})
                        </Badge>
                      ))}
                      {workOrder.parts.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{workOrder.parts.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
