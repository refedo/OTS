'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSessionValidator } from '@/hooks/use-session-validator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showConfirmation } from '@/components/ui/confirmation-dialog';
import { ArrowLeft, Plus, Calendar, CheckCircle, AlertCircle, Target, Layers, Paperclip, FileText, Download, User, ImageIcon, Upload, Check, RotateCcw, Trash2, ClipboardList, Github, ExternalLink, RefreshCw, Unlink } from 'lucide-react';

interface ActivityLog {
  id: string;
  action: string;
  performedAt: string;
  performedBy: { id: string; name: string };
  metadata: {
    event?: string;
    taskTitle?: string;
    taskId?: string;
    newStatus?: string;
  } | null;
}

interface BacklogItem {
  id: string;
  code: string;
  title: string;
  description: string;
  type: string;
  category: string;
  businessReason: string;
  expectedValue: string | null;
  priority: string;
  status: string;
  affectedModules: string[];
  riskLevel: string;
  complianceFlag: boolean;
  linkedObjectiveId: string | null;
  linkedKpiId: string | null;
  createdAt: string;
  approvedAt: string | null;
  reviewedAt: string | null;
  plannedAt: string | null;
  completedAt: string | null;
  createdBy:   { id: string; name: string };
  approvedBy:  { id: string; name: string } | null;
  reviewedBy:  { id: string; name: string } | null;
  plannedBy:   { id: string; name: string } | null;
  completedBy: { id: string; name: string } | null;
  attachments: Array<{
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
  }> | null;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    description: string | null;
    assignedTo: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  activityLogs: ActivityLog[];
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
  githubRepo: string | null;
  githubSyncedAt: string | null;
}

export default function BacklogItemDetail() {
  const { isValidating } = useSessionValidator();
  const router = useRouter();
  const params = useParams();
  const [item, setItem] = useState<BacklogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskActionLoading, setTaskActionLoading] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [githubSyncing, setGithubSyncing] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchBacklogItem();
    }
  }, [params.id]);

  const fetchBacklogItem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/backlog/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setItem(data);
      } else {
        router.push('/backlog');
      }
    } catch {
      router.push('/backlog');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!item) return;

    try {
      const response = await fetch(`/api/backlog/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        showConfirmation({
          type: 'success',
          title: 'Status Updated',
          message: 'Backlog item status updated successfully!',
        });
        fetchBacklogItem();
      } else {
        const error = await response.json();
        showConfirmation({
          type: 'error',
          title: 'Update Failed',
          message: error.error || 'Failed to update status',
        });
      }
    } catch {
      showConfirmation({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update status',
      });
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!item) return;

    try {
      const response = await fetch(`/api/backlog/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (response.ok) {
        showConfirmation({
          type: 'success',
          title: 'Priority Updated',
          message: 'Backlog item priority updated successfully!',
        });
        fetchBacklogItem();
      } else {
        const error = await response.json();
        showConfirmation({
          type: 'error',
          title: 'Update Failed',
          message: error.error || 'Failed to update priority',
        });
      }
    } catch {
      showConfirmation({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update priority',
      });
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setCreatingTask(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskFormData.title,
          description: taskFormData.description,
          priority: taskFormData.priority,
          backlogItemId: item.id,
        }),
      });

      if (response.ok) {
        showConfirmation({
          type: 'success',
          title: 'Task Created',
          message: 'Task created and linked to backlog item successfully!',
        });
        setShowTaskForm(false);
        setTaskFormData({ title: '', description: '', priority: 'MEDIUM' });
        fetchBacklogItem();
      } else {
        const error = await response.json();
        showConfirmation({
          type: 'error',
          title: 'Creation Failed',
          message: error.error || 'Failed to create task',
        });
      }
    } catch {
      showConfirmation({
        type: 'error',
        title: 'Creation Failed',
        message: 'Failed to create task',
      });
    } finally {
      setCreatingTask(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: 'Pending' | 'In Progress' | 'Completed') => {
    if (!item) return;
    setTaskActionLoading(taskId);
    try {
      const response = await fetch(`/api/backlog/${item.id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        fetchBacklogItem();
      } else {
        const error = await response.json();
        showConfirmation({ type: 'error', title: 'Update Failed', message: error.error || 'Failed to update task' });
      }
    } catch {
      showConfirmation({ type: 'error', title: 'Update Failed', message: 'Failed to update task' });
    } finally {
      setTaskActionLoading(null);
    }
  };

  const handleTaskDelete = async (taskId: string, taskTitle: string) => {
    if (!item) return;
    const confirmed = await showConfirmation({
      type: 'warning',
      title: 'Delete Task',
      message: `Are you sure you want to delete "${taskTitle}"? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;

    setTaskActionLoading(taskId);
    try {
      const response = await fetch(`/api/backlog/${item.id}/tasks/${taskId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchBacklogItem();
      } else {
        const error = await response.json();
        showConfirmation({ type: 'error', title: 'Delete Failed', message: error.error || 'Failed to delete task' });
      }
    } catch {
      showConfirmation({ type: 'error', title: 'Delete Failed', message: 'Failed to delete task' });
    } finally {
      setTaskActionLoading(null);
    }
  };

  const handleGitHubSync = async () => {
    if (!item) return;
    setGithubSyncing(true);
    try {
      const response = await fetch(`/api/backlog/${item.id}/github`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        showConfirmation({
          type: 'success',
          title: item.githubIssueNumber ? 'GitHub Issue Updated' : 'GitHub Issue Created',
          message: item.githubIssueNumber
            ? `Issue #${item.githubIssueNumber} has been updated on GitHub.`
            : `Issue #${data.githubIssueNumber} has been created on GitHub.`,
        });
        fetchBacklogItem();
      } else {
        showConfirmation({ type: 'error', title: 'Sync Failed', message: data.error || 'Failed to sync to GitHub' });
      }
    } catch {
      showConfirmation({ type: 'error', title: 'Sync Failed', message: 'Failed to sync to GitHub' });
    } finally {
      setGithubSyncing(false);
    }
  };

  const handleGitHubUnlink = async () => {
    if (!item) return;
    const confirmed = await showConfirmation({
      type: 'warning',
      title: 'Remove GitHub Link',
      message: `This will unlink OTS from GitHub issue #${item.githubIssueNumber}. The issue on GitHub will not be deleted. Continue?`,
      confirmLabel: 'Unlink',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/backlog/${item.id}/github`, { method: 'DELETE' });
      if (response.ok) {
        showConfirmation({ type: 'success', title: 'Unlinked', message: 'GitHub link removed.' });
        fetchBacklogItem();
      } else {
        const data = await response.json();
        showConfirmation({ type: 'error', title: 'Unlink Failed', message: data.error || 'Failed to unlink' });
      }
    } catch {
      showConfirmation({ type: 'error', title: 'Unlink Failed', message: 'Failed to unlink from GitHub' });
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!item || !e.target.files || e.target.files.length === 0) return;
    setUploadingAttachment(true);
    const newAttachments = [...(item.attachments ?? [])];
    try {
      for (const file of Array.from(e.target.files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          newAttachments.push({
            fileName: data.originalName,
            filePath: data.filePath,
            fileType: data.fileType,
            fileSize: data.fileSize,
            uploadedAt: new Date().toISOString(),
          });
        } else {
          const err = await res.json();
          showConfirmation({ type: 'error', title: 'Upload Failed', message: err.error || `Failed to upload ${file.name}` });
        }
      }
      const patch = await fetch(`/api/backlog/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachments: newAttachments }),
      });
      if (patch.ok) {
        fetchBacklogItem();
      }
    } finally {
      setUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  if (isValidating || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading backlog item...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!item) {
    return null;
  }

  const isApproved = ['APPROVED', 'PLANNED', 'IN_PROGRESS', 'COMPLETED'].includes(item.status);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CORE_SYSTEM': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'PRODUCTION': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'DESIGN': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'DETAILING': return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'PROCUREMENT': return 'bg-green-100 text-green-800 border-green-300';
      case 'QC': return 'bg-red-100 text-red-800 border-red-300';
      case 'LOGISTICS': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'FINANCE': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'REPORTING': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'AI': return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'GOVERNANCE': return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'PROJECTS':   return 'bg-teal-100 text-teal-800 border-teal-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'FEATURE': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'BUG': return 'bg-red-100 text-red-800 border-red-300';
      case 'TECH_DEBT': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'PERFORMANCE': return 'bg-green-100 text-green-800 border-green-300';
      case 'REPORTING': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'REFACTOR': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'COMPLIANCE': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'INSIGHT': return 'bg-pink-100 text-pink-800 border-pink-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IDEA': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'UNDER_REVIEW': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-300';
      case 'PLANNED': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'IN_PROGRESS': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'BLOCKED': return 'bg-red-100 text-red-800 border-red-300';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DROPPED': return 'bg-slate-100 text-slate-500 border-slate-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'In Progress': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const completedTasks = item.tasks.filter(t => t.status === 'Completed').length;
  const progressPct = item.tasks.length > 0 ? (completedTasks / item.tasks.length) * 100 : 0;

  // Build merged activity trail: status milestones + task audit events
  const taskEventLabels: Record<string, string> = {
    task_created: 'Task Added',
    task_completed: 'Task Completed',
    task_reopened: 'Task Reopened',
    task_updated: 'Task Updated',
    task_deleted: 'Task Removed',
  };

  const taskAuditEntries = (item.activityLogs ?? [])
    .filter(log => log.metadata?.event && taskEventLabels[log.metadata.event])
    .map(log => ({
      key: log.id,
      type: 'task' as const,
      label: taskEventLabels[log.metadata!.event!],
      sub: `${log.metadata?.taskTitle} — by ${log.performedBy.name}`,
      date: log.performedAt,
      event: log.metadata?.event,
    }));

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
        {/* Header */}
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/backlog')}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            Back to Backlog
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold tracking-tight">{item.code}</h1>
                <Badge variant={item.priority === 'CRITICAL' ? 'destructive' : item.priority === 'HIGH' ? 'default' : 'secondary'}>
                  {item.priority}
                </Badge>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(item.status)}`}>
                  {item.status.replace('_', ' ')}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(item.type)}`}>
                  {item.type.replace('_', ' ')}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(item.category)}`}>
                  {item.category.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xl text-muted-foreground">{item.title}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* WHY Section */}
            <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="size-5" />
                  WHY This Exists
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{item.businessReason}</p>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{item.description}</p>
              </CardContent>
            </Card>

            {/* Attachments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="size-5" />
                  Attachments ({item.attachments?.length ?? 0})
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={uploadingAttachment}
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  {uploadingAttachment ? (
                    <><Upload className="size-4 animate-pulse" /> Uploading...</>
                  ) : (
                    <><Paperclip className="size-4" /> Add Files</>
                  )}
                </Button>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,.svg"
                  onChange={handleAttachmentUpload}
                />
              </CardHeader>
              <CardContent className="space-y-2">
                {!item.attachments || item.attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No attachments yet. Click &quot;Add Files&quot; to upload documents or images.</p>
                ) : (
                  item.attachments.map((file, index) => {
                    const isImage = file.fileType.startsWith('image/');
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        {isImage ? (
                          <ImageIcon className="size-4 text-blue-500 shrink-0" />
                        ) : (
                          <FileText className="size-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.fileSize < 1024 * 1024
                              ? `${(file.fileSize / 1024).toFixed(1)} KB`
                              : `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                            {' · '}
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <a href={`/api/files?path=${encodeURIComponent(file.filePath)}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="size-7 shrink-0">
                            <Download className="size-4" />
                          </Button>
                        </a>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Linked Tasks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Layers className="size-5" />
                  Linked Tasks ({item.tasks.length})
                </CardTitle>
                {isApproved && (
                  <Button
                    onClick={() => setShowTaskForm(!showTaskForm)}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="size-4" />
                    Create Task
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {showTaskForm && (
                  <form onSubmit={handleCreateTask} className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-2">
                      <Label htmlFor="taskTitle">Task Title *</Label>
                      <Input
                        id="taskTitle"
                        value={taskFormData.title}
                        onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                        placeholder="Enter task title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taskDescription">Description</Label>
                      <Textarea
                        id="taskDescription"
                        value={taskFormData.description}
                        onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                        placeholder="Enter task description"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taskPriority">Priority</Label>
                      <Select
                        value={taskFormData.priority}
                        onValueChange={(value) => setTaskFormData({ ...taskFormData, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={creatingTask}>
                        {creatingTask ? 'Creating...' : 'Create Task'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowTaskForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                {item.tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="size-12 mx-auto mb-3 opacity-50" />
                    <p>No tasks linked to this backlog item yet.</p>
                    {!isApproved && (
                      <p className="text-sm mt-2">Tasks can only be created after approval.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {item.tasks.map((task) => {
                      const isLoading = taskActionLoading === task.id;
                      const isCompleted = task.status === 'Completed';
                      return (
                        <div
                          key={task.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${isCompleted ? 'bg-emerald-50/50 border-emerald-200' : 'hover:bg-muted/50'}`}
                        >
                          {/* Status toggle button */}
                          <button
                            onClick={() => handleTaskStatusChange(task.id, isCompleted ? 'Pending' : 'Completed')}
                            disabled={isLoading}
                            className={`shrink-0 size-5 rounded-full border-2 flex items-center justify-center transition-colors ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-emerald-400'}`}
                            title={isCompleted ? 'Reopen task' : 'Mark as complete'}
                          >
                            {isCompleted && <Check className="size-3" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className={`font-medium text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </div>
                            {task.assignedTo && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Assigned to: {task.assignedTo.name}
                              </div>
                            )}
                          </div>

                          {/* Status select */}
                          <Select
                            value={task.status}
                            onValueChange={(val) => handleTaskStatusChange(task.id, val as 'Pending' | 'In Progress' | 'Completed')}
                            disabled={isLoading}
                          >
                            <SelectTrigger className={`h-7 w-32 text-xs border px-2 ${getTaskStatusColor(task.status)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Delete button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleTaskDelete(task.id, task.title)}
                            disabled={isLoading}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Trail */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="size-5" />
                  Activity Trail
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const pastStatuses = ['UNDER_REVIEW', 'APPROVED', 'PLANNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'DROPPED'];

                  type StatusStep = {
                    key: string;
                    type: 'status';
                    label: string;
                    sub: string | null;
                    date: string | null;
                    dot: string;
                    line: string;
                    active: boolean;
                  };

                  type TaskStep = {
                    key: string;
                    type: 'task';
                    label: string;
                    sub: string;
                    date: string;
                    event: string | undefined;
                    dot: string;
                    line: string;
                  };

                  type TrailStep = StatusStep | TaskStep;

                  const statusSteps: StatusStep[] = [
                    {
                      key: 'created',
                      type: 'status',
                      label: 'Submitted',
                      sub: `by ${item.createdBy.name}`,
                      date: item.createdAt,
                      dot: 'bg-slate-400',
                      line: 'bg-slate-200',
                      active: true,
                    },
                    {
                      key: 'under_review',
                      type: 'status',
                      label: 'Under Review',
                      sub: item.reviewedBy ? `by ${item.reviewedBy.name}` : null,
                      date: pastStatuses.includes(item.status) ? item.reviewedAt ?? item.createdAt : null,
                      dot: 'bg-blue-400',
                      line: 'bg-blue-200',
                      active: pastStatuses.includes(item.status),
                    },
                    {
                      key: 'approved',
                      type: 'status',
                      label: 'Approved',
                      sub: item.approvedBy ? `by ${item.approvedBy.name}` : null,
                      date: item.approvedAt,
                      dot: 'bg-green-500',
                      line: 'bg-green-200',
                      active: !!item.approvedAt,
                    },
                    {
                      key: 'planned',
                      type: 'status',
                      label: 'Planned',
                      sub: item.plannedBy ? `by ${item.plannedBy.name}` : null,
                      date: item.plannedAt,
                      dot: 'bg-violet-500',
                      line: 'bg-violet-200',
                      active: !!item.plannedAt,
                    },
                    {
                      key: 'in_progress',
                      type: 'status',
                      label: 'In Progress',
                      sub: null,
                      date: item.status === 'IN_PROGRESS' || item.status === 'COMPLETED' ? item.plannedAt : null,
                      dot: 'bg-indigo-500',
                      line: 'bg-indigo-200',
                      active: ['IN_PROGRESS', 'COMPLETED'].includes(item.status),
                    },
                    ...(!!item.completedAt || item.status === 'DROPPED' ? [{
                      key: 'completed',
                      type: 'status' as const,
                      label: item.status === 'DROPPED' ? 'Dropped' : 'Completed',
                      sub: item.completedBy ? `by ${item.completedBy.name}` : null,
                      date: item.completedAt,
                      dot: item.status === 'DROPPED' ? 'bg-gray-400' : 'bg-emerald-500',
                      line: item.status === 'DROPPED' ? 'bg-gray-200' : 'bg-emerald-200',
                      active: !!item.completedAt || item.status === 'DROPPED',
                    }] : []),
                  ];

                  // Merge task audit events chronologically among status steps
                  const taskSteps: TaskStep[] = taskAuditEntries.map(e => ({
                    key: e.key,
                    type: 'task' as const,
                    label: e.label,
                    sub: e.sub,
                    date: e.date,
                    event: e.event,
                    dot: e.event === 'task_completed' ? 'bg-emerald-400'
                      : e.event === 'task_deleted' ? 'bg-red-400'
                      : e.event === 'task_reopened' ? 'bg-orange-400'
                      : 'bg-sky-400',
                    line: e.event === 'task_completed' ? 'bg-emerald-200'
                      : e.event === 'task_deleted' ? 'bg-red-200'
                      : e.event === 'task_reopened' ? 'bg-orange-200'
                      : 'bg-sky-200',
                  }));

                  // Merge and sort by date (status steps without dates stay in order)
                  const allSteps: TrailStep[] = [...statusSteps];
                  for (const ts of taskSteps) {
                    const insertIdx = allSteps.findIndex(
                      s => s.date && new Date(s.date) > new Date(ts.date)
                    );
                    if (insertIdx === -1) {
                      allSteps.push(ts);
                    } else {
                      allSteps.splice(insertIdx, 0, ts);
                    }
                  }

                  const fmt = (d: string) =>
                    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                  return (
                    <div className="space-y-0">
                      {allSteps.map((step, idx) => {
                        const active = step.type === 'status' ? step.active : true;
                        const dot = step.type === 'status' ? step.dot : step.dot;
                        const line = step.type === 'status' ? step.line : step.line;
                        return (
                          <div key={step.key} className="flex gap-4">
                            <div className="flex flex-col items-center w-6 shrink-0">
                              {step.type === 'task' ? (
                                <div className={`size-3 rounded-full mt-0.5 shrink-0 flex items-center justify-center ${dot}`}>
                                  <ClipboardList className="size-2 text-white" />
                                </div>
                              ) : (
                                <div className={`size-3 rounded-full mt-0.5 shrink-0 ${active ? dot : 'bg-muted border-2 border-border'}`} />
                              )}
                              {idx < allSteps.length - 1 && (
                                <div className={`w-0.5 flex-1 min-h-[24px] ${active ? line : 'bg-border'}`} />
                              )}
                            </div>
                            <div className={`pb-5 ${idx === allSteps.length - 1 ? 'pb-0' : ''}`}>
                              <p className={`text-sm font-medium leading-none mt-0.5 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {step.label}
                              </p>
                              {step.sub && (
                                <p className="text-xs text-muted-foreground mt-0.5">{step.sub}</p>
                              )}
                              {active && step.date ? (
                                <p className="text-xs text-muted-foreground mt-1">{fmt(step.date)}</p>
                              ) : !active ? (
                                <p className="text-xs text-muted-foreground/50 mt-1">Pending</p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Change Status</Label>
                  <Select value={item.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IDEA">Idea</SelectItem>
                      <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="PLANNED">Planned</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="BLOCKED">Blocked</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="DROPPED">Dropped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Change Priority</Label>
                  <Select value={item.priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">Submitted by</div>
                    <div className="text-sm font-medium">{item.createdBy.name}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Risk Level</div>
                  <div className="text-sm font-medium mt-0.5">{item.riskLevel}</div>
                </div>
                {item.complianceFlag && (
                  <Badge variant="secondary" className="border-purple-300 text-purple-700 bg-purple-50">
                    Compliance Required
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Affected Modules */}
            <Card>
              <CardHeader>
                <CardTitle>Affected Modules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {item.affectedModules.map((module, index) => (
                    <Badge key={index} variant="outline">
                      {module}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="size-5" />
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasks Completed</span>
                  <span className="font-medium">
                    {completedTasks} / {item.tasks.length}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                {item.tasks.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right">{Math.round(progressPct)}% complete</p>
                )}
              </CardContent>
            </Card>

            {/* GitHub Integration */}
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="size-5" />
                  GitHub
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {item.githubIssueNumber ? (
                  <>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="size-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-sm font-medium text-emerald-800">
                        Linked to Issue #{item.githubIssueNumber}
                      </span>
                    </div>
                    {item.githubRepo && (
                      <p className="text-xs text-muted-foreground">{item.githubRepo}</p>
                    )}
                    {item.githubSyncedAt && (
                      <p className="text-xs text-muted-foreground">
                        Last synced: {new Date(item.githubSyncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                    <div className="flex flex-col gap-2 pt-1">
                      {item.githubIssueUrl && (
                        <a href={item.githubIssueUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="w-full gap-2">
                            <ExternalLink className="size-3.5" />
                            View on GitHub
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={handleGitHubSync}
                        disabled={githubSyncing}
                      >
                        <RefreshCw className={`size-3.5 ${githubSyncing ? 'animate-spin' : ''}`} />
                        {githubSyncing ? 'Syncing...' : 'Re-sync Issue'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full gap-2 text-muted-foreground hover:text-destructive"
                        onClick={handleGitHubUnlink}
                        disabled={githubSyncing}
                      >
                        <Unlink className="size-3.5" />
                        Unlink
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Push this item to GitHub as an issue so your team can track and resolve it there.
                    </p>
                    <Button
                      className="w-full gap-2"
                      onClick={handleGitHubSync}
                      disabled={githubSyncing}
                    >
                      <Github className={`size-4 ${githubSyncing ? 'animate-pulse' : ''}`} />
                      {githubSyncing ? 'Creating Issue...' : 'Push to GitHub'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
