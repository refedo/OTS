'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Plus, Calendar, User, Edit, Trash2, LayoutGrid, List, Link2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<string, { bg: string; text: string }> = {
  'Not Started': { bg: 'bg-slate-100', text: 'text-slate-800' },
  'On Track': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  'At Risk': { bg: 'bg-amber-100', text: 'text-amber-800' },
  'Behind': { bg: 'bg-red-100', text: 'text-red-800' },
  'Completed': { bg: 'bg-blue-100', text: 'text-blue-800' },
};

const categoryColors: Record<string, string> = {
  'Financial': 'bg-green-500',
  'Customer': 'bg-blue-500',
  'Internal Process': 'bg-purple-500',
  'Learning & Growth': 'bg-orange-500',
};

export default function StrategicObjectivesPage() {
  const { toast } = useToast();
  const [objectives, setObjectives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    startYear: new Date().getFullYear(),
    endYear: new Date().getFullYear() + 5,
    ownerId: '',
    priority: 'Medium',
    status: 'Not Started',
    targetOutcome: '',
  });

  useEffect(() => {
    fetchObjectives();
    fetchUsers();
  }, []);

  const fetchObjectives = async () => {
    try {
      const res = await fetch('/api/business-planning/strategic-objectives');
      const data = await res.json();
      setObjectives(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching strategic objectives:', error);
      setLoading(false);
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
    if (!formData.title || !formData.category || !formData.ownerId) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields (Title, Category, Owner)',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = selectedObjective
        ? await fetch(`/api/business-planning/strategic-objectives?id=${selectedObjective.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          })
        : await fetch('/api/business-planning/strategic-objectives', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });

      if (res.ok) {
        toast({
          title: 'Success',
          description: selectedObjective ? 'Strategic objective updated' : 'Strategic objective created',
        });
        setDialogOpen(false);
        resetForm();
        fetchObjectives();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save strategic objective', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedObjective) return;
    try {
      const res = await fetch(`/api/business-planning/strategic-objectives?id=${selectedObjective.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Strategic objective deleted' });
        setDeleteOpen(false);
        setSelectedObjective(null);
        fetchObjectives();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      startYear: new Date().getFullYear(),
      endYear: new Date().getFullYear() + 5,
      ownerId: '',
      priority: 'Medium',
      status: 'Not Started',
      targetOutcome: '',
    });
    setSelectedObjective(null);
  };

  const openEdit = (obj: any) => {
    setSelectedObjective(obj);
    setFormData({
      title: obj.title || '',
      description: obj.description || '',
      category: obj.category || '',
      startYear: obj.startYear || new Date().getFullYear(),
      endYear: obj.endYear || new Date().getFullYear() + 5,
      ownerId: obj.ownerId || '',
      priority: obj.priority || 'Medium',
      status: obj.status || 'Not Started',
      targetOutcome: obj.targetOutcome || '',
    });
    setDialogOpen(true);
  };

  const openDetails = (obj: any) => {
    setSelectedObjective(obj);
    setDetailsOpen(true);
  };

  const openDelete = (obj: any) => {
    setSelectedObjective(obj);
    setDeleteOpen(true);
  };

  const getStatusColor = (status: string) => statusColors[status] || statusColors['Not Started'];

  const filteredObjectives = filter === 'all' 
    ? objectives 
    : objectives.filter(obj => obj.category === filter);

  const categories = ['Financial', 'Customer', 'Internal Process', 'Learning & Growth'];
  const statuses = ['Not Started', 'On Track', 'At Risk', 'Behind', 'Completed'];

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
            <Target className="h-8 w-8" />
            Strategic Objectives
          </h1>
          <p className="text-muted-foreground mt-2">
            Mid-term (5-7 year) strategic goals that guide yearly objectives
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Strategic Objective
        </Button>
      </div>

      {/* Stats by Category */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {categories.map((category) => {
          const count = objectives.filter(o => o.category === category).length;
          const avgProgress = objectives.filter(o => o.category === category).length > 0
            ? Math.round(objectives.filter(o => o.category === category).reduce((sum, o) => sum + o.progress, 0) / objectives.filter(o => o.category === category).length)
            : 0;
          return (
            <Card key={category} className="cursor-pointer hover:shadow-md" onClick={() => setFilter(filter === category ? 'all' : category)}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${categoryColors[category]}`}></div>
                  <CardTitle className="text-sm font-medium">{category}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">Avg Progress: {avgProgress}%</div>
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
            All Objectives
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={filter === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(category)}
            >
              {category}
            </Button>
          ))}
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
          {filteredObjectives.map((obj) => {
            const colors = getStatusColor(obj.status);
            return (
              <Card key={obj.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${categoryColors[obj.category]}`}></div>
                      <Badge className={`${colors.bg} ${colors.text}`}>{obj.status}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Progress</div>
                      <div className="text-lg font-bold">{obj.progress}%</div>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{obj.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{obj.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${obj.progress}%` }}></div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Period:</span>
                      <span className="font-medium">{obj.startYear} - {obj.endYear}</span>
                    </div>
                    {obj.owner && (
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Owner:</span>
                        <span className="font-medium">{obj.owner.name}</span>
                      </div>
                    )}
                    {obj.yearlyObjectives?.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Link2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Linked Objectives:</span>
                        <span className="font-medium">{obj.yearlyObjectives.length}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t flex gap-2">
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => openDetails(obj)}>
                      View Details
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(obj)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openDelete(obj)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
                    <th className="text-left p-4 font-medium">Title</th>
                    <th className="text-left p-4 font-medium">Category</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Progress</th>
                    <th className="text-left p-4 font-medium">Period</th>
                    <th className="text-left p-4 font-medium">Owner</th>
                    <th className="text-left p-4 font-medium">Linked</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredObjectives.map((obj) => {
                    const colors = getStatusColor(obj.status);
                    return (
                      <tr key={obj.id} className="border-t hover:bg-muted/30">
                        <td className="p-4">
                          <div className="font-medium">{obj.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{obj.description}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${categoryColors[obj.category]}`}></div>
                            <span className="text-sm">{obj.category}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={`${colors.bg} ${colors.text}`}>{obj.status}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${obj.progress}%` }}></div>
                            </div>
                            <span className="text-sm">{obj.progress}%</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm">{obj.startYear} - {obj.endYear}</td>
                        <td className="p-4 text-sm">{obj.owner?.name || '-'}</td>
                        <td className="p-4 text-sm">{obj.yearlyObjectives?.length || 0}</td>
                        <td className="p-4 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => openDetails(obj)}>View</Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(obj)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => openDelete(obj)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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

      {filteredObjectives.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No strategic objectives found</p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Strategic Objective
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedObjective ? 'Edit Strategic Objective' : 'Create Strategic Objective'}</DialogTitle>
            <DialogDescription>
              Define a mid-term (5-7 year) strategic goal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Become market leader in steel fabrication"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the strategic objective..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category || "none"}
                  onValueChange={(value) => setFormData({ ...formData, category: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select category...</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startYear">Start Year *</Label>
                <Select
                  value={formData.startYear.toString()}
                  onValueChange={(value) => setFormData({ ...formData, startYear: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endYear">End Year *</Label>
                <Select
                  value={formData.endYear.toString()}
                  onValueChange={(value) => setFormData({ ...formData, endYear: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner">Owner *</Label>
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
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetOutcome">Target Outcome</Label>
              <Textarea
                id="targetOutcome"
                value={formData.targetOutcome}
                onChange={(e) => setFormData({ ...formData, targetOutcome: e.target.value })}
                placeholder="What does success look like?"
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : selectedObjective ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedObjective?.title}</DialogTitle>
            <DialogDescription>Strategic Objective Details</DialogDescription>
          </DialogHeader>
          {selectedObjective && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${categoryColors[selectedObjective.category]}`}></div>
                <span className="text-sm">{selectedObjective.category}</span>
                <Badge className={`${getStatusColor(selectedObjective.status).bg} ${getStatusColor(selectedObjective.status).text}`}>
                  {selectedObjective.status}
                </Badge>
              </div>
              
              {selectedObjective.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground">{selectedObjective.description}</p>
                </div>
              )}

              {selectedObjective.targetOutcome && (
                <div>
                  <h4 className="font-medium mb-2">Target Outcome</h4>
                  <p className="text-muted-foreground">{selectedObjective.targetOutcome}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1 text-sm text-muted-foreground">Period</h4>
                  <p>{selectedObjective.startYear} - {selectedObjective.endYear}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-sm text-muted-foreground">Owner</h4>
                  <p>{selectedObjective.owner?.name || '-'}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-sm text-muted-foreground">Priority</h4>
                  <p>{selectedObjective.priority}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-sm text-muted-foreground">Progress</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${selectedObjective.progress}%` }}></div>
                    </div>
                    <span>{selectedObjective.progress}%</span>
                  </div>
                </div>
              </div>

              {selectedObjective.yearlyObjectives?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Linked Yearly Objectives</h4>
                  <div className="space-y-2">
                    {selectedObjective.yearlyObjectives.map((yo: any) => (
                      <div key={yo.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div>
                          <span className="font-medium">{yo.year}:</span> {yo.title}
                        </div>
                        <Badge variant="outline">{yo.progress}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
            <Button onClick={() => { setDetailsOpen(false); openEdit(selectedObjective); }}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Strategic Objective</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedObjective?.title}"? This action cannot be undone.
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
