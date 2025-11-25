'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Target } from 'lucide-react';

type User = {
  id: string;
  name: string;
  email: string;
  position: string | null;
};

type Department = {
  id: string;
  name: string;
};

type Initiative = {
  id: string;
  initiativeNumber: string;
  name: string;
  category: string | null;
  description: string | null;
  objective: string | null;
  ownerId: string;
  departmentId: string | null;
  status: string;
  priority: string;
  startDate: string | null;
  endDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  budget: number | null;
  notes: string | null;
};

type InitiativeFormProps = {
  mode: 'create' | 'edit';
  allUsers: User[];
  allDepartments: Department[];
  currentUserId: string;
  initiative?: Initiative;
};

const categories = [
  'Digital Transformation',
  'Lean Management',
  'AI & Automation',
  'Human Capital Development',
  'Knowledge & Learning',
  'Factory Optimization',
  'Sustainability & Green Building',
  'Operational Excellence',
];

const priorities = ['Low', 'Medium', 'High', 'Critical'];
const statuses = ['Planned', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];

export function InitiativeForm({ 
  mode, 
  allUsers, 
  allDepartments, 
  currentUserId,
  initiative 
}: InitiativeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initiative?.name || '',
    category: initiative?.category || '',
    description: initiative?.description || '',
    objective: initiative?.objective || '',
    ownerId: initiative?.ownerId || currentUserId,
    departmentId: initiative?.departmentId || '',
    status: initiative?.status || 'Planned',
    priority: initiative?.priority || 'Medium',
    startDate: initiative?.startDate ? initiative.startDate.split('T')[0] : '',
    endDate: initiative?.endDate ? initiative.endDate.split('T')[0] : '',
    actualStartDate: initiative?.actualStartDate ? initiative.actualStartDate.split('T')[0] : '',
    actualEndDate: initiative?.actualEndDate ? initiative.actualEndDate.split('T')[0] : '',
    budget: initiative?.budget?.toString() || '',
    notes: initiative?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter an initiative name');
      return;
    }

    if (!formData.ownerId) {
      alert('Please select an owner');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        name: formData.name,
        category: formData.category || null,
        description: formData.description || null,
        objective: formData.objective || null,
        ownerId: formData.ownerId,
        departmentId: formData.departmentId || null,
        status: formData.status,
        priority: formData.priority,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        actualStartDate: formData.actualStartDate || null,
        actualEndDate: formData.actualEndDate || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        notes: formData.notes || null,
      };

      const url = mode === 'create' 
        ? '/api/initiatives' 
        : `/api/initiatives/${initiative?.id}`;
      
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save initiative');
      }

      const savedInitiative = await response.json();
      router.push(`/initiatives/${savedInitiative.id}`);
      router.refresh();
    } catch (error: any) {
      alert(error.message || 'Failed to save initiative');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/initiatives">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            {mode === 'create' ? 'Create Initiative' : 'Edit Initiative'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {mode === 'create' 
              ? 'Define a new strategic initiative' 
              : `Editing: ${initiative?.initiativeNumber}`}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Initiative Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Digital Transformation 2025"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select category...</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the initiative..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Objective</Label>
                <Textarea
                  id="objective"
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  placeholder="Main goal and expected outcomes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ownerId">Owner *</Label>
                  <select
                    id="ownerId"
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select owner...</option>
                    {allUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} {user.position ? `(${user.position})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departmentId">Department</Label>
                  <select
                    id="departmentId"
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select department...</option>
                    {allDepartments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status & Priority */}
          <Card>
            <CardHeader>
              <CardTitle>Status & Priority</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Planned Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Planned End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actualStartDate">Actual Start Date</Label>
                  <Input
                    id="actualStartDate"
                    type="date"
                    value={formData.actualStartDate}
                    onChange={(e) => setFormData({ ...formData, actualStartDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actualEndDate">Actual End Date</Label>
                  <Input
                    id="actualEndDate"
                    type="date"
                    value={formData.actualEndDate}
                    onChange={(e) => setFormData({ ...formData, actualEndDate: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget & Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Budget & Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (USD)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes or comments..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" asChild disabled={loading}>
              <Link href="/initiatives">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  {mode === 'create' ? 'Create Initiative' : 'Save Changes'}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
