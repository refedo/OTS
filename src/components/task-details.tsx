'use client';

import { Fragment, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2, Calendar, User, Briefcase, AlertCircle, CheckCircle2, History, Lock, Building, FolderKanban, ShieldCheck, Shield, Check, Undo2, XCircle, Activity, Paperclip, Download, File, FileText, Image, Loader2, MoreVertical, MessageCircleQuestion, Clock, MessageCircle, Send, UserPlus, X } from 'lucide-react';
import { EntityTimeline } from '@/components/events/EntityTimeline';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { getMainActivityLabel, getSubActivityLabel } from '@/lib/activity-constants';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type TaskAttachment = {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string | null;
  fileSize: number | null;
  uploadedBy: { id: string; name: string };
  uploadedAt: string;
};

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
  mainActivity: string | null;
  subActivity: string | null;
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
  attachments?: TaskAttachment[];
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
  userId: string;
  userPermissions?: string[];
};

export function TaskDetails({ task, userId, userPermissions = [] }: TaskDetailsProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [undoing, setUndoing] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completeNote, setCompleteNote] = useState('');
  const [showClarificationDialog, setShowClarificationDialog] = useState(false);
  const [clarificationMessage, setClarificationMessage] = useState('');
  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [extensionMessage, setExtensionMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [attachments, setAttachments] = useState<TaskAttachment[]>(task.attachments || []);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  // Conversation state
  type ConvMessage = { id: string; content: string; createdAt: string; user: { id: string; name: string; position: string | null } };
  type ConvParticipant = { joinedAt: string; user: { id: string; name: string; position: string | null }; invitedBy: { id: string; name: string } | null };
  const [convMessages, setConvMessages] = useState<ConvMessage[]>([]);
  const [convParticipants, setConvParticipants] = useState<ConvParticipant[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convMessage, setConvMessage] = useState('');
  const [convSending, setConvSending] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; position: string | null }[]>([]);
  const [inviting, setInviting] = useState(false);
  const convEndRef = useRef<HTMLDivElement>(null);

  // Check permissions - use permission-based check if available, fallback to role-based
  const canEdit = userPermissions.includes('tasks.edit');
  const canDelete = userPermissions.includes('tasks.delete');
  const isAssignedUser = task.assignedTo?.id === userId;

  // Fetch audit logs
  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const response = await fetch(`/api/tasks/${task.id}/audit-logs`);
        if (response.ok) {
          const data = await response.json();
          setAuditLogs(data);
          // Check if there's an undoable action (recent change with snapshot, not undone)
          const hasUndoableAction = data.some((log: AuditLog) => 
            log.action !== 'created' && 
            log.action !== 'undone' &&
            new Date(log.createdAt).getTime() > Date.now() - 5 * 60 * 1000 // Within last 5 minutes
          );
          setCanUndo(hasUndoableAction);
        }
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
      } finally {
        setLoadingAudit(false);
      }
    };
    fetchAuditLogs();
  }, [task.id]);

  // Fetch conversation
  const fetchConversation = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setConvMessages(data.messages);
        setConvParticipants(data.participants);
      }
    } finally {
      setConvLoading(false);
    }
  }, [task.id]);

  useEffect(() => {
    fetchConversation();
    const interval = setInterval(fetchConversation, 30000);
    return () => clearInterval(interval);
  }, [fetchConversation]);

  useEffect(() => {
    convEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages]);

  const handleSendMessage = async () => {
    if (!convMessage.trim() || convSending) return;
    setConvSending(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: convMessage.trim() }),
      });
      if (res.ok) {
        setConvMessage('');
        await fetchConversation();
      }
    } finally {
      setConvSending(false);
    }
  };

  const handleInviteParticipant = async (inviteUserId: string) => {
    setInviting(true);
    try {
      await fetch(`/api/tasks/${task.id}/conversation/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: inviteUserId }),
      });
      await fetchConversation();
      setShowInvite(false);
    } finally {
      setInviting(false);
    }
  };

  const loadAllUsers = async () => {
    if (allUsers.length > 0) { setShowInvite(true); return; }
    const res = await fetch('/api/users?forAssignment=true');
    if (res.ok) {
      const data = await res.json();
      setAllUsers(data.map((u: { id: string; name: string; position?: string | null }) => ({ id: u.id, name: u.name, position: u.position ?? null })));
    }
    setShowInvite(true);
  };

  // Format field names for display
  const formatFieldName = (field: string) => {
    const fieldNames: Record<string, string> = {
      title: 'Title',
      description: 'Description',
      assignedToId: 'Assigned To',
      projectId: 'Project',
      buildingId: 'Building',
      departmentId: 'Department',
      mainActivity: 'Main Activity',
      subActivity: 'Sub-Activity',
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
    if (action === 'approved') return 'Approved task';
    if (action === 'approval_revoked') return 'Revoked approval';
    if (action === 'rejected') return 'Rejected task';
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

  const handleStatusUpdate = async (newStatus: string, remark?: string) => {
    setUpdating(true);
    try {
      const body: Record<string, unknown> = { status: newStatus };
      if (remark) body.remark = remark;
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to update status');

      router.refresh();
    } catch (error) {
      alert('Failed to update task status');
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmComplete = async () => {
    await handleStatusUpdate('Completed', completeNote.trim() || undefined);
    setShowCompleteDialog(false);
    setCompleteNote('');
  };

  const handleSendRequest = async (type: 'clarification' | 'time_extension', message: string) => {
    setSendingRequest(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message }),
      });
      if (!response.ok) throw new Error('Failed to send request');
      if (type === 'clarification') {
        setShowClarificationDialog(false);
        setClarificationMessage('');
      } else {
        setShowExtensionDialog(false);
        setExtensionMessage('');
      }
    } catch {
      alert('Failed to send request');
    } finally {
      setSendingRequest(false);
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

  const handleReject = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejected: true, rejectionReason }),
      });
      if (!response.ok) throw new Error('Failed to reject task');
      setShowRejectDialog(false);
      setRejectionReason('');
      router.refresh();
    } catch {
      alert('Failed to reject task');
    } finally {
      setUpdating(false);
    }
  };

  const handleUndo = async () => {
    if (!confirm('Are you sure you want to undo the last change?')) return;

    setUndoing(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/undo`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to undo changes');
      }

      alert('Changes undone successfully');
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to undo changes');
    } finally {
      setUndoing(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    setDeletingAttachmentId(attachmentId);
    try {
      const res = await fetch(`/api/tasks/${task.id}/attachments/${attachmentId}`, { method: 'DELETE' });
      if (res.ok) setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  function formatBytes(bytes: number | null) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function AttachmentIcon({ mimeType }: { mimeType: string | null }) {
    if (!mimeType) return <File className="size-4 text-muted-foreground" />;
    if (mimeType.startsWith('image/')) return <Image className="size-4 text-blue-500" />;
    if (mimeType === 'application/pdf') return <FileText className="size-4 text-red-500" />;
    return <FileText className="size-4 text-muted-foreground" />;
  }

  // Stage approval circles component
  const StageApprovalCircles = () => {
    // Check if task is overdue (due date passed and not completed)
    const isTaskOverdue = task.dueDate && !task.completedAt && new Date(task.dueDate) < new Date();

    const stages = [
      { label: 'Input Date', completed: !!task.taskInputDate, date: task.taskInputDate, overdue: false, byWhom: null as string | null },
      { label: 'Due Date', completed: !!task.dueDate, date: task.dueDate, overdue: isTaskOverdue, byWhom: null as string | null },
      { label: 'Completion', completed: task.status === 'Completed' || !!task.completedAt, date: task.completedAt, overdue: isTaskOverdue && task.status !== 'Completed' && !task.completedAt, byWhom: task.completedBy?.name || null },
      { label: 'Release Date', completed: !!task.releaseDate, date: task.releaseDate, overdue: false, byWhom: null as string | null },
      { label: 'Approval', completed: !!task.approvedAt, date: task.approvedAt, overdue: isTaskOverdue && !task.approvedAt, byWhom: task.approvedBy?.name || null },
    ];

    return (
      <div className="py-4 px-2">
        {/* Row 1: Labels — all same height so circles below stay aligned */}
        <div className="flex justify-center mb-2">
          {stages.map((stage, index) => (
            <Fragment key={stage.label}>
              <div className="min-w-[72px] flex items-end justify-center h-8">
                <span className={cn(
                  "text-xs text-center leading-tight",
                  stage.overdue && !stage.completed ? "text-red-600 font-medium" : "text-muted-foreground"
                )}>
                  {stage.label}
                </span>
              </div>
              {index < stages.length - 1 && <div className="w-8 shrink-0" />}
            </Fragment>
          ))}
        </div>

        {/* Row 2: Circles with connectors — all on the same horizontal line */}
        <div className="flex items-center justify-center">
          {stages.map((stage, index) => (
            <Fragment key={stage.label}>
              <div className="min-w-[72px] flex justify-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0",
                  stage.completed
                    ? "bg-emerald-500 text-white"
                    : stage.overdue
                      ? "bg-red-500 text-white border-2 border-red-600"
                      : "bg-muted border-2 border-dashed border-muted-foreground/30"
                )}>
                  {stage.completed && <Check className="h-5 w-5" />}
                  {stage.overdue && !stage.completed && <AlertCircle className="h-5 w-5" />}
                </div>
              </div>
              {index < stages.length - 1 && (
                <div className={cn(
                  "w-8 h-0.5 shrink-0",
                  stages[index + 1].completed ? "bg-emerald-500" :
                  stages[index + 1].overdue ? "bg-red-500" : "bg-muted-foreground/20"
                )} />
              )}
            </Fragment>
          ))}
        </div>

        {/* Row 3: Dates and by-whom — below circles */}
        <div className="flex justify-center mt-2">
          {stages.map((stage, index) => (
            <Fragment key={stage.label}>
              <div className="min-w-[72px] flex flex-col items-center">
                {stage.date && (
                  <span className={cn(
                    "text-[10px] text-center leading-tight",
                    stage.overdue && !stage.completed ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {formatDate(stage.date)}
                  </span>
                )}
                {stage.byWhom && stage.completed && (
                  <span className="text-[9px] mt-0.5 text-muted-foreground/70 text-center truncate max-w-[72px]">
                    by {stage.byWhom}
                  </span>
                )}
              </div>
              {index < stages.length - 1 && <div className="w-8 shrink-0" />}
            </Fragment>
          ))}
        </div>
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
            {canUndo && canEdit && (
              <Button 
                variant="outline" 
                onClick={handleUndo} 
                disabled={undoing}
                className="text-orange-600 hover:text-orange-700"
              >
                <Undo2 className="size-4 mr-2" />
                {undoing ? 'Undoing...' : 'Undo'}
              </Button>
            )}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowClarificationDialog(true)}>
                  <MessageCircleQuestion className="size-4 mr-2" />
                  Ask for Clarification
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowExtensionDialog(true)}>
                  <Clock className="size-4 mr-2" />
                  Request Time Extension
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

            {/* Attachments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="size-5" />
                  Attachments
                  {attachments.length > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">({attachments.length})</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No attachments</p>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 text-sm">
                        <AttachmentIcon mimeType={att.fileType} />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{att.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(att.fileSize)} · {att.uploadedBy.name}
                          </p>
                        </div>
                        <a href={`/api/files?path=${att.filePath}`} download={att.fileName} target="_blank" rel="noreferrer">
                          <Button type="button" variant="ghost" size="icon" className="size-7">
                            <Download className="size-3.5" />
                          </Button>
                        </a>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteAttachment(att.id)}
                            disabled={deletingAttachmentId === att.id}
                          >
                            {deletingAttachmentId === att.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <XCircle className="size-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
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
                          onClick={() => setShowCompleteDialog(true)}
                          disabled={updating}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="size-4 mr-2" />
                          Mark as Completed
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Approval / Rejection Buttons */}
                  <div className="flex gap-2">
                    {task.status === 'Completed' && !task.approvedAt && !task.rejectedAt && (
                      <>
                        <Button
                          onClick={handleToggleApproval}
                          disabled={updating}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <ShieldCheck className="size-4 mr-2" />
                          Approve Task
                        </Button>
                        <Button
                          onClick={() => setShowRejectDialog(true)}
                          disabled={updating}
                          variant="outline"
                          className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <XCircle className="size-4 mr-2" />
                          Reject Task
                        </Button>
                      </>
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

                  {/* Clarification / Time Extension */}
                  <div className="border-t pt-3 mt-1">
                    <p className="text-xs text-muted-foreground mb-2">Need something from the creator?</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                        onClick={() => setShowClarificationDialog(true)}
                        disabled={sendingRequest}
                      >
                        <MessageCircleQuestion className="size-4" />
                        Ask for Clarification
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                        onClick={() => setShowExtensionDialog(true)}
                        disabled={sendingRequest}
                      >
                        <Clock className="size-4" />
                        Request Time Extension
                      </Button>
                    </div>
                  </div>
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

            {/* Building */}
            {task.building && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="size-4" />
                    Building
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{task.building.designation}</p>
                  <p className="text-sm text-muted-foreground">{task.building.name}</p>
                </CardContent>
              </Card>
            )}

            {/* Activity */}
            {task.mainActivity && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="size-4" />
                    Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="font-medium">{getMainActivityLabel(task.mainActivity)}</p>
                  {task.subActivity && (
                    <p className="text-sm text-muted-foreground">
                      {getSubActivityLabel(task.mainActivity, task.subActivity)}
                    </p>
                  )}
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

        {/* System Events Timeline */}
        <EntityTimeline
          entityType="Task"
          entityId={task.id}
          projectId={task.project?.id}
          className="mt-6"
        />

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

        {/* Conversation */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="size-5" />
                Conversation
                {convMessages.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">({convMessages.length})</span>
                )}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={loadAllUsers} disabled={inviting}>
                <UserPlus className="size-4 mr-1.5" />
                Invite
              </Button>
            </div>
            {convParticipants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {convParticipants.map(p => (
                  <span key={p.user.id} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                    {p.user.name}
                  </span>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {showInvite && (
              <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Invite to conversation</p>
                  <button onClick={() => setShowInvite(false)}><X className="size-4 text-muted-foreground" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                  {allUsers
                    .filter(u => !convParticipants.some(p => p.user.id === u.id))
                    .map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleInviteParticipant(u.id)}
                        disabled={inviting}
                        className="text-left text-sm px-3 py-1.5 rounded hover:bg-muted transition-colors"
                      >
                        <span className="font-medium">{u.name}</span>
                        {u.position && <span className="text-muted-foreground ml-1 text-xs">· {u.position}</span>}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {convLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : convMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No messages yet. Start the conversation below.
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {convMessages.map(msg => (
                  <div key={msg.id} className={cn('flex gap-3', msg.user.id === userId ? 'flex-row-reverse' : '')}>
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm',
                      msg.user.id === userId
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted rounded-tl-sm'
                    )}>
                      {msg.user.id !== userId && (
                        <p className="text-xs font-semibold mb-0.5 opacity-70">{msg.user.name}</p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={cn('text-[10px] mt-1 opacity-60', msg.user.id === userId ? 'text-right' : '')}>
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={convEndRef} />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Textarea
                placeholder="Type a message…"
                value={convMessage}
                onChange={e => setConvMessage(e.target.value)}
                rows={2}
                className="resize-none"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={convSending || !convMessage.trim()}
                className="self-end"
              >
                {convSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="size-5" />
              Mark Task as Completed
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Describe how you completed this task. The requester and creator will be notified.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="complete-note">Completion note <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                id="complete-note"
                placeholder="How did you complete this task?"
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCompleteDialog(false); setCompleteNote(''); }} disabled={updating}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmComplete}
              disabled={updating}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="size-4 mr-2" />
              {updating ? 'Saving…' : 'Confirm Completion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clarification Dialog — sends to task conversation */}
      <Dialog open={showClarificationDialog} onOpenChange={setShowClarificationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircleQuestion className="size-5" />
              Ask for Clarification
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Your message will be posted in the task conversation and all participants will be notified.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="clarification-msg">Message</Label>
              <Textarea
                id="clarification-msg"
                placeholder="What do you need clarification on?"
                value={clarificationMessage}
                onChange={(e) => setClarificationMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowClarificationDialog(false); setClarificationMessage(''); }} disabled={sendingRequest}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!clarificationMessage.trim()) return;
                setSendingRequest(true);
                try {
                  const prefix = '🔍 *Clarification Request:*\n';
                  const res = await fetch(`/api/tasks/${task.id}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: prefix + clarificationMessage.trim() }),
                  });
                  if (!res.ok) throw new Error('Failed');
                  setShowClarificationDialog(false);
                  setClarificationMessage('');
                  if (typeof fetchConversation === 'function') fetchConversation();
                } catch {
                  alert('Failed to send clarification');
                } finally {
                  setSendingRequest(false);
                }
              }}
              disabled={sendingRequest || !clarificationMessage.trim()}
            >
              {sendingRequest ? 'Sending…' : 'Send to Conversation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Extension Dialog */}
      <Dialog open={showExtensionDialog} onOpenChange={setShowExtensionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Request Time Extension
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Your request will be sent to the task creator as a push notification.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="extension-msg">Message</Label>
              <Textarea
                id="extension-msg"
                placeholder="Why do you need more time? What extension are you requesting?"
                value={extensionMessage}
                onChange={(e) => setExtensionMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowExtensionDialog(false); setExtensionMessage(''); }} disabled={sendingRequest}>
              Cancel
            </Button>
            <Button
              onClick={() => handleSendRequest('time_extension', extensionMessage)}
              disabled={sendingRequest || !extensionMessage.trim()}
            >
              {sendingRequest ? 'Sending…' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="size-5" />
              Reject Task
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">
              Provide a reason for rejection. The assignee will be notified.
            </p>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={updating}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={updating || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle className="size-4 mr-2" />
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
