'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Package,
  Weight,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  RefreshCw,
} from 'lucide-react';

type WorkOrder = {
  id: string;
  workOrderNumber: string;
  name: string;
  description?: string;
  status: string;
  progress: number;
  totalWeight: number;
  weightPercentage: number;
  processingLocation?: string;
  processingTeam?: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  selectedGroups: string[];
  createdAt: string;
  project: {
    projectNumber: string;
    name: string;
  };
  building: {
    designation: string;
    name: string;
  };
  productionEngineer: {
    name: string;
    email?: string;
  };
  createdBy: {
    name: string;
  };
  parts: {
    id: string;
    partDesignation: string;
    assemblyMark: string;
    partMark: string;
    quantity: number;
    weight: number;
    processedQuantity: number;
    status: string;
    currentProcess?: string;
    processes?: { type: string; qty: number }[];
  }[];
};

const statusColors: Record<string, string> = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  'Completed': 'bg-green-100 text-green-800',
  'Cancelled': 'bg-red-100 text-red-800',
};

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchWorkOrder(params.id as string);
    }
  }, [params.id]);

  const fetchWorkOrder = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/work-orders/${id}`);
      if (response.ok) {
        const data = await response.json();
        setWorkOrder(data);
      } else {
        setError('Work order not found');
      }
    } catch (err) {
      setError('Failed to load work order');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatWeight = (weight: number) => {
    if (weight >= 1000) {
      return `${(weight / 1000).toFixed(2)} tons`;
    }
    return `${weight.toFixed(2)} kg`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-muted-foreground">{error || 'Work order not found'}</p>
        <Button onClick={() => router.push('/production/work-orders')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Work Orders
        </Button>
      </div>
    );
  }

  const completedParts = workOrder.parts.filter(p => p.status === 'Completed').length;
  const totalParts = workOrder.parts.length;
  const progress = totalParts > 0 ? (completedParts / totalParts) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/production/work-orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{workOrder.workOrderNumber}</h1>
              <Badge className={statusColors[workOrder.status] || 'bg-gray-100'}>
                {workOrder.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{workOrder.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/production/work-orders/${workOrder.id}/edit`)}>
            Edit
          </Button>
          <Button onClick={() => fetchWorkOrder(workOrder.id)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedParts} / {totalParts} parts completed
            </span>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-right text-sm font-medium mt-1">{progress.toFixed(1)}%</p>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Project</p>
                <p className="font-medium">{workOrder.project.projectNumber}</p>
                <p className="text-xs text-muted-foreground">{workOrder.project.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Building</p>
                <p className="font-medium">{workOrder.building.designation}</p>
                <p className="text-xs text-muted-foreground">{workOrder.building.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Weight className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Weight</p>
                <p className="font-medium">{formatWeight(Number(workOrder.totalWeight))}</p>
                <p className="text-xs text-muted-foreground">{Number(workOrder.weightPercentage).toFixed(1)}% of building</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Engineer</p>
                <p className="font-medium">{workOrder.productionEngineer.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Planned Start</p>
                <p className="font-medium">{formatDate(workOrder.plannedStartDate)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Planned End</p>
                <p className="font-medium">{formatDate(workOrder.plannedEndDate)}</p>
              </div>
            </div>
            {(workOrder.actualStartDate || workOrder.actualEndDate) && (
              <div className="flex justify-between pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Actual Start</p>
                  <p className="font-medium">
                    {workOrder.actualStartDate ? formatDate(workOrder.actualStartDate) : '-'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Actual End</p>
                  <p className="font-medium">
                    {workOrder.actualEndDate ? formatDate(workOrder.actualEndDate) : '-'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workOrder.processingLocation && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Location: <span className="font-medium">{workOrder.processingLocation}</span></span>
              </div>
            )}
            {workOrder.processingTeam && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Team: <span className="font-medium">{workOrder.processingTeam}</span></span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Created: <span className="font-medium">{formatDate(workOrder.createdAt)}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Created by: <span className="font-medium">{workOrder.createdBy.name}</span></span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {workOrder.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{workOrder.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Groups */}
      {workOrder.selectedGroups && workOrder.selectedGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selected Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {workOrder.selectedGroups.map((group, index) => (
                <Badge key={index} variant="secondary">{group}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Parts ({workOrder.parts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Part Designation</th>
                  <th className="text-left py-3 px-2 font-medium">Assembly Mark</th>
                  <th className="text-left py-3 px-2 font-medium">Part Mark</th>
                  <th className="text-right py-3 px-2 font-medium">Qty</th>
                  <th className="text-right py-3 px-2 font-medium">Processed</th>
                  <th className="text-right py-3 px-2 font-medium">Weight</th>
                  <th className="text-left py-3 px-2 font-medium">Current Process</th>
                  <th className="text-center py-3 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {workOrder.parts.map((part) => (
                  <tr key={part.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 font-mono text-xs">{part.partDesignation}</td>
                    <td className="py-3 px-2">{part.assemblyMark}</td>
                    <td className="py-3 px-2">{part.partMark}</td>
                    <td className="py-3 px-2 text-right">{part.quantity}</td>
                    <td className="py-3 px-2 text-right">{part.processedQuantity}</td>
                    <td className="py-3 px-2 text-right">{formatWeight(Number(part.weight))}</td>
                    <td className="py-3 px-2">
                      {part.currentProcess ? (
                        <Badge variant="outline" className="text-xs">
                          {part.currentProcess}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Badge className={statusColors[part.status] || 'bg-gray-100'} variant="secondary">
                        {part.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
