'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Target, Plus, TrendingUp, Activity, X, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ObjectivesPage() {
  const { toast } = useToast();
  const [objectives, setObjectives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [editingObjective, setEditingObjective] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [objectiveToDelete, setObjectiveToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    title: '',
    description: '',
    category: 'Financial',
    ownerId: '',
    priority: 'Medium',
    keyResults: [] as any[],
    quarterlyActions: { Q1: [], Q2: [], Q3: [], Q4: [] },
  });

  const [newKeyResult, setNewKeyResult] = useState({
    title: '',
    targetValue: '',
    unit: '',
  });

  useEffect(() => {
    fetchObjectives();
    fetchUsers();
  }, [selectedYear]);

  const fetchObjectives = async () => {
    try {
      const res = await fetch(`/api/business-planning/objectives?year=${selectedYear}`);
      const data = await res.json();
      setObjectives(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching objectives:', error);
      setLoading(false);
    }
  };

  const availableYears = [2024, 2025, 2026, 2027, 2028];

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const addKeyResult = () => {
    if (newKeyResult.title && newKeyResult.targetValue) {
      setFormData({
        ...formData,
        keyResults: [...formData.keyResults, {
          ...newKeyResult,
          targetValue: parseFloat(newKeyResult.targetValue),
          currentValue: 0,
        }],
      });
      setNewKeyResult({ title: '', targetValue: '', unit: '' });
    }
  };

  const removeKeyResult = (index: number) => {
    setFormData({
      ...formData,
      keyResults: formData.keyResults.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.ownerId) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const method = editingObjective ? 'PUT' : 'POST';
      const payload = editingObjective 
        ? { ...formData, id: editingObjective.id }
        : formData;

      const res = await fetch('/api/business-planning/objectives', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: editingObjective ? 'Objective updated successfully' : 'Objective created successfully',
        });
        setDialogOpen(false);
        setEditingObjective(null);
        setFormData({
          year: new Date().getFullYear(),
          title: '',
          description: '',
          category: 'Financial',
          ownerId: '',
          priority: 'Medium',
          keyResults: [],
          quarterlyActions: { Q1: [], Q2: [], Q3: [], Q4: [] },
        });
        fetchObjectives();
      } else {
        throw new Error(editingObjective ? 'Failed to update objective' : 'Failed to create objective');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: editingObjective ? 'Failed to update objective' : 'Failed to create objective',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (objective: any) => {
    setEditingObjective(objective);
    setFormData({
      year: objective.year,
      title: objective.title,
      description: objective.description || '',
      category: objective.category,
      ownerId: objective.ownerId,
      priority: objective.priority,
      keyResults: objective.keyResults.map((kr: any) => ({
        title: kr.title,
        targetValue: kr.targetValue,
        currentValue: kr.currentValue,
        unit: kr.unit,
      })),
      quarterlyActions: objective.quarterlyActions || { Q1: [], Q2: [], Q3: [], Q4: [] },
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!objectiveToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/business-planning/objectives?id=${objectiveToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Objective deleted successfully',
        });
        setDeleteDialogOpen(false);
        setObjectiveToDelete(null);
        fetchObjectives();
      } else {
        throw new Error('Failed to delete objective');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete objective',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingObjective(null);
      setFormData({
        year: new Date().getFullYear(),
        title: '',
        description: '',
        category: 'Financial',
        ownerId: '',
        priority: 'Medium',
        keyResults: [],
        quarterlyActions: { Q1: [], Q2: [], Q3: [], Q4: [] },
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'On Track': return 'bg-blue-100 text-blue-800';
      case 'At Risk': return 'bg-yellow-100 text-yellow-800';
      case 'Behind': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Financial': return 'bg-purple-100 text-purple-800';
      case 'Customer': return 'bg-blue-100 text-blue-800';
      case 'Internal Process': return 'bg-green-100 text-green-800';
      case 'Learning & Growth': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredObjectives = filter === 'all' 
    ? objectives 
    : objectives.filter(obj => obj.category === filter);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
            <Target className="h-8 w-8" />
            Company Objectives (OKRs)
          </h1>
          <p className="text-muted-foreground mt-2">
            Strategic objectives defining WHAT Hexa Steel must achieve
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Year Selector */}
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Objective
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingObjective ? 'Edit Objective' : 'Create New Objective'}</DialogTitle>
              <DialogDescription>
                {editingObjective ? 'Update the objective details and key results' : 'Define a company objective with measurable key results'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Year */}
              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Select
                  value={formData.year.toString()}
                  onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Objective Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Achieve 20% Revenue Growth"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the objective..."
                  rows={3}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">BSC Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Financial">Financial</SelectItem>
                    <SelectItem value="Customer">Customer</SelectItem>
                    <SelectItem value="Internal Process">Internal Process</SelectItem>
                    <SelectItem value="Learning & Growth">Learning & Growth</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Owner */}
              <div className="space-y-2">
                <Label htmlFor="owner">Owner *</Label>
                <Select
                  value={formData.ownerId}
                  onValueChange={(value) => setFormData({ ...formData, ownerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} - {user.position || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Key Results */}
              <div className="space-y-2">
                <Label>Key Results</Label>
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-6"
                      placeholder="Key result title"
                      value={newKeyResult.title}
                      onChange={(e) => setNewKeyResult({ ...newKeyResult, title: e.target.value })}
                    />
                    <Input
                      className="col-span-3"
                      type="number"
                      placeholder="Target"
                      value={newKeyResult.targetValue}
                      onChange={(e) => setNewKeyResult({ ...newKeyResult, targetValue: e.target.value })}
                    />
                    <Input
                      className="col-span-2"
                      placeholder="Unit"
                      value={newKeyResult.unit}
                      onChange={(e) => setNewKeyResult({ ...newKeyResult, unit: e.target.value })}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={addKeyResult}
                      className="col-span-1"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {formData.keyResults.length > 0 && (
                    <div className="space-y-2">
                      {formData.keyResults.map((kr, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                          <span className="text-sm flex-1">{kr.title}</span>
                          <span className="text-sm text-muted-foreground">
                            Target: {kr.targetValue} {kr.unit}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeKeyResult(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleDialogClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? (editingObjective ? 'Updating...' : 'Creating...') : (editingObjective ? 'Update Objective' : 'Create Objective')}
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{objectives.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {objectives.filter(o => o.status === 'On Track').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {objectives.filter(o => o.status === 'At Risk').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {objectives.filter(o => o.status === 'Completed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'Financial' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('Financial')}
        >
          Financial
        </Button>
        <Button
          variant={filter === 'Customer' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('Customer')}
        >
          Customer
        </Button>
        <Button
          variant={filter === 'Internal Process' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('Internal Process')}
        >
          Internal Process
        </Button>
        <Button
          variant={filter === 'Learning & Growth' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('Learning & Growth')}
        >
          Learning & Growth
        </Button>
      </div>

      {/* Objectives List */}
      <div className="space-y-4">
        {filteredObjectives.map((objective) => (
          <Card key={objective.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getCategoryColor(objective.category)}>
                      {objective.category}
                    </Badge>
                    <Badge className={getStatusColor(objective.status)}>
                      {objective.status}
                    </Badge>
                    {objective.priority === 'Critical' && (
                      <Badge variant="destructive">Critical</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{objective.title}</CardTitle>
                  <CardDescription className="mt-2">{objective.description}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Progress</div>
                  <div className="text-2xl font-bold">{objective.progress}%</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${objective.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Key Results */}
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Key Results ({objective.keyResults?.length || 0})
                </div>
                {objective.keyResults?.slice(0, 3).map((kr: any) => (
                  <div key={kr.id} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                    <span className="flex-1">{kr.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {kr.currentValue} / {kr.targetValue} {kr.unit}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round((kr.currentValue / kr.targetValue) * 100)}%
                      </Badge>
                    </div>
                  </div>
                ))}
                {objective.keyResults?.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{objective.keyResults.length - 3} more key results
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>Owner: {objective.owner?.name}</span>
                  <span>•</span>
                  <span>{objective._count?.initiatives || 0} initiatives</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEdit(objective)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setObjectiveToDelete(objective);
                      setDeleteDialogOpen(true);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredObjectives.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No objectives found</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Objective
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Objective</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{objectiveToDelete?.title}"? This action cannot be undone and will also delete all associated key results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
