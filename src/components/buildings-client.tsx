'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Search, ExternalLink, LayoutGrid, List, Trash2, Loader2, AlertTriangle, Plus } from 'lucide-react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Building = {
  id: string;
  designation: string;
  name: string;
  description: string | null;
  projectId: string;
  project: {
    id: string;
    projectNumber: string;
    name: string;
    status: string;
    client: {
      id: string;
      name: string;
    };
  };
};

const statusColors = {
  Draft: 'bg-gray-100 text-gray-800 border-gray-300',
  Active: 'bg-blue-100 text-blue-800 border-blue-300',
  Completed: 'bg-green-100 text-green-800 border-green-300',
  'On Hold': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Cancelled: 'bg-red-100 text-red-800 border-red-300',
};

type BuildingsClientProps = {
  initialBuildings: Building[];
};

export function BuildingsClient({ initialBuildings }: BuildingsClientProps) {
  const { toast } = useToast();
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const filteredBuildings = useMemo(() => {
    if (!search) return buildings;
    
    const searchLower = search.toLowerCase();
    return buildings.filter(
      (building) =>
        building.designation.toLowerCase().includes(searchLower) ||
        building.name.toLowerCase().includes(searchLower) ||
        building.description?.toLowerCase().includes(searchLower) ||
        building.project.projectNumber.toLowerCase().includes(searchLower) ||
        building.project.name.toLowerCase().includes(searchLower) ||
        building.project.client.name.toLowerCase().includes(searchLower)
    );
  }, [buildings, search]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredBuildings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBuildings.map(b => b.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch('/api/buildings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Delete Failed',
          description: data.details || data.error || 'Failed to delete buildings',
          variant: 'destructive',
        });
        return;
      }

      // Remove deleted buildings from state
      setBuildings(prev => prev.filter(b => !selectedIds.has(b.id)));
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      
      toast({
        title: 'Buildings Deleted',
        description: data.message,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete buildings',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);

    const formData = new FormData(e.currentTarget);
    const projectId = formData.get('projectId') as string;
    const data = {
      designation: (formData.get('designation') as string || '').toUpperCase(),
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
    };

    try {
      const response = await fetch(`/api/projects/${projectId}/buildings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        toast({
          title: 'Creation Failed',
          description: result.error || 'Failed to create building',
          variant: 'destructive',
        });
        return;
      }

      // Refresh buildings list
      const refreshResponse = await fetch('/api/buildings', {
        cache: 'no-store',
      });
      
      if (refreshResponse.ok) {
        const updatedBuildings = await refreshResponse.json();
        setBuildings(updatedBuildings);
      }

      setShowAddDialog(false);
      (e.target as HTMLFormElement).reset();
      
      toast({
        title: 'Building Created',
        description: `${result.designation} - ${result.name} has been created successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create building',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Group buildings by project
  const buildingsByProject = useMemo(() => {
    const grouped = new Map<string, { project: Building['project']; buildings: Building[] }>();
    
    filteredBuildings.forEach((building) => {
      const projectId = building.project.id;
      if (!grouped.has(projectId)) {
        grouped.set(projectId, {
          project: building.project,
          buildings: [],
        });
      }
      grouped.get(projectId)!.buildings.push(building);
    });
    
    return Array.from(grouped.values());
  }, [filteredBuildings]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="size-8" />
              All Buildings
            </h1>
            <p className="text-muted-foreground mt-1">
              Overview of all buildings across projects
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowAddDialog(true)}
              size="sm"
            >
              <Plus className="size-4 mr-2" />
              Add Building
            </Button>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="size-4 mr-2" />
                Delete ({selectedIds.size})
              </Button>
            )}
            <Badge variant="secondary" className="text-sm">
              {filteredBuildings.length} {filteredBuildings.length === 1 ? 'Building' : 'Buildings'}
            </Badge>
            <Badge variant="secondary" className="text-sm">
              {buildingsByProject.length} {buildingsByProject.length === 1 ? 'Project' : 'Projects'}
            </Badge>
            <div className="flex gap-1 ml-2">
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
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search buildings, projects, or clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Buildings Display */}
        {filteredBuildings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="size-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">
                {search ? 'No buildings found matching your search' : 'No buildings found'}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredBuildings.length > 0 && selectedIds.size === filteredBuildings.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Project Number</TableHead>
                    <TableHead>Building Name</TableHead>
                    <TableHead>Building Designation</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBuildings.map((building) => (
                    <TableRow key={building.id} className={selectedIds.has(building.id) ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(building.id)}
                          onCheckedChange={() => toggleSelect(building.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{building.project.name}</TableCell>
                      <TableCell>{building.project.projectNumber}</TableCell>
                      <TableCell>{building.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{building.designation}</Badge>
                      </TableCell>
                      <TableCell>{building.project.client.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusColors[building.project.status as keyof typeof statusColors]}
                        >
                          {building.project.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/projects/${building.project.id}`}>
                            <ExternalLink className="size-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {buildingsByProject.map(({ project, buildings }) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">
                          {project.projectNumber} - {project.name}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={statusColors[project.status as keyof typeof statusColors]}
                        >
                          {project.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Client: {project.client.name}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/projects/${project.id}`}>
                        View Project
                        <ExternalLink className="size-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {buildings.map((building) => (
                      <Card key={building.id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="font-bold text-primary text-lg">
                                {building.designation}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold truncate">{building.name}</h4>
                              {building.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {building.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Building Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add Building</DialogTitle>
              <DialogDescription>
                Create a new building for a project
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">
                  Project <span className="text-destructive">*</span>
                </Label>
                <Select name="projectId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildingsByProject.map(({ project }) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.projectNumber} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="designation">
                  Designation <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="designation"
                  name="designation"
                  placeholder="e.g., BLD1, WH, MAIN"
                  required
                  disabled={isCreating}
                  maxLength={4}
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  2-4 uppercase letters/numbers (e.g., BLD1, WH, MAIN)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Building Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Main Warehouse"
                  required
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Optional description..."
                  disabled={isCreating}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="size-4 animate-spin mr-2" />}
                Create Building
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="size-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} building{selectedIds.size !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-auto border rounded-md p-2 bg-muted/50">
            <ul className="text-sm space-y-1">
              {filteredBuildings
                .filter(b => selectedIds.has(b.id))
                .map(b => (
                  <li key={b.id} className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{b.designation}</Badge>
                    <span>{b.name}</span>
                    <span className="text-muted-foreground">({b.project.projectNumber})</span>
                  </li>
                ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4 mr-2" />
                  Delete {selectedIds.size} Building{selectedIds.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
