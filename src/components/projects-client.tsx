'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, Eye, Edit, Trash2, Building2, Calendar, LayoutGrid, List, CheckSquare, Square, Trash, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDialog } from '@/contexts/DialogContext';

type Project = {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
  client: { id: string; name: string };
  projectManager: { id: string; name: string; position: string | null };
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  contractValue: number | null;
  contractualTonnage: number | null;
  engineeringTonnage: number | null;
  _count: { tasks: number; buildings: number };
};

const statusColors = {
  Draft: 'bg-slate-100 text-slate-700 border-slate-300',
  Active: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  Completed: 'bg-blue-100 text-blue-700 border-blue-300',
  'On-Hold': 'bg-amber-100 text-amber-700 border-amber-300',
  Cancelled: 'bg-rose-100 text-rose-700 border-rose-300',
};

const statusOptions = ['Draft', 'Active', 'On-Hold', 'Completed', 'Cancelled'];

type ProjectsClientProps = {
  restrictedModules?: string[];
};

export function ProjectsClient({ restrictedModules = [] }: ProjectsClientProps) {
  const router = useRouter();
  const { showAlert, showConfirm } = useDialog();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('projectNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Check if financial data should be hidden
  const hideFinancialData = restrictedModules.includes('financial_contracts') || restrictedModules.includes('financial_reports');

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  async function fetchProjects() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(`/api/projects?${params}`);
      console.log('Projects API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Projects data received:', data.length, 'projects');
        setProjects(data);
      } else {
        const errorText = await response.text();
        console.error('Projects API error:', response.status, errorText);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await showConfirm(
      'Delete this project?',
      'This project will be permanently deleted from your system and cannot be recovered.',
      'Delete',
      'Cancel'
    );
    
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showAlert('Success!', 'Project deleted successfully', 'success');
        fetchProjects();
      } else {
        const error = await response.json();
        const message = error.message || error.error || 'Failed to delete project';
        showAlert('Cannot Delete Project', message, 'error');
      }
    } catch (error) {
      showAlert('Error', 'Failed to delete project. Please try again.', 'error');
    }
  }

  // Multi-select functions
  function toggleSelectProject(id: string) {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProjects(newSelected);
  }

  function toggleSelectAll() {
    if (selectedProjects.size === filteredProjects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(filteredProjects.map(p => p.id)));
    }
  }

  // Bulk operations
  async function handleBulkDelete() {
    if (selectedProjects.size === 0) return;
    
    const confirmed = await showConfirm(
      `Delete ${selectedProjects.size} project(s)?`,
      `These ${selectedProjects.size} project(s) will be permanently deleted from your system and cannot be recovered.`,
      'Delete All',
      'Cancel'
    );
    
    if (!confirmed) return;

    setBulkActionLoading(true);
    const errors: string[] = [];
    
    try {
      const deleteResults = await Promise.allSettled(
        Array.from(selectedProjects).map(async (id) => {
          const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
          if (!response.ok) {
            const errorData = await response.json();
            const project = projects.find(p => p.id === id);
            const projectName = project ? `${project.name} (${project.projectNumber})` : id;
            throw new Error(`${projectName}: ${errorData.message || errorData.error}`);
          }
          return response;
        })
      );

      // Collect errors
      deleteResults.forEach((result) => {
        if (result.status === 'rejected') {
          errors.push(result.reason.message);
        }
      });

      // Show results
      if (errors.length > 0) {
        const successCount = deleteResults.filter(r => r.status === 'fulfilled').length;
        const errorMessage = 
          `Successfully deleted: ${successCount} project(s)\n` +
          `Failed: ${errors.length} project(s)\n\n` +
          `Errors:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
        showAlert('Deletion Results', errorMessage, successCount > 0 ? 'warning' : 'error');
      } else {
        showAlert('Success!', `Successfully deleted ${selectedProjects.size} project(s)`, 'success');
      }

      setSelectedProjects(new Set());
      fetchProjects();
    } catch (error) {
      showAlert('Error', 'Failed to delete projects. Please try again.', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkStatusChange(newStatus: string) {
    if (selectedProjects.size === 0) return;

    setBulkActionLoading(true);
    try {
      const updatePromises = Array.from(selectedProjects).map(id =>
        fetch(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
      );
      
      await Promise.all(updatePromises);
      setSelectedProjects(new Set());
      fetchProjects();
    } catch (error) {
      alert('Failed to update some projects');
    } finally {
      setBulkActionLoading(false);
    }
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="size-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="size-4 ml-1" /> 
      : <ArrowDown className="size-4 ml-1" />;
  };

  const filteredProjects = projects
    .filter((project) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        project.projectNumber.toLowerCase().includes(searchLower) ||
        project.name.toLowerCase().includes(searchLower) ||
        project.client.name.toLowerCase().includes(searchLower) ||
        project.projectManager.name.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortColumn) {
        case 'projectNumber':
          aVal = a.projectNumber.toLowerCase();
          bVal = b.projectNumber.toLowerCase();
          break;
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'client':
          aVal = a.client.name.toLowerCase();
          bVal = b.client.name.toLowerCase();
          break;
        case 'projectManager':
          aVal = a.projectManager.name.toLowerCase();
          bVal = b.projectManager.name.toLowerCase();
          break;
        case 'status':
          aVal = a.status.toLowerCase();
          bVal = b.status.toLowerCase();
          break;
        case 'contractValue':
          aVal = Number(a.contractValue) || 0;
          bVal = Number(b.contractValue) || 0;
          break;
        case 'tonnage':
          aVal = Number(a.contractualTonnage) || 0;
          bVal = Number(b.contractualTonnage) || 0;
          break;
        case 'buildings':
          aVal = a._count.buildings;
          bVal = b._count.buildings;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  if (loading) {
    return <div className="text-center py-12">Loading projects...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Bulk Actions Bar */}
      {selectedProjects.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedProjects.size} project{selectedProjects.size !== 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProjects(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={bulkActionLoading}>
                      <RefreshCw className="size-4 mr-2" />
                      Change Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {statusOptions.map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => handleBulkStatusChange(status)}
                      >
                        <Badge
                          variant="outline"
                          className={cn('mr-2', statusColors[status as keyof typeof statusColors])}
                        >
                          {status}
                        </Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkActionLoading}
                >
                  <Trash className="size-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by project number, name, client, or manager..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          {/* View Toggle */}
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="size-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={statusFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'Draft' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('Draft')}
          >
            Draft
          </Button>
          <Button
            variant={statusFilter === 'Active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('Active')}
          >
            Active
          </Button>
          <Button
            variant={statusFilter === 'Completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('Completed')}
          >
            Completed
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {search ? 'No projects found matching your search.' : 'No projects yet. Create your first project!'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectAll}
                      className="h-8 w-8 p-0"
                    >
                      {selectedProjects.size === filteredProjects.length && filteredProjects.length > 0 ? (
                        <CheckSquare className="size-4" />
                      ) : (
                        <Square className="size-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('projectNumber')}
                  >
                    <div className="flex items-center">
                      Project Number {getSortIcon('projectNumber')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Project Name {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('client')}
                  >
                    <div className="flex items-center">
                      Client {getSortIcon('client')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('projectManager')}
                  >
                    <div className="flex items-center">
                      Project Manager {getSortIcon('projectManager')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status {getSortIcon('status')}
                    </div>
                  </TableHead>
                  {!hideFinancialData && (
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('contractValue')}
                    >
                      <div className="flex items-center">
                        Contract Value {getSortIcon('contractValue')}
                      </div>
                    </TableHead>
                  )}
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('tonnage')}
                  >
                    <div className="flex items-center">
                      Tonnage {getSortIcon('tonnage')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('buildings')}
                  >
                    <div className="flex items-center">
                      Buildings {getSortIcon('buildings')}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow 
                    key={project.id}
                    className={cn(
                      'cursor-pointer transition-colors',
                      selectedProjects.has(project.id) && 'bg-primary/5'
                    )}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSelectProject(project.id)}
                        className="h-8 w-8 p-0"
                      >
                        {selectedProjects.has(project.id) ? (
                          <CheckSquare className="size-4 text-primary" />
                        ) : (
                          <Square className="size-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Link href={`/projects/${project.id}`}>
                        <Badge variant="outline" className="font-mono hover:bg-primary/10 cursor-pointer transition-colors">
                          {project.projectNumber}
                        </Badge>
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.client.name}</TableCell>
                    <TableCell>
                      <div>
                        <p>{project.projectManager.name}</p>
                        {project.projectManager.position && (
                          <p className="text-xs text-muted-foreground">{project.projectManager.position}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[project.status as keyof typeof statusColors]}
                      >
                        {project.status}
                      </Badge>
                    </TableCell>
                    {!hideFinancialData && (
                      <TableCell>
                        {project.contractValue ? `${Number(project.contractValue).toLocaleString('en-SA', { minimumFractionDigits: 2 })} ﷼` : '-'}
                      </TableCell>
                    )}
                    <TableCell>
                      {project.contractualTonnage ? `${project.contractualTonnage} tons` : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="size-3" />
                        <span>{project._count.buildings}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                            <Eye className="size-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}/edit`)}>
                            <Edit className="size-4" />
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(project.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs">
                        {project.projectNumber}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn('text-xs border', statusColors[project.status as keyof typeof statusColors])}
                      >
                        {project.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                        <Eye className="size-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}/edit`)}>
                        <Edit className="size-4" />
                        Edit Project
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(project.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Client</p>
                  <p className="font-medium">{project.client.name}</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs mb-1">Project Manager</p>
                  <p className="font-medium">{project.projectManager.name}</p>
                  {project.projectManager.position && (
                    <p className="text-xs text-muted-foreground">{project.projectManager.position}</p>
                  )}
                </div>

                {project.plannedStartDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="size-3" />
                    <span className="text-xs">
                      {new Date(project.plannedStartDate).toLocaleDateString()}
                      {project.plannedEndDate && ` - ${new Date(project.plannedEndDate).toLocaleDateString()}`}
                    </span>
                  </div>
                )}

                {project.contractValue && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Contract Value</p>
                    <p className="font-semibold text-primary">
                      {Number(project.contractValue).toLocaleString('en-SA', { minimumFractionDigits: 2 })} ﷼
                    </p>
                  </div>
                )}

                {project.contractualTonnage && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Tonnage</p>
                    <p className="font-semibold">
                      {project.contractualTonnage} tons
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Building2 className="size-3" />
                    <span>{project._count.buildings} Buildings</span>
                  </div>
                  <div>
                    <span>{project._count.tasks} Tasks</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Count */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {filteredProjects.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
