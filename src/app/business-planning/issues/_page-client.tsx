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
import { AlertTriangle, Plus, User, Calendar, Table, LayoutGrid, Edit, Trash2, X, ChevronUp, ChevronDown, ChevronsUpDown, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export default function WeeklyIssuesPage() {
  const { toast } = useToast();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'issueNumber', dir: 'desc' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Preview dialog
  const [previewIssue, setPreviewIssue] = useState<any>(null);

  // Drag and drop
  const [draggedIssue, setDraggedIssue] = useState<any>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

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
      logger.error({ error }, 'Error fetching issues');
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users?forAssignment=true');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error({ error }, 'Error fetching users');
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error({ error }, 'Error fetching departments');
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setCurrentUser(data.user);
    } catch (error) {
      logger.error({ error }, 'Error fetching current user');
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
          toast({ title: 'Success', description: 'Issue updated successfully' });
          setDialogOpen(false);
          setEditingIssue(null);
          resetForm();
          fetchIssues();
        } else {
          throw new Error('Failed to update issue');
        }
      } else {
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
          toast({ title: 'Success', description: 'Issue created successfully' });
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
        toast({ title: 'Success', description: 'Issue deleted successfully' });
        fetchIssues();
      } else {
        throw new Error('Failed to delete issue');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete issue', variant: 'destructive' });
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingIssue(null);
      resetForm();
    }
  };

  // Update issue status (used by drag & drop)
  const handleStatusChange = async (issueId: string, newStatus: string) => {
    const issue = issues.find((i) => i.id === issueId);
    if (!issue || issue.status === newStatus) return;

    // Optimistic update
    setIssues((prev) => prev.map((i) => i.id === issueId ? { ...i, status: newStatus } : i));

    try {
      const res = await fetch(`/api/business-planning/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast({ title: 'Updated', description: `Issue moved to ${newStatus}` });
    } catch (error) {
      // Revert on failure
      setIssues((prev) => prev.map((i) => i.id === issueId ? { ...i, status: issue.status } : i));
      toast({ title: 'Error', description: 'Failed to move issue', variant: 'destructive' });
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, issue: any) => {
    setDraggedIssue(issue);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedIssue(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column container (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedIssue && draggedIssue.status !== targetStatus) {
      handleStatusChange(draggedIssue.id, targetStatus);
    }
    setDraggedIssue(null);
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

  const handleSort = (key: string) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const STATUS_ORDER: Record<string, number> = { Open: 0, 'In Progress': 1, Resolved: 2, Closed: 3 };

  const sortedIssues = [...filteredIssues].sort((a, b) => {
    const mul = sort.dir === 'asc' ? 1 : -1;
    switch (sort.key) {
      case 'issueNumber': return mul * (a.issueNumber - b.issueNumber);
      case 'title':       return mul * a.title.localeCompare(b.title);
      case 'priority':    return mul * ((PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
      case 'status':      return mul * ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
      case 'assignedTo':  return mul * (a.assignedTo?.name ?? '').localeCompare(b.assignedTo?.name ?? '');
      case 'raisedBy':    return mul * (a.raisedBy?.name ?? '').localeCompare(b.raisedBy?.name ?? '');
      case 'department':  return mul * (a.department?.name ?? '').localeCompare(b.department?.name ?? '');
      case 'dueDate':     return mul * (new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime());
      case 'meetingDate': return mul * (new Date(a.meetingDate ?? 0).getTime() - new Date(b.meetingDate ?? 0).getTime());
      default: return 0;
    }
  });

  const SortIcon = ({ col }: { col: string }) => {
    if (sort.key !== col) return <ChevronsUpDown className="size-3 opacity-40 inline ml-1" />;
    return sort.dir === 'asc'
      ? <ChevronUp className="size-3 inline ml-1" />
      : <ChevronDown className="size-3 inline ml-1" />;
  };

  const SortTh = ({ col, label, className = '' }: { col: string; label: string; className?: string }) => (
    <th
      onClick={() => handleSort(col)}
      className={`text-left p-3 font-medium cursor-pointer select-none hover:bg-muted/80 transition-colors whitespace-nowrap ${className}`}
    >
      {label}<SortIcon col={col} />
    </th>
  );

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
              <div className="space-y-2">
                <Label htmlFor="title">Issue Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief description of the issue"
                />
              </div>

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
                    <SortTh col="issueNumber"  label="#" />
                    <SortTh col="title"        label="Title" />
                    <SortTh col="priority"     label="Priority" />
                    <SortTh col="status"       label="Status" />
                    <SortTh col="raisedBy"     label="Raised By" />
                    <SortTh col="assignedTo"   label="Assigned To" />
                    <SortTh col="department"   label="Department" />
                    <SortTh col="dueDate"      label="Due Date" />
                    <SortTh col="meetingDate"  label="Meeting Date" />
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedIssues.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center p-8 text-muted-foreground">
                        No issues found
                      </td>
                    </tr>
                  ) : (
                    sortedIssues.map((issue) => (
                      <tr
                        key={issue.id}
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => setPreviewIssue(issue)}
                      >
                        <td className="p-3">
                          <span className="font-mono text-sm font-semibold">#{issue.issueNumber}</span>
                        </td>
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
                          {issue.raisedBy?.name || '-'}
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
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
            const isOver = dragOverColumn === status;
            return (
              <div
                key={status}
                className="space-y-2"
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className={`font-medium text-sm flex items-center justify-between p-2 rounded transition-colors ${
                  isOver ? 'bg-primary/10 border border-primary/30' : 'bg-muted'
                }`}>
                  <span>{status}</span>
                  <Badge variant="secondary">{statusIssues.length}</Badge>
                </div>
                <div className={`space-y-2 min-h-[80px] rounded-lg transition-colors p-1 ${
                  isOver ? 'bg-primary/5' : ''
                }`}>
                  {statusIssues.map((issue) => (
                    <Card
                      key={issue.id}
                      className={`hover:shadow-md transition-all cursor-pointer select-none ${
                        draggedIssue?.id === issue.id ? 'opacity-40 scale-95' : ''
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, issue)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setPreviewIssue(issue)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-muted-foreground">#{issue.issueNumber}</span>
                            <Badge className={getPriorityColor(issue.priority)} variant="outline">
                              {issue.priority}
                            </Badge>
                          </div>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
                  {isOver && draggedIssue?.status !== status && (
                    <div className="border-2 border-dashed border-primary/40 rounded-lg h-16 flex items-center justify-center text-xs text-primary/60">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Issue Preview Dialog */}
      <Dialog open={!!previewIssue} onOpenChange={(open) => !open && setPreviewIssue(null)}>
        <DialogContent className="max-w-lg">
          {previewIssue && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm text-muted-foreground">#{previewIssue.issueNumber}</span>
                  <Badge className={getPriorityColor(previewIssue.priority)} variant="outline">
                    {previewIssue.priority}
                  </Badge>
                  <Badge className={getStatusColor(previewIssue.status)}>
                    {previewIssue.status}
                  </Badge>
                </div>
                <DialogTitle className="text-lg leading-tight">{previewIssue.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {previewIssue.description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm whitespace-pre-wrap">{previewIssue.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Raised By</p>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{previewIssue.raisedBy?.name || '-'}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Assigned To</p>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{previewIssue.assignedTo?.name || 'Unassigned'}</span>
                    </div>
                  </div>
                  {previewIssue.department && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Department</p>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{previewIssue.department.name}</span>
                      </div>
                    </div>
                  )}
                  {previewIssue.dueDate && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Due Date</p>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{new Date(previewIssue.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                  {previewIssue.meetingDate && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Meeting Date</p>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{new Date(previewIssue.meetingDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewIssue(null);
                    handleEdit(previewIssue);
                  }}
                >
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPreviewIssue(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
