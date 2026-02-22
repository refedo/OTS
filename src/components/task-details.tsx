'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2, Calendar, User, Briefcase, AlertCircle, CheckCircle2, History, Lock, Building, FolderKanban, ShieldCheck, Shield, Check } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Task = {
  id: string;
  title: string;
  description: string | null;
  taskInputDate: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  isPrivate: boolean;
  isCeoTask?: boolean;
  assignedTo: { id: string; name: string; email: string; position: string | null } | null;
  createdBy: { id: string; name: string; email: string };
  requester: { id: string; name: string; email: string } | null;
  releaseDate: string | null;
  project: { id: string; projectNumber: string; name: string } | null;
  building: { id: string; designation: string; name: string } | null;
  department: { id: string; name: string } | null;
  completedAt: string | null;
  completedBy: { id: string; name: string; email: string; position: string | null } | null;
  approvedAt: string | null;
  approvedBy: { id: string; name: string; email: string; position: string | null } | null;
  rejectedAt: string | null;
  rejectedBy: { id: string; name: string; email: string; position: string | null } | null;
  rejectionReason: string | null;
  remark: string | null;
  revision: string | null;
  createdAt: string;
  updatedAt: string;
};

type AuditLog = {
  id: string;
  taskId: string;
  userId: string;
  user: { id: string; name: string; email: string };
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
};

const statusColors = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
  Completed: 'bg-green-100 text-green-800 border-green-300',
};

const priorityColors = {
  Low: 'bg-gray-100 text-gray-800 border-gray-300',
  Medium: 'bg-orange-100 text-orange-800 border-orange-300',
  High: 'bg-red-100 text-red-800 border-red-300',
};

type TaskDetailsProps = {
  task: Task;
  userRole: string;
  userId: string;
  userPermissions?: string[];
};

export function TaskDetails({ task, userRole, userId, userPermissions = [] }: TaskDetailsProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);

  // Check permissions - use permission-based check if available, fallback to role-based
  const canEdit = userPermissions.includes('tasks.edit') || ['CEO', 'Admin', 'Manager'].includes(userRole);
  const canDelete = userPermissions.includes('tasks.delete') || ['CEO', 'Admin'].includes(userRole);
  const isAssignedUser = task.assignedTo?.id === userId;

  // Fetch audit logs
  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const response = await fetch(`/api/tasks/${task.id}/audit-logs`);
        if (response.ok) {
          const data = await response.json();
          setAuditLogs(data);
        }
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
      } finally {
        setLoadingAudit(false);
      }
    };
    fetchAuditLogs();
  }, [task.id]);

  // Format field names for display
  const formatFieldName = (field: string) => {
    const fieldNames: Record<string, string> = {
      title: 'Title',
      description: 'Description',
      assignedToId: 'Assigned To',
      projectId: 'Project',
      buildingId: 'Building',
      departmentId: 'Department',
      taskInputDate: 'Input Date',
      dueDate: 'Due Date',
      releaseDate: 'Release Date',
      requesterId: 'Requester',
      priority: 'Priority',
      status: 'Status',
      isPrivate: 'Private',
      isCeoTask: 'CEO Task',
    };
    return fieldNames[field] || field;
  };

  // Format action for display
  const formatAction = (action: string, field: string | null) => {
    if (action === 'created') return 'Created task';
    if (action === 'completed') return 'Marked as completed';
    if (action === 'status_changed') return 'Changed status';
    if (action === 'updated' && field) return `Updated ${formatFieldName(field)}`;
    return action;
  };

  // Format date/time for audit log
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}-${month}-${year}`;
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'Completed') return false;
    return new Date(dueDate) < new Date();
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      router.refresh();
    } catch (error) {
      alert('Failed to update task status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete task');

      router.push('/tasks');
      router.refresh();
    } catch (error) {
      alert('Failed to delete task');
    }
  };

  const handleToggleApproval = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: !task.approvedAt }),
      });

      if (!response.ok) throw new Error('Failed to update approval');

      router.refresh();
    } catch (error) {
      alert('Failed to update approval status');
    } finally {
      setUpdating(false);
    }
  };

  // Stage approval circles component
  const StageApprovalCircles = () => {
    // Check if task is overdue (due date passed and not completed)
    const isTaskOverdue = task.dueDate && !task.completedAt && new Date(task.dueDate) < new Date();
    
    const stages = [
      { label: 'Input Date', completed: !!task.taskInputDate, date: task.taskInputDate, overdue: false },
      { label: 'Due Date', completed: !!task.dueDate, date: task.dueDate, overdue: isTaskOverdue },
      { label: 'Release Date', completed: !!task.releaseDate, date: task.releaseDate, overdue: false },
      { label: 'Completion', completed: !!task.completedAt, date: task.completedAt, overdue: isTaskOverdue && !task.completedAt },
      { label: 'Approval', completed: !!task.approvedAt, date: task.approvedAt, overdue: isTaskOverdue && !task.approvedAt },
    ];

    return (
      <div className="flex items-center justify-center gap-0 py-6">
        {stages.map((stage, index) => (
          <div key={stage.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <span className={cn(
                "text-xs mb-2",
                stage.overdue && !stage.completed ? "text-red-600 font-medium" : "text-muted-foreground"
              )}>{stage.label}</span>
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                stage.completed 
                  ? "bg-emerald-500 text-white" 
                  : stage.overdue
                    ? "bg-red-500 text-white border-2 border-red-600"
                    : "bg-muted border-2 border-dashed border-muted-foreground/30"
              )}>
                {stage.completed && <Check className="h-6 w-6" />}
                {stage.overdue && !stage.completed && <AlertCircle className="h-6 w-6" />}
              </div>
              {stage.date && (
                <span className={cn(
                  "text-[10px] mt-1",
                  stage.overdue && !stage.completed ? "text-red-600" : "text-muted-foreground"
                )}>{formatDate(stage.date)}</span>
              )}
            </div>
            {index < stages.length - 1 && (
              <div className={cn(
                "w-12 h-0.5 mx-1 mt-4",
                stages[index + 1].completed ? "bg-emerald-500" : 
                stages[index + 1].overdue ? "bg-red-500" : "bg-muted-foreground/20"
              )} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 max-w-4xl max-lg:pt-20">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tasks">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{task.title}</h1>
            <p className="text-muted-foreground mt-1">Task Details</p>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" asChild>
                <Link href={`/tasks/${task.id}/edit`}>
                  <Edit className="size-4 mr-2" />
                  Edit
                </Link>
              </Button>
            )}
            {canDelete && (
              <Button variant="outline" onClick={handleDelete} className="text-destructive">
                <Trash2 className="size-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Stage Approval Circles */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <StageApprovalCircles />
          </CardContent>
        </Card>

        {/* Status and Priority Badges */}
        <div className="flex gap-2 mb-6">
          <Badge
            variant="outline"
            className={cn('text-base px-3 py-1', statusColors[task.status as keyof typeof statusColors])}
          >
            {task.status}
          </Badge>
          <Badge
            variant="outline"
            className={cn('text-base px-3 py-1', priorityColors[task.priority as keyof typeof priorityColors])}
          >
            {task.priority} Priority
          </Badge>
          {isOverdue(task.dueDate, task.status) && (
            <Badge variant="outline" className="text-base px-3 py-1 bg-red-100 text-red-800 border-red-300">
              <AlertCircle className="size-4 mr-1" />
              Overdue
            </Badge>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                {task.description ? (
                  <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
                ) : (
                  <p className="text-muted-foreground italic">No description provided</p>
                )}
              </CardContent>
            </Card>

            {/* Remark & Revision */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Revision</p>
                    <p className="font-mono">{task.revision || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Remark</p>
                    <p className="text-sm">{task.remark || '-'}</p>
                  </div>
                </div>
                {task.rejectedAt && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-700 mb-1">Rejected</p>
                    <p className="text-sm text-red-600">{task.rejectionReason || 'No reason provided'}</p>
                    <p className="text-xs text-red-500 mt-1">
                      by {task.rejectedBy?.name} on {formatDate(task.rejectedAt)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions (Complete & Approve) */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {/* Status Update Buttons */}
                  {task.status !== 'Completed' && (
                    <div className="flex gap-2">
                      {task.status === 'Pending' && (
                        <Button
                          onClick={() => handleStatusUpdate('In Progress')}
                          disabled={updating}
                          className="flex-1"
                        >
                          Start Task
                        </Button>
                      )}
                      {task.status === 'In Progress' && (
                        <Button
                          onClick={() => handleStatusUpdate('Completed')}
                          disabled={updating}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="size-4 mr-2" />
                          Mark as Completed
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Approval Button */}
                  <div className="flex gap-2">
                    {task.status === 'Completed' && !task.approvedAt && (
                      <Button
                        onClick={handleToggleApproval}
                        disabled={updating}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <ShieldCheck className="size-4 mr-2" />
                        Approve Task
                      </Button>
                    )}
                    {task.approvedAt && (
                      <Button
                        onClick={handleToggleApproval}
                        disabled={updating}
                        variant="outline"
                        className="flex-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                      >
                        <Shield className="size-4 mr-2" />
                        Revoke Approval
                      </Button>
                    )}
                  </div>

                  {/* Status info */}
                  {task.status === 'Completed' && (
                    <p className="text-xs text-muted-foreground text-center">
                      {task.approvedAt 
                        ? `Approved by ${task.approvedBy?.name || 'Unknown'} on ${formatDate(task.approvedAt)}`
                        : 'Task completed, awaiting approval'
                      }
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assigned To */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="size-4" />
                  Assigned To
                </CardTitle>
              </CardHeader>
              <CardContent>
                {task.assignedTo ? (
                  <div>
                    <p className="font-medium">{task.assignedTo.name}</p>
                    <p className="text-sm text-muted-foreground">{task.assignedTo.email}</p>
                    {task.assignedTo.position && (
                      <p className="text-sm text-muted-foreground mt-1">{task.assignedTo.position}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">Unassigned</p>
                )}
              </CardContent>
            </Card>

            {/* Requester */}
            {task.requester && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="size-4" />
                    Requester
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{task.requester.name}</p>
                  <p className="text-sm text-muted-foreground">{task.requester.email}</p>
                </CardContent>
              </Card>
            )}

            {/* Project */}
            {task.project && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="size-4" />
                    Project
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/projects/${task.project.id}`}
                    className="hover:underline"
                  >
                    <p className="font-medium">{task.project.projectNumber}</p>
                    <p className="text-sm text-muted-foreground">{task.project.name}</p>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="size-4" />
                    Due Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={cn(
                    "font-medium",
                    isOverdue(task.dueDate, task.status) && "text-destructive"
                  )}>
                    {formatDate(task.dueDate)}
                  </p>
                  {isOverdue(task.dueDate, task.status) && (
                    <p className="text-sm text-destructive mt-1">This task is overdue</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Release Date */}
            {task.releaseDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="size-4" />
                    Release Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{formatDate(task.releaseDate)}</p>
                </CardContent>
              </Card>
            )}

            {/* Created By */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Created By</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{task.createdBy.name}</p>
                <p className="text-sm text-muted-foreground">{task.createdBy.email}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDate(task.createdAt)}
                </p>
              </CardContent>
            </Card>

            {/* Completed By (if completed) */}
            {task.status === 'Completed' && task.completedBy && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-green-600" />
                    Completed By
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{task.completedBy.name}</p>
                  <p className="text-sm text-muted-foreground">{task.completedBy.email}</p>
                  {task.completedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(task.completedAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Task Visibility */}
            {(task.isPrivate || task.isCeoTask) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="size-4 text-amber-600" />
                    Visibility
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {task.isPrivate && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                      Private Task
                    </Badge>
                  )}
                  {task.isCeoTask && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 ml-2">
                      CEO Only
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Activity Trail / Audit Log */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-5" />
              Activity Trail
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAudit ? (
              <p className="text-muted-foreground text-sm">Loading activity...</p>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8">
                <History className="size-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No activity recorded yet</p>
                <p className="text-muted-foreground text-xs mt-1">Changes to this task will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((log, index) => (
                  <div key={log.id} className="flex gap-4">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        log.action === 'completed' ? "bg-green-500" :
                        log.action === 'created' ? "bg-blue-500" :
                        log.action === 'status_changed' ? "bg-purple-500" :
                        "bg-gray-400"
                      )} />
                      {index < auditLogs.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 mt-1" />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{log.user.name}</span>
                        <span className="text-muted-foreground text-sm">
                          {formatAction(log.action, log.field)}
                        </span>
                      </div>
                      
                      {/* Show old -> new value for updates */}
                      {log.oldValue !== null && log.newValue !== null && (
                        <div className="mt-1 text-sm">
                          <span className="text-red-600 line-through">{log.oldValue || '(empty)'}</span>
                          <span className="text-muted-foreground mx-2">→</span>
                          <span className="text-green-600">{log.newValue || '(empty)'}</span>
                        </div>
                      )}
                      
                      {/* Show only new value for creation or when old is null */}
                      {log.oldValue === null && log.newValue !== null && log.action !== 'created' && (
                        <div className="mt-1 text-sm">
                          <span className="text-green-600">Set to: {log.newValue}</span>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
