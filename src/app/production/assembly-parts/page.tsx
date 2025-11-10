'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Package, Search, Filter, CheckCircle, Clock, AlertCircle, Upload, Trash2, Edit, LayoutGrid, List } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type AssemblyPart = {
  id: string;
  partDesignation: string;
  assemblyMark: string;
  subAssemblyMark: string | null;
  partMark: string;
  quantity: number;
  name: string;
  profile: string | null;
  grade: string | null;
  lengthMm: number | null;
  netAreaTotal: number | null;
  netWeightTotal: number | null;
  status: string;
  currentProcess: string | null;
  project: { id: string; name: string; projectNumber: string };
  building: { id: string; name: string; designation: string } | null;
  _count: { productionLogs: number };
};

export default function AssemblyPartsPage() {
  const [parts, setParts] = useState<AssemblyPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');

  useEffect(() => {
    fetchParts();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (projectFilter && projectFilter !== 'all') {
      fetchBuildings(projectFilter);
    } else {
      setBuildings([]);
      setBuildingFilter('all');
    }
  }, [projectFilter]);

  const fetchParts = async () => {
    try {
      const response = await fetch('/api/production/assembly-parts');
      console.log('Assembly parts API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Assembly parts data received:', data.length, 'parts');
        setParts(data);
      } else {
        const errorText = await response.text();
        console.error('Assembly parts API error:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchBuildings = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/buildings`);
      if (response.ok) {
        const data = await response.json();
        setBuildings(data);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const toggleSelectAll = () => {
    if (selectedParts.size === filteredParts.length) {
      setSelectedParts(new Set());
    } else {
      setSelectedParts(new Set(filteredParts.map(p => p.id)));
    }
  };

  const toggleSelectPart = (partId: string) => {
    const newSelected = new Set(selectedParts);
    if (newSelected.has(partId)) {
      newSelected.delete(partId);
    } else {
      newSelected.add(partId);
    }
    setSelectedParts(newSelected);
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedParts).map(partId =>
        fetch(`/api/production/assembly-parts/${partId}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      
      // Refresh the list
      await fetchParts();
      setSelectedParts(new Set());
      alert(`Successfully deleted ${deletePromises.length} parts`);
    } catch (error) {
      console.error('Error deleting parts:', error);
      alert('Failed to delete some parts');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredParts = parts.filter((part) => {
    const matchesSearch =
      part.partDesignation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.assemblyMark.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.partMark.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || part.status === statusFilter;
    const matchesProject = projectFilter === 'all' || part.project.id === projectFilter;
    const matchesBuilding = buildingFilter === 'all' || (part.building && part.building.id === buildingFilter);

    return matchesSearch && matchesStatus && matchesProject && matchesBuilding;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'In Progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'Pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assembly Parts</h1>
            <p className="text-muted-foreground mt-1">
              Manage production assembly parts list
              {selectedParts.size > 0 && (
                <span className="ml-2 text-primary font-medium">
                  ({selectedParts.size} selected)
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedParts.size > 0 && (
              <AlertDialog>
                <Button variant="destructive" disabled={isDeleting} asChild>
                  <AlertDialogTrigger>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected ({selectedParts.size})
                  </AlertDialogTrigger>
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Selected Parts</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {selectedParts.size} selected part(s)? 
                      This action cannot be undone and will also delete all associated production logs.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBulkDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Link href="/production/upload">
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Parts
              </Button>
            </Link>
          </div>
      </div>

      {/* Filters and View Options */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by part designation, assembly mark, part mark, or name..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex gap-4">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-10 px-3 rounded-md border bg-background min-w-[200px]"
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectNumber} - {project.name}
              </option>
            ))}
          </select>
          
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            disabled={projectFilter === 'all' || buildings.length === 0}
            className="h-10 px-3 rounded-md border bg-background min-w-[200px] disabled:opacity-50"
          >
            <option value="all">All Buildings</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.designation} - {building.name}
              </option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md border bg-background min-w-[150px]"
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{filteredParts.length}</div>
              <p className="text-xs text-muted-foreground">Total Parts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">
                {(filteredParts.reduce((sum, p) => sum + (Number(p.netWeightTotal) || 0), 0) / 1000).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Total Weight (tons)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-indigo-600">
                {filteredParts.reduce((sum, p) => sum + (Number(p.netAreaTotal) || 0), 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Total Area (m²)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredParts.filter((p) => p.status === 'Pending').length}
              </div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {filteredParts.filter((p) => p.status === 'In Progress').length}
              </div>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {filteredParts.filter((p) => p.status === 'Completed').length}
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
      </div>

      {/* Select All */}
      {filteredParts.length > 0 && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedParts.size === filteredParts.length && filteredParts.length > 0}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label className="text-sm font-medium">
              Select All ({filteredParts.length} parts)
            </label>
          </div>
      )}

      {/* Parts List */}
      {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        ) : filteredParts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Parts Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Upload assembly parts to get started'}
              </p>
              <Link href="/production/upload">
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Parts
                </Button>
              </Link>
            </CardContent>
          </Card>
      ) : viewMode === 'list' ? (
        <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedParts.size === filteredParts.length && filteredParts.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="p-3 text-left text-sm font-medium">Part Designation</th>
                  <th className="p-3 text-left text-sm font-medium">Name</th>
                  <th className="p-3 text-left text-sm font-medium">Project</th>
                  <th className="p-3 text-left text-sm font-medium">Building</th>
                  <th className="p-3 text-left text-sm font-medium">Qty</th>
                  <th className="p-3 text-left text-sm font-medium">Status</th>
                  <th className="p-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParts.map((part) => (
                  <tr key={part.id} className={`border-t hover:bg-muted/50 ${selectedParts.has(part.id) ? 'bg-primary/5' : ''}`}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedParts.has(part.id)}
                        onChange={() => toggleSelectPart(part.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{part.partDesignation}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm">{part.name}</td>
                    <td className="p-3 text-sm">{part.project.name}</td>
                    <td className="p-3 text-sm">{part.building?.name || 'N/A'}</td>
                    <td className="p-3 text-sm">{part.quantity}</td>
                    <td className="p-3">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${getStatusColor(part.status)}`}>
                        {getStatusIcon(part.status)}
                        {part.status}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Link href={`/production/assembly-parts/${part.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                        {part.status !== 'Completed' && (
                          <Link href={`/production/log?partId=${part.id}`}>
                            <Button variant="ghost" size="sm">
                              Log
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      ) : (
        <div className="space-y-4">
            {filteredParts.map((part) => (
              <Card key={part.id} className={`hover:shadow-md transition-shadow ${selectedParts.has(part.id) ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedParts.has(part.id)}
                        onChange={() => toggleSelectPart(part.id)}
                        className="h-5 w-5 rounded border-gray-300 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Package className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-lg">
                            {part.partDesignation}
                          </CardTitle>
                          <div
                            className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${getStatusColor(
                              part.status
                            )}`}
                          >
                            {getStatusIcon(part.status)}
                            {part.status}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{part.name}</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Assembly: {part.assemblyMark} | Part: {part.partMark}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Project</p>
                            <p className="font-medium">{part.project.name}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Building</p>
                            <p className="font-medium">{part.building?.name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Quantity</p>
                            <p className="font-medium">{part.quantity} units</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Weight</p>
                            <p className="font-medium">
                              {part.netWeightTotal ? `${part.netWeightTotal} kg` : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link href={`/production/assembly-parts/${part.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      {part.status !== 'Completed' && (
                        <Link href={`/production/log?partId=${part.id}`}>
                          <Button size="sm">Log Production</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      {part.currentProcess && (
                        <p className="text-muted-foreground">
                          Current Process: <span className="font-medium">{part.currentProcess}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      {part._count.productionLogs} production log{part._count.productionLogs !== 1 ? 's' : ''}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
