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
import { AlertTriangle, Plus, User, Calendar, Table, LayoutGrid, Edit, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function WeeklyIssuesPage() {
  const { toast } = useToast();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    departmentId: '',
    assignedToId: '',
    priority: 'Medium',
    status: 'Open',
    dueDate: '',
    meetingDate: '',
  });

  useEffect(() => {
    fetchIssues();
    fetchUsers();
    fetchDepartments();
    fetchCurrentUser();
  }, []);

  const fetchIssues = async () => {
    try {
      const res = await fetch('/api/business-planning/issues');
      const data = await res.json();
      setIssues(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching issues:', error);
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

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setCurrentUser(data.user);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast({
        title: 'Error',
        description: 'Please enter an issue title',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingIssue) {
        // Update existing issue
        const res = await fetch(`/api/business-planning/issues/${editingIssue.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            departmentId: formData.departmentId || null,
            assignedToId: formData.assignedToId || null,
            dueDate: formData.dueDate || null,
            meetingDate: formData.meetingDate || null,
          }),
        });

        if (res.ok) {
          toast({
            title: 'Success',
            description: 'Issue updated successfully',
          });
          setDialogOpen(false);
          setEditingIssue(null);
          resetForm();
          fetchIssues();
        } else {
          throw new Error('Failed to update issue');
        }
      } else {
        // Create new issue
        const raisedBy = currentUser?.id || (users.length > 0 ? users[0].id : null);
        
        if (!raisedBy) {
          toast({
            title: 'Error',
            description: 'No users available in the system',
            variant: 'destructive',
          });
          return;
        }

        const res = await fetch('/api/business-planning/issues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            raisedById: raisedBy,
            departmentId: formData.departmentId || null,
            assignedToId: formData.assignedToId || null,
            dueDate: formData.dueDate || null,
            meetingDate: formData.meetingDate || null,
          }),
        });

        if (res.ok) {
          toast({
            title: 'Success',
            description: 'Issue created successfully',
          });
          setDialogOpen(false);
          resetForm();
          fetchIssues();
        } else {
          throw new Error('Failed to create issue');
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: editingIssue ? 'Failed to update issue' : 'Failed to create issue',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      departmentId: '',
      assignedToId: '',
      priority: 'Medium',
      status: 'Open',
      dueDate: '',
      meetingDate: '',
    });
  };

  const handleEdit = (issue: any) => {
    setEditingIssue(issue);
    setFormData({
      title: issue.title,
      description: issue.description || '',
      departmentId: issue.departmentId || '',
      assignedToId: issue.assignedToId || '',
      priority: issue.priority,
      status: issue.status,
      dueDate: issue.dueDate ? new Date(issue.dueDate).toISOString().split('T')[0] : '',
      meetingDate: issue.meetingDate ? new Date(issue.meetingDate).toISOString().split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this issue?')) return;

    try {
      const res = await fetch(`/api/business-planning/issues/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Issue deleted successfully',
        });
        fetchIssues();
      } else {
        throw new Error('Failed to delete issue');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete issue',
        variant: 'destructive',
      });
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingIssue(null);
      resetForm();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Open': return 'bg-yellow-100 text-yellow-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
  const priorities = ['Critical', 'High', 'Medium', 'Low'];

  const filteredIssues = filter === 'all' 
    ? issues 
    : issues.filter(issue => issue.status === filter);

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
            <AlertTriangle className="h-8 w-8" />
            Weekly Issues
          </h1>
          <p className="text-muted-foreground mt-2">
            EOS-style issue tracking for rapid problem resolution
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Issue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingIssue ? 'Edit Issue' : 'Create New Issue'}</DialogTitle>
              <DialogDescription>
                {editingIssue ? 'Update the issue details below' : 'Log a new issue for tracking and resolution'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Issue Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief description of the issue"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of the issue..."
                  rows={3}
                />
              </div>

              {/* Priority & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
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
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Department & Assigned To */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department (Optional)</Label>
                  <Select
                    value={formData.departmentId || "none"}
                    onValueChange={(value) => setFormData({ ...formData, departmentId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Assign To (Optional)</Label>
                  <Select
                    value={formData.assignedToId || "none"}
                    onValueChange={(value) => setFormData({ ...formData, assignedToId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Due Date & Meeting Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date (Optional)</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetingDate">Meeting Date (Optional)</Label>
                  <Input
                    id="meetingDate"
                    type="date"
                    value={formData.meetingDate}
                    onChange={(e) => setFormData({ ...formData, meetingDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? (editingIssue ? 'Updating...' : 'Creating...') : (editingIssue ? 'Update Issue' : 'Create Issue')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statuses.map((status) => {
          const count = issues.filter(i => i.status === status).length;
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

      {/* Priority Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {priorities.map((priority) => {
              const count = issues.filter(i => i.priority === priority).length;
              return (
                <div key={priority} className="text-center">
                  <Badge className={getPriorityColor(priority)}>
                    {priority}
                  </Badge>
                  <div className="text-2xl font-bold mt-2">{count}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* View Mode Toggle & Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Kanban
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <Table className="h-4 w-4 mr-2" />
            Table
          </Button>
        </div>
        <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All Issues
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
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">Title</th>
                    <th className="text-left p-3 font-medium">Priority</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Assigned To</th>
                    <th className="text-left p-3 font-medium">Department</th>
                    <th className="text-left p-3 font-medium">Due Date</th>
                    <th className="text-left p-3 font-medium">Meeting Date</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-8 text-muted-foreground">
                        No issues found
                      </td>
                    </tr>
                  ) : (
                    filteredIssues.map((issue) => (
                      <tr key={issue.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{issue.title}</div>
                            {issue.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {issue.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={getPriorityColor(issue.priority)} variant="outline">
                            {issue.priority}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={getStatusColor(issue.status)}>
                            {issue.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">
                          {issue.assignedTo?.name || 'Unassigned'}
                        </td>
                        <td className="p-3 text-sm">
                          {issue.department?.name || '-'}
                        </td>
                        <td className="p-3 text-sm">
                          {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-3 text-sm">
                          {issue.meetingDate ? new Date(issue.meetingDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(issue)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(issue.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statuses.map((status) => {
          const statusIssues = issues.filter(i => i.status === status);
          return (
            <div key={status} className="space-y-2">
              <div className="font-medium text-sm flex items-center justify-between bg-muted p-2 rounded">
                <span>{status}</span>
                <Badge variant="secondary">{statusIssues.length}</Badge>
              </div>
              <div className="space-y-2">
                {statusIssues.map((issue) => (
                  <Card key={issue.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <Badge className={getPriorityColor(issue.priority)} variant="outline">
                          {issue.priority}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleEdit(issue)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDelete(issue.id)}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-sm mt-2">{issue.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {issue.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{issue.assignedTo?.name || 'Unassigned'}</span>
                      </div>
                      {issue.dueDate && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(issue.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {issue.meetingDate && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Meeting: {new Date(issue.meetingDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Empty State */}
      {issues.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Issues Found</p>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Weekly issues help you track and resolve problems quickly. Create your first issue to get started.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create First Issue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">About Weekly Issues</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>Weekly Issues</strong> is inspired by the EOS (Entrepreneurial Operating System) methodology for rapid problem-solving.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Identify issues as they arise</li>
            <li>Discuss in weekly meetings</li>
            <li>Assign ownership and due dates</li>
            <li>Track progress until resolution</li>
            <li>Close when fully resolved</li>
          </ul>
          <p className="pt-2">
            This keeps your team focused on solving real problems rather than letting them linger.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
