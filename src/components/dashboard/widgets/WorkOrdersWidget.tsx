'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardCheck, Loader2, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  name: string;
  status: string;
  progress: number;
  project: {
    projectNumber: string;
    name: string;
  };
  building: {
    designation: string;
  };
  plannedEndDate: string;
}

interface WorkOrdersSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  recentOrders: WorkOrder[];
}

export default function WorkOrdersWidget() {
  const [data, setData] = useState<WorkOrdersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/work-orders');
      if (!response.ok) throw new Error('Failed to fetch data');
      const workOrders: WorkOrder[] = await response.json();
      
      const now = new Date();
      const summary: WorkOrdersSummary = {
        total: workOrders.length,
        pending: workOrders.filter(wo => wo.status === 'Pending').length,
        inProgress: workOrders.filter(wo => wo.status === 'In Progress').length,
        completed: workOrders.filter(wo => wo.status === 'Completed').length,
        overdue: workOrders.filter(wo => {
          if (wo.status === 'Completed') return false;
          const endDate = new Date(wo.plannedEndDate);
          return endDate < now;
        }).length,
        recentOrders: workOrders
          .filter(wo => wo.status !== 'Completed')
          .slice(0, 3),
      };
      
      setData(summary);
      setError(null);
    } catch (err) {
      setError('Failed to load work orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-purple-600" />
            Work Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-purple-600" />
            Work Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error || 'No data available'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link href="/production/work-orders">
      <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-purple-600">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="size-5 text-purple-600" />
            Work Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50">
              <Clock className="size-4 text-yellow-600" />
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg font-bold text-yellow-700">{data.pending}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50">
              <Loader2 className="size-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">In Progress</p>
                <p className="text-lg font-bold text-blue-700">{data.inProgress}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50">
              <CheckCircle className="size-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-lg font-bold text-green-700">{data.completed}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50">
              <AlertTriangle className="size-4 text-red-600" />
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-lg font-bold text-red-700">{data.overdue}</p>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          {data.recentOrders.length > 0 && (
            <div className="pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Active Orders</p>
              {data.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[60%]">{order.workOrderNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    order.status === 'In Progress' 
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.progress}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {data.total === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No work orders yet
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
