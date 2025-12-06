'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Plus, Calendar, DollarSign, User, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function InitiativesPage() {
  const { toast } = useToast();
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
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
    if (!formData.title || !formData.objectiveId || !formData.ownerId) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields (Title, Objective, Owner)',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/business-planning/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
        }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Initiative created successfully',
        });
        setDialogOpen(false);
        setFormData({
          title: '',
          description: '',
          objectiveId: '',
          year: new Date().getFullYear(),
          startDate: '',
          endDate: '',
          budget: '',
          ownerId: '',
          status: 'Planned',
        });
        fetchInitiatives();
      } else {
        throw new Error('Failed to create initiative');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create initiative',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
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
        <Button onClick={() => setDialogOpen(true)}>
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

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All Initiatives
        </Button>
        {statuses.map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Initiatives Grid */}
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
                    <span className="font-medium">${initiative.budget.toLocaleString()}</span>
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
              <div className="pt-2 border-t">
                <Button variant="ghost" size="sm" className="w-full">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                  ${initiatives.reduce((sum, i) => sum + (i.budget || 0), 0).toLocaleString()}
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
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
              {saving ? 'Creating...' : 'Create Initiative'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
