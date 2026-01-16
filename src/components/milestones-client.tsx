'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, User } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Milestone {
  id: string;
  name: string;
  description?: string | null;
  plannedDate?: string | null;
  actualDate?: string | null;
  progress: number;
  status: string;
  responsibleId?: string | null;
  responsible?: User | null;
  createdAt: string;
  updatedAt: string;
}

interface Initiative {
  id: string;
  initiativeNumber: string;
  name: string;
  milestones: Milestone[];
}

interface MilestonesClientProps {
  initiative: Initiative;
  session: {
    sub: string;
    name: string;
    role: string;
    departmentId?: string | null;
  };
}

export default function MilestonesClient({ initiative, session }: MilestonesClientProps) {
  const router = useRouter();
  const [milestones, setMilestones] = useState<Milestone[]>(initiative.milestones || []);
  const [users, setUsers] = useState<User[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canEdit = ['CEO', 'Admin', 'Manager'].includes(session.role);
  const canDelete = ['CEO', 'Admin'].includes(session.role);

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      plannedDate: formData.get('plannedDate') as string || null,
      actualDate: formData.get('actualDate') as string || null,
      progress: parseFloat(formData.get('progress') as string) || 0,
      status: formData.get('status') as string,
      responsibleId: formData.get('responsibleId') as string || null,
    };

    try {
      const response = await fetch(`/api/initiatives/${initiative.id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create milestone');
      }

      const newMilestone = await response.json();
      setMilestones([...milestones, newMilestone]);
      setIsCreateOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMilestone) return;

    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      plannedDate: formData.get('plannedDate') as string || null,
      actualDate: formData.get('actualDate') as string || null,
      progress: parseFloat(formData.get('progress') as string) || 0,
      status: formData.get('status') as string,
      responsibleId: formData.get('responsibleId') as string || null,
    };

    try {
      const response = await fetch(
        `/api/initiatives/${initiative.id}/milestones/${selectedMilestone.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update milestone');
      }

      const updatedMilestone = await response.json();
      setMilestones(milestones.map(m => m.id === updatedMilestone.id ? updatedMilestone : m));
      setIsEditOpen(false);
      setSelectedMilestone(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;

    try {
      const response = await fetch(
        `/api/initiatives/${initiative.id}/milestones/${milestoneId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete milestone');
      }

      setMilestones(milestones.filter(m => m.id !== milestoneId));
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Delayed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/initiatives/${initiative.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Initiative
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Milestones</h1>
            <p className="text-sm text-gray-600">
              {initiative.initiativeNumber} - {initiative.name}
            </p>
          </div>
        </div>

        {canEdit && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Milestone</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Milestone Name *</Label>
                  <Input id="name" name="name" required disabled={loading} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={3} disabled={loading} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="Pending" disabled={loading}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Delayed">Delayed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="progress">Progress (%)</Label>
                    <Input
                      id="progress"
                      name="progress"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue="0"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plannedDate">Planned Date</Label>
                    <Input id="plannedDate" name="plannedDate" type="date" disabled={loading} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actualDate">Actual Date</Label>
                    <Input id="actualDate" name="actualDate" type="date" disabled={loading} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsibleId">Responsible Person</Label>
                  <Select name="responsibleId" disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select person" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Milestone'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Milestones List */}
      <div className="space-y-4">
        {milestones.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">No milestones yet.</p>
              {canEdit && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Milestone
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          milestones.map((milestone) => (
            <Card key={milestone.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{milestone.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(milestone.status)}`}>
                        {milestone.status}
                      </span>
                    </div>

                    {milestone.description && (
                      <p className="text-sm text-gray-600 mb-4">{milestone.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Planned</p>
                          <p className="font-medium">{formatDate(milestone.plannedDate)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Actual</p>
                          <p className="font-medium">{formatDate(milestone.actualDate)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Responsible</p>
                          <p className="font-medium">
                            {milestone.responsible?.name || 'Not assigned'}
                          </p>
                        </div>
                      </div>

                      <div className="text-sm">
                        <p className="text-xs text-gray-500 mb-1">Progress</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${milestone.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{milestone.progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {(canEdit || canDelete) && (
                    <div className="flex gap-2 ml-4">
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMilestone(milestone);
                            setIsEditOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(milestone.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      {selectedMilestone && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Milestone</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-name">Milestone Name *</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={selectedMilestone.name}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={selectedMilestone.description || ''}
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select name="status" defaultValue={selectedMilestone.status} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Delayed">Delayed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-progress">Progress (%)</Label>
                  <Input
                    id="edit-progress"
                    name="progress"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={selectedMilestone.progress}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-plannedDate">Planned Date</Label>
                  <Input
                    id="edit-plannedDate"
                    name="plannedDate"
                    type="date"
                    defaultValue={
                      selectedMilestone.plannedDate
                        ? new Date(selectedMilestone.plannedDate).toISOString().split('T')[0]
                        : ''
                    }
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-actualDate">Actual Date</Label>
                  <Input
                    id="edit-actualDate"
                    name="actualDate"
                    type="date"
                    defaultValue={
                      selectedMilestone.actualDate
                        ? new Date(selectedMilestone.actualDate).toISOString().split('T')[0]
                        : ''
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-responsibleId">Responsible Person</Label>
                <Select
                  name="responsibleId"
                  defaultValue={selectedMilestone.responsibleId || ''}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditOpen(false);
                    setSelectedMilestone(null);
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
