'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Plus, Calendar, DollarSign, User, X, Edit, Trash2, LayoutGrid, List } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<string, { bg: string; text: string; btn: string }> = {
  'Planned': { bg: 'bg-slate-100', text: 'text-slate-800', btn: 'bg-slate-500' },
  'In Progress': { bg: 'bg-blue-100', text: 'text-blue-800', btn: 'bg-blue-600' },
  'On Hold': { bg: 'bg-amber-100', text: 'text-amber-800', btn: 'bg-amber-500' },
  'Completed': { bg: 'bg-emerald-100', text: 'text-emerald-800', btn: 'bg-emerald-600' },
  'Cancelled': { bg: 'bg-red-100', text: 'text-red-800', btn: 'bg-red-600' },
};

export default function InitiativesPage() {
  const { toast } = useToast();
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedInitiative, setSelectedInitiative] = useState<any>(null);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    objectiveId: '',
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    budget: '',
    ownerId: '',
    status: 'Planned',
  });

  useEffect(() => {
    fetchInitiatives();
    fetchObjectives();
    fetchUsers();
  }, []);

  const fetchInitiatives = async () => {
    try {
      const res = await fetch('/api/business-planning/initiatives');
      const data = await res.json();
      setInitiatives(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching initiatives:', error);
      setLoading(false);
    }
  };

  const fetchObjectives = async () => {
    try {
      const res = await fetch(`/api/business-planning/objectives?year=${formData.year}`);
      const data = await res.json();
      setObjectives(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching objectives:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.objectiveId || !formData.ownerId) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields (Name, Objective, Owner)',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      };

      const res = selectedInitiative
        ? await fetch(`/api/business-planning/initiatives?id=${selectedInitiative.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/business-planning/initiatives', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        toast({
          title: 'Success',
          description: selectedInitiative ? 'Initiative updated successfully' : 'Initiative created successfully',
        });
        setDialogOpen(false);
        resetForm();
        fetchInitiatives();
      } else {
        throw new Error('Failed to save initiative');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save initiative',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInitiative) return;
    try {
      const res = await fetch(`/api/business-planning/initiatives?id=${selectedInitiative.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Initiative deleted successfully' });
        setDeleteOpen(false);
        setSelectedInitiative(null);
        fetchInitiatives();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete initiative', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      objectiveId: '',
      year: new Date().getFullYear(),
      startDate: '',
      endDate: '',
      budget: '',
      ownerId: '',
      status: 'Planned',
    });
    setSelectedInitiative(null);
  };

  const openEdit = (initiative: any) => {
    setSelectedInitiative(initiative);
    setFormData({
      name: initiative.name || '',
      description: initiative.description || '',
      objectiveId: initiative.objectiveId || '',
      year: initiative.year || new Date().getFullYear(),
      startDate: initiative.startDate ? initiative.startDate.split('T')[0] : '',
      endDate: initiative.endDate ? initiative.endDate.split('T')[0] : '',
      budget: initiative.budget?.toString() || '',
      ownerId: initiative.ownerId || '',
      status: initiative.status || 'Planned',
    });
    setDialogOpen(true);
  };

  const openDetails = (initiative: any) => {
    setSelectedInitiative(initiative);
    setDetailsOpen(true);
  };

  const openDelete = (initiative: any) => {
    setSelectedInitiative(initiative);
    setDeleteOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Planned': return 'bg-gray-100 text-gray-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInitiatives = filter === 'all' 
    ? initiatives 
    : initiatives.filter(init => init.status === filter);

  const statuses = ['Planned', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Lightbulb className="h-8 w-8" />
            Strategic Initiatives
          </h1>
          <p className="text-muted-foreground mt-2">
            Major projects and initiatives aligned with company objectives
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Initiative
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {statuses.map((status) => {
          const count = initiatives.filter(i => i.status === status).length;
          return (
            <Card key={status}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{status}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All Initiatives
          </Button>
          <Button
            variant={filter === 'Planned' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('Planned')}
            className={filter === 'Planned' ? 'bg-slate-600 hover:bg-slate-700' : ''}
          >
            Planned
          </Button>
          <Button
            variant={filter === 'In Progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('In Progress')}
            className={filter === 'In Progress' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            In Progress
          </Button>
          <Button
            variant={filter === 'On Hold' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('On Hold')}
            className={filter === 'On Hold' ? 'bg-amber-500 hover:bg-amber-600' : ''}
          >
            On Hold
          </Button>
          <Button
            variant={filter === 'Completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('Completed')}
            className={filter === 'Completed' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            Completed
          </Button>
          <Button
            variant={filter === 'Cancelled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('Cancelled')}
            className={filter === 'Cancelled' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            Cancelled
          </Button>
        </div>
        <div className="flex gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Card View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInitiatives.map((initiative) => (
          <Card key={initiative.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <Badge className={getStatusColor(initiative.status)}>
                  {initiative.status}
                </Badge>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Progress</div>
                  <div className="text-lg font-bold">{initiative.progress}%</div>
                </div>
              </div>
              <CardTitle className="text-lg">{initiative.name}</CardTitle>
              <CardDescription className="line-clamp-2">{initiative.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Progress Bar */}
              <div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${initiative.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Expected Impact */}
              {initiative.expectedImpact && (
                <div className="bg-blue-50 p-2 rounded text-xs">
                  <div className="font-medium mb-1">Expected Impact:</div>
                  <div className="text-muted-foreground line-clamp-2">{initiative.expectedImpact}</div>
                </div>
              )}

              {/* Details */}
              <div className="space-y-2 text-xs">
                {initiative.budget && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Budget:</span>
                    <span className="font-medium">SAR {initiative.budget.toLocaleString()}</span>
                  </div>
                )}
                {initiative.owner && (
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Owner:</span>
                    <span className="font-medium">{initiative.owner.name}</span>
                  </div>
                )}
                {initiative.department && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium">{initiative.department.name}</span>
                  </div>
                )}
                {initiative.startDate && initiative.endDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Timeline:</span>
                    <span className="font-medium">
                      {new Date(initiative.startDate).toLocaleDateString()} - {new Date(initiative.endDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 border-t flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => openDetails(initiative)}>
                  View Details
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(initiative)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openDelete(initiative)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Progress</th>
                    <th className="text-left p-4 font-medium">Owner</th>
                    <th className="text-left p-4 font-medium">Timeline</th>
                    <th className="text-left p-4 font-medium">Budget</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInitiatives.map((initiative) => {
                    const colors = statusColors[initiative.status];
                    return (
                      <tr key={initiative.id} className="border-t hover:bg-muted/30">
                        <td className="p-4">
                          <div className="font-medium">{initiative.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{initiative.description}</div>
                        </td>
                        <td className="p-4">
                          <Badge className={`${colors.bg} ${colors.text}`}>{initiative.status}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${initiative.progress}%` }}></div>
                            </div>
                            <span className="text-sm">{initiative.progress}%</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm">{initiative.owner?.name || '-'}</td>
                        <td className="p-4 text-sm">
                          {initiative.startDate && initiative.endDate
                            ? `${new Date(initiative.startDate).toLocaleDateString()} - ${new Date(initiative.endDate).toLocaleDateString()}`
                            : '-'}
                        </td>
                        <td className="p-4 text-sm">
                          {initiative.budget ? `SAR ${initiative.budget.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => openDetails(initiative)}>
                              View
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(initiative)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openDelete(initiative)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredInitiatives.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No initiatives found</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create First Initiative
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      {initiatives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Budget</div>
                <div className="text-2xl font-bold">
                  SAR {initiatives.reduce((sum, i) => sum + (i.budget || 0), 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Average Progress</div>
                <div className="text-2xl font-bold">
                  {Math.round(initiatives.reduce((sum, i) => sum + i.progress, 0) / initiatives.length)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Completion Rate</div>
                <div className="text-2xl font-bold">
                  {Math.round((initiatives.filter(i => i.status === 'Completed').length / initiatives.length) * 100)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Initiative Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Initiative</DialogTitle>
            <DialogDescription>
              Add a new strategic initiative aligned with company objectives
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Initiative Title *</Label>
              <Input
                id="title"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Launch New Product Line"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the initiative and its goals..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Year */}
              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Select
                  value={formData.year.toString()}
                  onValueChange={(value) => {
                    setFormData({ ...formData, year: parseInt(value) });
                    fetchObjectives();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planned">Planned</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Objective */}
            <div className="space-y-2">
              <Label htmlFor="objective">Aligned Objective *</Label>
              <Select
                value={formData.objectiveId || "none"}
                onValueChange={(value) => setFormData({ ...formData, objectiveId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select objective" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select objective...</SelectItem>
                  {objectives.map((obj) => (
                    <SelectItem key={obj.id} value={obj.id}>
                      {obj.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Owner */}
            <div className="space-y-2">
              <Label htmlFor="owner">Initiative Owner *</Label>
              <Select
                value={formData.ownerId || "none"}
                onValueChange={(value) => setFormData({ ...formData, ownerId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select owner...</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} - {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (Optional)</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="e.g., 100000"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : selectedInitiative ? 'Update Initiative' : 'Create Initiative'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedInitiative?.name}</DialogTitle>
            <DialogDescription>Initiative Details</DialogDescription>
          </DialogHeader>
          {selectedInitiative && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge className={`${getStatusColor(selectedInitiative.status)} text-sm px-3 py-1`}>
                  {selectedInitiative.status}
                </Badge>
                <span className="text-muted-foreground">Year: {selectedInitiative.year}</span>
              </div>
              
              {selectedInitiative.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground">{selectedInitiative.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1 text-sm text-muted-foreground">Owner</h4>
                  <p>{selectedInitiative.owner?.name || '-'}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-sm text-muted-foreground">Budget</h4>
                  <p>{selectedInitiative.budget ? `SAR ${selectedInitiative.budget.toLocaleString()}` : '-'}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-sm text-muted-foreground">Start Date</h4>
                  <p>{selectedInitiative.startDate ? new Date(selectedInitiative.startDate).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-sm text-muted-foreground">End Date</h4>
                  <p>{selectedInitiative.endDate ? new Date(selectedInitiative.endDate).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-sm text-muted-foreground">Progress</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${selectedInitiative.progress}%` }}></div>
                    </div>
                    <span>{selectedInitiative.progress}%</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-sm text-muted-foreground">Aligned Objective</h4>
                  <p>{selectedInitiative.objective?.title || '-'}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
            <Button onClick={() => { setDetailsOpen(false); openEdit(selectedInitiative); }}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Initiative</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedInitiative?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
