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
import { Network, Plus, Target, TrendingUp, Lightbulb, AlertTriangle, X, LayoutGrid, Table as TableIcon, Edit, Trash2, CheckSquare, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DepartmentPlansPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<any>(null);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    departmentId: '',
    year: new Date().getFullYear(),
    name: '',
    alignedObjectives: [] as string[],
    priorities: [''],
    risks: [''],
    dependencies: [''],
  });

  useEffect(() => {
    fetchPlans();
    fetchDepartments();
  }, [selectedYear]);

  useEffect(() => {
    if (formData.year) {
      fetchObjectives(formData.year);
    }
  }, [formData.year]);

  const fetchPlans = async () => {
    try {
      const res = await fetch(`/api/business-planning/department-plans?year=${selectedYear}`);
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchObjectives = async (year: number) => {
    try {
      const res = await fetch(`/api/business-planning/objectives?year=${year}`);
      const data = await res.json();
      setObjectives(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching objectives:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.departmentId || !formData.name) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields (Department, Plan Name)',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/business-planning/department-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          priorities: formData.priorities.filter(p => p.trim()),
          risks: formData.risks.filter(r => r.trim()),
          dependencies: formData.dependencies.filter(d => d.trim()),
        }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Department plan created successfully',
        });
        setDialogOpen(false);
        setFormData({
          departmentId: '',
          year: new Date().getFullYear(),
          name: '',
          alignedObjectives: [],
          priorities: [''],
          risks: [''],
          dependencies: [''],
        });
        fetchPlans();
      } else {
        throw new Error('Failed to create plan');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create department plan',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addArrayItem = (field: 'priorities' | 'risks' | 'dependencies') => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeArrayItem = (field: 'priorities' | 'risks' | 'dependencies', index: number) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray.length > 0 ? newArray : [''] });
  };

  const updateArrayItem = (field: 'priorities' | 'risks' | 'dependencies', index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const toggleObjective = (objectiveId: string) => {
    const current = formData.alignedObjectives;
    if (current.includes(objectiveId)) {
      setFormData({ ...formData, alignedObjectives: current.filter(id => id !== objectiveId) });
    } else {
      setFormData({ ...formData, alignedObjectives: [...current, objectiveId] });
    }
  };

  const viewPlanDetails = (plan: any) => {
    setSelectedPlan(plan);
    setDetailsOpen(true);
  };

  const openEditDialog = (plan: any) => {
    // Prepare form data from existing plan
    setEditFormData({
      id: plan.id,
      departmentId: plan.department.id,
      year: plan.year,
      name: plan.name || '',
      alignedObjectives: plan.objectives?.map((obj: any) => obj.companyObjectiveId).filter(Boolean) || [],
      priorities: Array.isArray(plan.priorities) && plan.priorities.length > 0 ? plan.priorities : [''],
      risks: Array.isArray(plan.risks) && plan.risks.length > 0 ? plan.risks : [''],
      dependencies: Array.isArray(plan.dependencies) && plan.dependencies.length > 0 ? plan.dependencies : [''],
    });
    setEditDialogOpen(true);
    setDetailsOpen(false);
  };

  const handleEditSubmit = async () => {
    if (!editFormData || !editFormData.name) {
      toast({
        title: 'Error',
        description: 'Please fill in the plan name',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/business-planning/department-plans/${editFormData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name,
          alignedObjectives: editFormData.alignedObjectives,
          priorities: editFormData.priorities.filter((p: string) => p.trim()),
          risks: editFormData.risks.filter((r: string) => r.trim()),
          dependencies: editFormData.dependencies.filter((d: string) => d.trim()),
        }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Department plan updated successfully',
        });
        setEditDialogOpen(false);
        setEditFormData(null);
        fetchPlans();
      } else {
        throw new Error('Failed to update plan');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update department plan',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateEditArrayItem = (field: 'priorities' | 'risks' | 'dependencies', index: number, value: string) => {
    const newArray = [...editFormData[field]];
    newArray[index] = value;
    setEditFormData({ ...editFormData, [field]: newArray });
  };

  const addEditArrayItem = (field: 'priorities' | 'risks' | 'dependencies') => {
    setEditFormData({ ...editFormData, [field]: [...editFormData[field], ''] });
  };

  const removeEditArrayItem = (field: 'priorities' | 'risks' | 'dependencies', index: number) => {
    const newArray = editFormData[field].filter((_: any, i: number) => i !== index);
    setEditFormData({ ...editFormData, [field]: newArray.length > 0 ? newArray : [''] });
  };

  const toggleEditObjective = (objectiveId: string) => {
    const current = editFormData.alignedObjectives;
    if (current.includes(objectiveId)) {
      setEditFormData({ ...editFormData, alignedObjectives: current.filter((id: string) => id !== objectiveId) });
    } else {
      setEditFormData({ ...editFormData, alignedObjectives: [...current, objectiveId] });
    }
  };

  const togglePlanSelection = (planId: string) => {
    if (selectedPlans.includes(planId)) {
      setSelectedPlans(selectedPlans.filter(id => id !== planId));
    } else {
      setSelectedPlans([...selectedPlans, planId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedPlans.length === plans.length) {
      setSelectedPlans([]);
    } else {
      setSelectedPlans(plans.map(p => p.id));
    }
  };

  const openDeleteDialog = (plan: any) => {
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!planToDelete) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/business-planning/department-plans/${planToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Department plan deleted successfully',
        });
        setDeleteDialogOpen(false);
        setPlanToDelete(null);
        fetchPlans();
      } else {
        throw new Error('Failed to delete plan');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete department plan',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPlans.length === 0) return;

    setSaving(true);
    try {
      const deletePromises = selectedPlans.map(planId =>
        fetch(`/api/business-planning/department-plans/${planId}`, {
          method: 'DELETE',
        })
      );

      await Promise.all(deletePromises);

      toast({
        title: 'Success',
        description: `${selectedPlans.length} department plan(s) deleted successfully`,
      });
      setSelectedPlans([]);
      setIsMultiSelectMode(false);
      fetchPlans();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete some department plans',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

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
            <Network className="h-8 w-8" />
            Department Plans
          </h1>
          <p className="text-muted-foreground mt-2">
            Department-level strategic plans aligned with company objectives
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Multi-Select Mode Toggle */}
          {plans.length > 0 && (
            <Button
              variant={isMultiSelectMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                setSelectedPlans([]);
              }}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              {isMultiSelectMode ? 'Cancel Selection' : 'Select Multiple'}
            </Button>
          )}

          {/* Bulk Delete Button */}
          {isMultiSelectMode && selectedPlans.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete {selectedPlans.length} Plan{selectedPlans.length !== 1 ? 's' : ''}
            </Button>
          )}

          {/* Select All Button */}
          {isMultiSelectMode && plans.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
            >
              {selectedPlans.length === plans.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-md p-1">
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
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Year Selector */}
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
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
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Department Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Department Plan</DialogTitle>
                <DialogDescription>
                  Define strategic plan for a department for the selected year
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Department & Year */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Select
                      value={formData.departmentId}
                      onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
                        {[2024, 2025, 2026, 2027, 2028].map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Plan Name */}
                <div className="space-y-2">
                  <Label htmlFor="planName">Plan Name *</Label>
                  <Input
                    id="planName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Q1-Q2 Growth Initiative, Digital Transformation, etc."
                  />
                  <p className="text-xs text-muted-foreground">
                    Give this plan a descriptive name to distinguish it from other plans
                  </p>
                </div>

                {/* Aligned Objectives */}
                <div className="space-y-2">
                  <Label>Aligned Company Objectives (Optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select which company objectives this department plan supports
                  </p>
                  {objectives.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                      No company objectives found for {formData.year}. Create company objectives first.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                      {objectives.map((objective) => (
                        <div key={objective.id} className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            id={`obj-${objective.id}`}
                            checked={formData.alignedObjectives.includes(objective.id)}
                            onChange={() => toggleObjective(objective.id)}
                            className="mt-1"
                          />
                          <label htmlFor={`obj-${objective.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium text-sm">{objective.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {objective.category} • {objective.keyResults?.length || 0} Key Results
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  {formData.alignedObjectives.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {formData.alignedObjectives.length} objective{formData.alignedObjectives.length !== 1 ? 's' : ''} selected
                    </div>
                  )}
                </div>

                {/* Priorities */}
                <div className="space-y-2">
                  <Label>Strategic Priorities</Label>
                  {formData.priorities.map((priority, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={priority}
                        onChange={(e) => updateArrayItem('priorities', index, e.target.value)}
                        placeholder={`Priority ${index + 1}`}
                      />
                      {formData.priorities.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeArrayItem('priorities', index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('priorities')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Priority
                  </Button>
                </div>

                {/* Risks */}
                <div className="space-y-2">
                  <Label>Key Risks & Blockers</Label>
                  {formData.risks.map((risk, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={risk}
                        onChange={(e) => updateArrayItem('risks', index, e.target.value)}
                        placeholder={`Risk ${index + 1}`}
                      />
                      {formData.risks.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeArrayItem('risks', index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('risks')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Risk
                  </Button>
                </div>

                {/* Dependencies */}
                <div className="space-y-2">
                  <Label>Dependencies on Other Teams</Label>
                  {formData.dependencies.map((dep, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={dep}
                        onChange={(e) => updateArrayItem('dependencies', index, e.target.value)}
                        placeholder={`Dependency ${index + 1}`}
                      />
                      {formData.dependencies.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeArrayItem('dependencies', index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('dependencies')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Dependency
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Plan'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Department Plans - Card View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`hover:shadow-lg transition-shadow ${
                isMultiSelectMode ? 'cursor-default' : 'cursor-pointer'
              } ${
                selectedPlans.includes(plan.id) ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => !isMultiSelectMode && viewPlanDetails(plan)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Checkbox for multi-select */}
                    {isMultiSelectMode && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlanSelection(plan.id);
                        }}
                        className="cursor-pointer mt-1"
                      >
                        {selectedPlans.includes(plan.id) ? (
                          <CheckSquare className="h-5 w-5 text-primary" />
                        ) : (
                          <Square className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-xl">{plan.department.name}</CardTitle>
                      <CardDescription>
                        {plan.name || `${plan.year} Strategic Plan`}
                        {plan.name && <span className="text-muted-foreground"> • {plan.year}</span>}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">{plan.year}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Metrics Summary */}
                <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <Target className="h-3 w-3" />
                  </div>
                  <div className="text-2xl font-bold">{plan.objectives?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Objectives</div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <TrendingUp className="h-3 w-3" />
                  </div>
                  <div className="text-2xl font-bold">{plan.kpis?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">KPIs</div>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <Lightbulb className="h-3 w-3" />
                  </div>
                  <div className="text-2xl font-bold">{plan.initiatives?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Initiatives</div>
                </div>
              </div>

              {/* Aligned Objectives */}
              {plan.objectives && plan.objectives.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Aligned Objectives</div>
                  <div className="space-y-1">
                    {plan.objectives.slice(0, 2).map((obj: any) => (
                      <div key={obj.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {obj.companyObjective?.title || 'Objective'}
                      </div>
                    ))}
                    {plan.objectives.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{plan.objectives.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Priorities */}
              {plan.priorities && Array.isArray(plan.priorities) && plan.priorities.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Strategic Priorities</div>
                  <div className="space-y-1">
                    {plan.priorities.slice(0, 3).map((priority: string, idx: number) => (
                      <div key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{priority}</span>
                      </div>
                    ))}
                    {plan.priorities.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{plan.priorities.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              {!isMultiSelectMode && (
                <div className="pt-2 border-t flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewPlanDetails(plan);
                    }}
                  >
                    View Details
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteDialog(plan);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Department Plans - Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    {isMultiSelectMode && (
                      <th className="text-center p-4 font-medium w-12">
                        <div 
                          onClick={toggleSelectAll}
                          className="cursor-pointer inline-block"
                        >
                          {selectedPlans.length === plans.length ? (
                            <CheckSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <Square className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </th>
                    )}
                    <th className="text-left p-4 font-medium">Department</th>
                    <th className="text-left p-4 font-medium">Plan Name</th>
                    <th className="text-left p-4 font-medium">Year</th>
                    <th className="text-center p-4 font-medium">Objectives</th>
                    <th className="text-center p-4 font-medium">KPIs</th>
                    <th className="text-center p-4 font-medium">Initiatives</th>
                    <th className="text-center p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr 
                      key={plan.id} 
                      className={`border-b hover:bg-muted/50 ${
                        isMultiSelectMode ? 'cursor-default' : 'cursor-pointer'
                      } ${
                        selectedPlans.includes(plan.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => !isMultiSelectMode && viewPlanDetails(plan)}
                    >
                      {isMultiSelectMode && (
                        <td className="p-4 text-center">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlanSelection(plan.id);
                            }}
                            className="cursor-pointer inline-block"
                          >
                            {selectedPlans.includes(plan.id) ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </td>
                      )}
                      <td className="p-4">
                        <div className="font-medium">{plan.department.name}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{plan.name || 'Unnamed Plan'}</div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{plan.year}</Badge>
                      </td>
                      <td className="p-4 text-center">
                        <div className="text-lg font-bold">{plan.objectives?.length || 0}</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="text-lg font-bold">{plan.kpis?.length || 0}</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="text-lg font-bold">{plan.initiatives?.length || 0}</div>
                      </td>
                      <td className="p-4 text-center">
                        {!isMultiSelectMode && (
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                viewPlanDetails(plan);
                              }}
                            >
                              View
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog(plan);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {plans.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Network className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Department Plans Found</p>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Create department plans to cascade company objectives to individual departments and track their strategic execution.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Department Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overall Summary for {selectedYear}</CardTitle>
            <CardDescription>Aggregated metrics across all department plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Plans</div>
                <div className="text-2xl font-bold">{plans.length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Objectives</div>
                <div className="text-2xl font-bold">
                  {plans.reduce((sum, p) => sum + (p.objectives?.length || 0), 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total KPIs</div>
                <div className="text-2xl font-bold">
                  {plans.reduce((sum, p) => sum + (p.kpis?.length || 0), 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Initiatives</div>
                <div className="text-2xl font-bold">
                  {plans.reduce((sum, p) => sum + (p.initiatives?.length || 0), 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedPlan && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedPlan.department.name} - {selectedPlan.year}</DialogTitle>
                <DialogDescription>
                  Department Strategic Plan Details
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Objectives
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{selectedPlan.objectives?.length || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        KPIs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{selectedPlan.kpis?.length || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Initiatives
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{selectedPlan.initiatives?.length || 0}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Aligned Objectives */}
                {selectedPlan.objectives && selectedPlan.objectives.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Aligned Company Objectives</h3>
                    <div className="space-y-2">
                      {selectedPlan.objectives.map((obj: any) => (
                        <div key={obj.id} className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                          <div className="font-medium text-blue-900">
                            {obj.companyObjective?.title || 'Company Objective'}
                          </div>
                          <div className="text-sm text-blue-700 mt-1">
                            {obj.companyObjective?.category} • Progress: {obj.progress}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strategic Priorities */}
                {selectedPlan.priorities && Array.isArray(selectedPlan.priorities) && selectedPlan.priorities.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Strategic Priorities</h3>
                    <ul className="space-y-2">
                      {selectedPlan.priorities.map((priority: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                          <span className="text-primary font-bold">{idx + 1}.</span>
                          <span>{priority}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risks */}
                {selectedPlan.risks && Array.isArray(selectedPlan.risks) && selectedPlan.risks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Key Risks & Blockers
                    </h3>
                    <ul className="space-y-2">
                      {selectedPlan.risks.map((risk: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <span className="text-orange-600">⚠</span>
                          <span className="text-orange-900">{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dependencies */}
                {selectedPlan.dependencies && Array.isArray(selectedPlan.dependencies) && selectedPlan.dependencies.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Dependencies on Other Teams</h3>
                    <ul className="space-y-2">
                      {selectedPlan.dependencies.map((dep: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <span className="text-purple-600">🔗</span>
                          <span className="text-purple-900">{dep}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => openEditDialog(selectedPlan)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Plan
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      setDetailsOpen(false);
                      openDeleteDialog(selectedPlan);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Plan
                  </Button>
                </div>
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {editFormData && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Department Plan</DialogTitle>
                <DialogDescription>
                  Update the strategic plan for this department
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Department & Year (Read-only) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input 
                      value={departments.find(d => d.id === editFormData.departmentId)?.name || ''} 
                      disabled 
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input 
                      value={editFormData.year} 
                      disabled 
                      className="bg-muted"
                    />
                  </div>
                </div>

                {/* Plan Name */}
                <div className="space-y-2">
                  <Label htmlFor="edit-planName">Plan Name *</Label>
                  <Input
                    id="edit-planName"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="e.g., Q1-Q2 Growth Initiative, Digital Transformation, etc."
                  />
                  <p className="text-xs text-muted-foreground">
                    Give this plan a descriptive name to distinguish it from other plans
                  </p>
                </div>

                {/* Aligned Objectives */}
                <div className="space-y-2">
                  <Label>Aligned Company Objectives (Optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select which company objectives this department plan supports
                  </p>
                  {objectives.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                      No company objectives found for {editFormData.year}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                      {objectives.map((objective) => (
                        <div key={objective.id} className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            id={`edit-obj-${objective.id}`}
                            checked={editFormData.alignedObjectives.includes(objective.id)}
                            onChange={() => toggleEditObjective(objective.id)}
                            className="mt-1"
                          />
                          <label htmlFor={`edit-obj-${objective.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium text-sm">{objective.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {objective.category} • {objective.keyResults?.length || 0} Key Results
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  {editFormData.alignedObjectives.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {editFormData.alignedObjectives.length} objective{editFormData.alignedObjectives.length !== 1 ? 's' : ''} selected
                    </div>
                  )}
                </div>

                {/* Priorities */}
                <div className="space-y-2">
                  <Label>Strategic Priorities</Label>
                  {editFormData.priorities.map((priority: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={priority}
                        onChange={(e) => updateEditArrayItem('priorities', index, e.target.value)}
                        placeholder={`Priority ${index + 1}`}
                      />
                      {editFormData.priorities.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeEditArrayItem('priorities', index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addEditArrayItem('priorities')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Priority
                  </Button>
                </div>

                {/* Risks */}
                <div className="space-y-2">
                  <Label>Key Risks & Blockers</Label>
                  {editFormData.risks.map((risk: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={risk}
                        onChange={(e) => updateEditArrayItem('risks', index, e.target.value)}
                        placeholder={`Risk ${index + 1}`}
                      />
                      {editFormData.risks.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeEditArrayItem('risks', index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addEditArrayItem('risks')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Risk
                  </Button>
                </div>

                {/* Dependencies */}
                <div className="space-y-2">
                  <Label>Dependencies on Other Teams</Label>
                  {editFormData.dependencies.map((dep: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={dep}
                        onChange={(e) => updateEditArrayItem('dependencies', index, e.target.value)}
                        placeholder={`Dependency ${index + 1}`}
                      />
                      {editFormData.dependencies.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeEditArrayItem('dependencies', index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addEditArrayItem('dependencies')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Dependency
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditSubmit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this department plan? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {planToDelete && (
            <div className="py-4">
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="font-semibold">{planToDelete.department.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {planToDelete.name || `${planToDelete.year} Strategic Plan`}
                    </div>
                    <div className="text-xs text-muted-foreground">Year: {planToDelete.year}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
