'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  ClipboardList,
  Loader2,
  Plus,
  Calendar,
  User,
  Package,
  TrendingUp,
  Eye,
  Trash2,
  Table,
  LayoutGrid,
  CheckSquare,
  Square,
} from 'lucide-react';

type WorkOrder = {
  id: string;
  workOrderNumber: string;
  name: string;
  status: string;
  progress: number;
  totalWeight: number;
  weightPercentage: number;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string | null;
  actualEndDate: string | null;
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
  };
  parts: Array<{
    id: string;
    status: string;
  }>;
};

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchWorkOrders();
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [selectedProject, selectedStatus]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProject !== 'all') params.append('projectId', selectedProject);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const response = await fetch(`/api/work-orders?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setWorkOrders(data);
      }
    } catch (error) {
      console.error('Error fetching work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 0) return 'bg-gray-200';
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const stats = {
    total: workOrders.length,
    pending: workOrders.filter(wo => wo.status === 'Pending').length,
    inProgress: workOrders.filter(wo => wo.status === 'In Progress').length,
    completed: workOrders.filter(wo => wo.status === 'Completed').length,
    totalWeight: workOrders.reduce((sum, wo) => sum + Number(wo.totalWeight), 0),
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === workOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(workOrders.map(wo => wo.id)));
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    
    const confirmMessage = selectedIds.size === 1 
      ? 'Are you sure you want to delete this work order?' 
      : `Are you sure you want to delete ${selectedIds.size} work orders?`;
    
    if (!confirm(confirmMessage)) return;

    setDeleting(true);
    try {
      const response = await fetch('/api/work-orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setSelectedIds(new Set());
        fetchWorkOrders();
      } else {
        const error = await response.json();
        alert(`Failed to delete: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting work orders:', error);
      alert('Failed to delete work orders');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Work Orders
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track production work orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete ({selectedIds.size})
            </Button>
          )}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-r-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-l-none"
            >
              <Table className="h-4 w-4" />
            </Button>
          </div>
          <Link href="/production/work-orders/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Work Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.totalWeight / 1000).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">tons</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="project">Project</Label>
          <select
            id="project"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full h-10 px-3 rounded-md border bg-background mt-1"
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectNumber} - {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full h-10 px-3 rounded-md border bg-background mt-1"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Work Orders List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Work Orders List</CardTitle>
            {workOrders.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="text-muted-foreground"
              >
                {selectedIds.size === workOrders.length ? (
                  <CheckSquare className="mr-2 h-4 w-4" />
                ) : (
                  <Square className="mr-2 h-4 w-4" />
                )}
                {selectedIds.size === workOrders.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : workOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No work orders found</p>
              <Link href="/production/work-orders/new">
                <Button className="mt-4" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Work Order
                </Button>
              </Link>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left w-10">
                      <button onClick={toggleSelectAll} className="p-1">
                        {selectedIds.size === workOrders.length ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </th>
                    <th className="p-3 text-left font-medium">WO Number</th>
                    <th className="p-3 text-left font-medium">Name</th>
                    <th className="p-3 text-left font-medium">Project</th>
                    <th className="p-3 text-left font-medium">Building</th>
                    <th className="p-3 text-left font-medium">Engineer</th>
                    <th className="p-3 text-left font-medium">Weight</th>
                    <th className="p-3 text-left font-medium">Progress</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Timeline</th>
                    <th className="p-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((wo) => (
                    <tr 
                      key={wo.id} 
                      className={`border-b hover:bg-muted/30 ${selectedIds.has(wo.id) ? 'bg-primary/5' : ''}`}
                    >
                      <td className="p-3">
                        <button onClick={() => toggleSelection(wo.id)} className="p-1">
                          {selectedIds.has(wo.id) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 font-medium">{wo.workOrderNumber}</td>
                      <td className="p-3 max-w-[200px] truncate" title={wo.name}>{wo.name}</td>
                      <td className="p-3">{wo.project.projectNumber}</td>
                      <td className="p-3">{wo.building.designation}</td>
                      <td className="p-3">{wo.productionEngineer.name}</td>
                      <td className="p-3">{(Number(wo.totalWeight) / 1000).toFixed(2)}t</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(wo.progress)}`}
                              style={{ width: `${wo.progress}%` }}
                            />
                          </div>
                          <span className="text-xs">{wo.progress.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(wo.status)}`}>
                          {wo.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs">
                        {formatDate(wo.plannedStartDate)}
                      </td>
                      <td className="p-3">
                        <Link href={`/production/work-orders/${wo.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Cards View */
            <div className="space-y-4">
              {workOrders.map((wo) => (
                <Card 
                  key={wo.id} 
                  className={`hover:shadow-md transition-shadow ${selectedIds.has(wo.id) ? 'ring-2 ring-primary' : ''}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {/* Selection Checkbox */}
                      <button 
                        onClick={() => toggleSelection(wo.id)} 
                        className="mt-1 p-1 hover:bg-muted rounded"
                      >
                        {selectedIds.has(wo.id) ? (
                          <CheckSquare className="h-5 w-5 text-primary" />
                        ) : (
                          <Square className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg">{wo.workOrderNumber}</h3>
                              <span
                                className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(
                                  wo.status
                                )}`}
                              >
                                {wo.status}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{wo.name}</p>
                          </div>
                          <Link href={`/production/work-orders/${wo.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Button>
                          </Link>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                              <Package className="h-4 w-4" />
                              <span>Project</span>
                            </div>
                            <div className="font-medium">
                              {wo.project.projectNumber}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {wo.building.designation}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                              <User className="h-4 w-4" />
                              <span>Engineer</span>
                            </div>
                            <div className="font-medium">{wo.productionEngineer.name}</div>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                              <TrendingUp className="h-4 w-4" />
                              <span>Weight</span>
                            </div>
                            <div className="font-medium">
                              {(Number(wo.totalWeight) / 1000).toFixed(2)} tons
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {Number(wo.weightPercentage).toFixed(1)}% of building
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                              <Calendar className="h-4 w-4" />
                              <span>Timeline</span>
                            </div>
                            <div className="font-medium text-xs">
                              {formatDate(wo.plannedStartDate)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              to {formatDate(wo.plannedEndDate)}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-semibold">{wo.progress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${getProgressColor(
                                wo.progress
                              )}`}
                              style={{ width: `${wo.progress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                            <span>
                              {wo.parts.filter(p => p.status === 'Completed').length} of{' '}
                              {wo.parts.length} parts completed
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
