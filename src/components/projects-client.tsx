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
import { Search, MoreVertical, Eye, Edit, Trash2, Building2, Calendar, LayoutGrid, List } from 'lucide-react';
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
  Draft: 'bg-gray-100 text-gray-800 border-gray-300',
  Active: 'bg-blue-100 text-blue-800 border-blue-300',
  Completed: 'bg-green-100 text-green-800 border-green-300',
  'On Hold': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Cancelled: 'bg-red-100 text-red-800 border-red-300',
};

export function ProjectsClient() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

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
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchProjects();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete project');
      }
    } catch (error) {
      alert('Failed to delete project');
    }
  }

  const filteredProjects = projects.filter((project) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      project.projectNumber.toLowerCase().includes(searchLower) ||
      project.name.toLowerCase().includes(searchLower) ||
      project.client.name.toLowerCase().includes(searchLower) ||
      project.projectManager.name.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return <div className="text-center py-12">Loading projects...</div>;
  }

  return (
    <div className="space-y-6">
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
                  <TableHead>Project Number</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contract Value</TableHead>
                  <TableHead>Tonnage</TableHead>
                  <TableHead>Buildings</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {project.projectNumber}
                      </Badge>
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
                    <TableCell>
                      {project.contractValue ? `$${project.contractValue.toLocaleString()}` : '-'}
                    </TableCell>
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
                      ${project.contractValue.toLocaleString()}
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
