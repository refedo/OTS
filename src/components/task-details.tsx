'use client';

import { Fragment, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2, Calendar, User, Briefcase, AlertCircle, CheckCircle2, History, Lock, Building, FolderKanban, ShieldCheck, Shield, Check, Undo2, XCircle, Activity, Paperclip, Download, File, FileText, Image, Loader2, MoreVertical, MessageCircleQuestion, Clock, MessageCircle, Send, UserPlus, X, AtSign, ChevronLeft, ChevronRight, Search } from 'lucide-react';
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
  type ConvAttachment = { fileName: string; filePath: string; fileType: string; fileSize: number };
  type ConvMessage = { id: string; content: string; attachments?: ConvAttachment[] | null; createdAt: string; user: { id: string; name: string; position: string | null } };
  type ConvParticipant = { joinedAt: string; user: { id: string; name: string; position: string | null }; invitedBy: { id: string; name: string } | null };
  const [convMessages, setConvMessages] = useState<ConvMessage[]>([]);
  const [convParticipants, setConvParticipants] = useState<ConvParticipant[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convMessage, setConvMessage] = useState('');
  const [convSending, setConvSending] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; position: string | null }[]>([]);
  const [inviting, setInviting] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const convEndRef = useRef<HTMLDivElement>(null);
  const convTextareaRef = useRef<HTMLTextAreaElement>(null);
  const convFileInputRef = useRef<HTMLInputElement>(null);
  const [convPendingAtts, setConvPendingAtts] = useState<ConvAttachment[]>([]);
  const [convUploading, setConvUploading] = useState(false);
  const [convMentionQuery, setConvMentionQuery] = useState<string | null>(null);
  const [convTaskQuery, setConvTaskQuery] = useState<string | null>(null);
  const [convTaskOptions, setConvTaskOptions] = useState<{ id: string; title: string; status: string }[]>([]);
  // Lightbox for inline conversation
  const [convLbImages, setConvLbImages] = useState<string[]>([]);
  const [convLbIdx, setConvLbIdx] = useState(-1);
  const convTouchX = useRef(0);

  const convBase = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const resolveConvPath = (p: string) => (convBase && !p.startsWith(convBase) && p.startsWith('/uploads/') ? `${convBase}${p}` : p);

  const convMentionCandidates = convMentionQuery !== null
    ? convParticipants.map(p => p.user).filter(u => u.name.toLowerCase().includes(convMentionQuery.toLowerCase())).slice(0, 5)
    : [];

  const handleConvTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value; const cur = e.target.selectionStart ?? val.length;
    setConvMessage(val); setConvMentionQuery(null); setConvTaskQuery(null);
    const before = val.slice(0, cur);
    const atMatch = before.match(/@([\w ]*)$/); if (atMatch) setConvMentionQuery(atMatch[1]);
    const hashMatch = before.match(/#([\w ]*)$/); if (hashMatch) { setConvTaskQuery(hashMatch[1]); fetchTaskSuggestions(hashMatch[1]); }
  };

  const fetchTaskSuggestions = async (q: string) => {
    if (q.length < 1) { setConvTaskOptions([]); return; }
    try {
      const res = await fetch(`/api/tasks?search=${encodeURIComponent(q)}&limit=5`);
      if (res.ok) { const d = await res.json(); setConvTaskOptions((Array.isArray(d) ? d : d.tasks ?? []).slice(0, 5)); }
    } catch { /* ignore */ }
  };

  const insertConvMention = (user: { name: string }) => {
    const el = convTextareaRef.current; const cur = el?.selectionStart ?? convMessage.length;
    const before = convMessage.slice(0, cur); const after = convMessage.slice(cur);
    const m = before.match(/@([\w ]*)$/);
    setConvMessage(`${m ? before.slice(0, m.index) : before}@[${user.name}] ${after}`);
    setConvMentionQuery(null); setTimeout(() => el?.focus(), 0);
  };

  const insertConvTaskRef = (t: { id: string; title: string }) => {
    const el = convTextareaRef.current; const cur = el?.selectionStart ?? convMessage.length;
    const before = convMessage.slice(0, cur); const after = convMessage.slice(cur);
    const m = before.match(/#([\w ]*)$/);
    setConvMessage(`${m ? before.slice(0, m.index) : before}#[${t.title}](/tasks/${t.id}) ${after}`);
    setConvTaskQuery(null); setConvTaskOptions([]); setTimeout(() => el?.focus(), 0);
  };

  const handleConvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setConvUploading(true);
    try {
      for (const file of Array.from(e.target.files)) {
        const fd = new FormData(); fd.append('file', file); fd.append('folder', 'conversations');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (res.ok) {
          const d = await res.json();
          const detectedType = d.fileType && d.fileType !== 'application/octet-stream' ? d.fileType : file.type || (file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? 'image/jpeg' : 'application/octet-stream');
          setConvPendingAtts(prev => [...prev, { fileName: d.originalName, filePath: d.filePath, fileType: detectedType, fileSize: d.fileSize }]);
        }
      }
    } finally { setConvUploading(false); if (convFileInputRef.current) convFileInputRef.current.value = ''; }
  };

  function renderConvContent(content: string) {
    const parts = content.split(/(@\[[^\]]+\]|#\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, i) => {
      const atM = part.match(/^@\[([^\]]+)\]$/);
      if (atM) return <span key={i} className="text-blue-500 font-medium bg-blue-500/10 rounded px-0.5">@{atM[1]}</span>;
      const hashM = part.match(/^#\[([^\]]+)\]\(([^)]+)\)$/);
      if (hashM) return <a key={i} href={hashM[2]} className="text-primary font-medium underline underline-offset-2 hover:opacity-80">#{hashM[1]}</a>;
      return part;
    });
  }

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

  // Fetch conversation (non-destructive poll — only append new messages)
  const fetchConversation = useCallback(async (initial = false) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setConvMessages(prev => {
          const incoming: ConvMessage[] = data.messages ?? [];
          if (!initial && prev.length > 0) {
            const ids = new Set(prev.map(m => m.id));
            const newOnes = incoming.filter(m => !ids.has(m.id));
            return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
          }
          return incoming;
        });
        setConvParticipants(data.participants ?? []);
      }
    } finally {
      if (initial) setConvLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  useEffect(() => {
    fetchConversation(true);
    const interval = setInterval(() => fetchConversation(false), 5000);
    return () => clearInterval(interval);
  }, [fetchConversation]);

  useEffect(() => {
    convEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages]);

  const handleSendMessage = async () => {
    const content = convMessage.trim();
    if ((!content && convPendingAtts.length === 0) || convSending) return;
    setConvSending(true);
    const atts = [...convPendingAtts];
    setConvMessage(''); setConvPendingAtts([]); setConvMentionQuery(null); setConvTaskQuery(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, attachments: atts }),
      });
      if (res.ok) {
        const msg = await res.json();
        setConvMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } else { setConvMessage(content); setConvPendingAtts(atts); }
    } catch { setConvMessage(content); setConvPendingAtts(atts); }
    finally { setConvSending(false); }
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

  const isTaskOverdue = !!(task.dueDate && task.status !== 'Completed' && new Date(task.dueDate) < new Date());

  const handleConfirmComplete = async () => {
    const note = completeNote.trim();
    await handleStatusUpdate('Completed', note || undefined);
    setShowCompleteDialog(false);
    setCompleteNote('');
    // If a note was provided, post it to the task conversation
    if (note) {
      try {
        const prefix = isTaskOverdue ? '⚠️ *Delay Justification:*\n' : '✅ *Completion Note:*\n';
        await fetch(`/api/tasks/${task.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: prefix + note }),
        });
      } catch { /* non-critical */ }
    }
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
        <Card className="mt-6 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="size-4 text-primary" />
                Conversation
                {convMessages.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{convMessages.length}</span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {convParticipants.length > 0 && (
                  <div className="flex -space-x-1.5">
                    {convParticipants.slice(0, 4).map(p => (
                      <div key={p.user.id} title={p.user.name}
                        className="size-6 rounded-full bg-primary/20 text-primary border-2 border-background flex items-center justify-center text-[9px] font-bold">
                        {p.user.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {convParticipants.length > 4 && (
                      <div className="size-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                        +{convParticipants.length - 4}
                      </div>
                    )}
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={loadAllUsers} disabled={inviting} className="h-7 px-2 text-xs">
                  <UserPlus className="size-3.5 mr-1" />Invite
                </Button>
                <Link href={`/conversations?taskId=${task.id}`}>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs border-primary/20 text-primary hover:bg-primary/5">
                    Open
                  </Button>
                </Link>
              </div>
            </div>
            {showInvite && (
              <div className="mt-2 border rounded-lg p-2.5 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Add to conversation</p>
                  <button onClick={() => { setShowInvite(false); setInviteSearch(''); }}><X className="size-3.5 text-muted-foreground" /></button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                  <input
                    type="text"
                    value={inviteSearch}
                    onChange={e => setInviteSearch(e.target.value)}
                    placeholder="Search people..."
                    autoFocus
                    className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                  {allUsers
                    .filter(u =>
                      !convParticipants.some(p => p.user.id === u.id) &&
                      (inviteSearch.trim() === '' || u.name.toLowerCase().includes(inviteSearch.toLowerCase()))
                    )
                    .map(u => (
                      <button key={u.id} onClick={() => handleInviteParticipant(u.id)} disabled={inviting}
                        className="text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-1.5">
                        <div className="size-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium truncate block">{u.name}</span>
                          {u.position && <span className="text-[10px] text-muted-foreground truncate block">{u.position}</span>}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {/* Messages */}
            <div className="space-y-1 max-h-80 overflow-y-auto px-4 py-3">
              {convLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : convMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageCircle className="size-8 text-primary/20 mb-2" />
                  <p className="text-sm text-muted-foreground">No messages yet. Start the conversation below.</p>
                </div>
              ) : (
                convMessages.map((msg, i) => {
                  const isMe = msg.user.id === userId;
                  const prev = i > 0 ? convMessages[i - 1] : null;
                  const showName = !prev || prev.user.id !== msg.user.id;
                  const atts = (msg.attachments ?? []) as ConvAttachment[];
                  const msgImgs = atts.filter(a => a.fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(a.fileName)).map(a => resolveConvPath(a.filePath));
                  return (
                    <div key={msg.id} className={cn('flex gap-2', isMe ? 'flex-row-reverse' : '', showName ? 'mt-3' : 'mt-0.5')}>
                      {showName ? (
                        <div className={cn('size-7 rounded-xl shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5 shadow-sm',
                          isMe ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground' : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white')}>
                          {msg.user.name.charAt(0).toUpperCase()}
                        </div>
                      ) : <div className="w-7 shrink-0" />}
                      <div className={cn('flex flex-col max-w-[75%]', isMe ? 'items-end' : 'items-start')}>
                        {showName && (
                          <div className={cn('flex items-baseline gap-1.5 mb-0.5 px-1', isMe ? 'flex-row-reverse' : '')}>
                            <span className="text-xs font-semibold">{isMe ? 'You' : msg.user.name}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                        {msg.content && (
                          <div className={cn('px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm',
                            isMe ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm border border-border/30')}>
                            {renderConvContent(msg.content)}
                          </div>
                        )}
                        {atts.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {atts.map((att, ai) => {
                              const isImg = att.fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.fileName);
                              const rp = resolveConvPath(att.filePath);
                              if (isImg) {
                                const idx = msgImgs.indexOf(rp);
                                return (
                                  <button key={ai} type="button" onClick={() => { setConvLbImages(msgImgs); setConvLbIdx(idx >= 0 ? idx : 0); }}
                                    className={cn('block rounded-xl overflow-hidden max-w-[180px] hover:opacity-90 transition-opacity shadow-sm border', isMe ? 'border-primary/30' : 'border-border/50')}>
                                    <img src={rp} alt={att.fileName} className="max-h-32 object-contain bg-muted/50" />
                                  </button>
                                );
                              }
                              return (
                                <div key={ai} className={cn('flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-xl text-xs shadow-sm',
                                  isMe ? 'bg-primary/80 text-primary-foreground border border-primary/30' : 'bg-muted border border-border/50')}>
                                  <FileText className="size-3 shrink-0" />
                                  <span className="truncate max-w-[100px]">{att.fileName}</span>
                                  <a href={rp} download={att.fileName} className="ml-0.5 opacity-70 hover:opacity-100" onClick={e => e.stopPropagation()}>
                                    <Download className="size-3" />
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={convEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t px-3 py-2.5 bg-background/50">
              {/* @mention dropdown */}
              {convMentionCandidates.length > 0 && (
                <div className="mb-1 border rounded-lg bg-popover shadow-md overflow-hidden">
                  {convMentionCandidates.map(u => (
                    <button key={u.id} type="button" onMouseDown={e => { e.preventDefault(); insertConvMention(u); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left">
                      <div className="size-5 rounded-md bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{u.name}</span>
                      {u.position && <span className="text-muted-foreground ml-auto text-[10px]">{u.position}</span>}
                    </button>
                  ))}
                </div>
              )}
              {/* #task dropdown */}
              {convTaskQuery !== null && convTaskOptions.length > 0 && (
                <div className="mb-1 border rounded-lg bg-popover shadow-md overflow-hidden">
                  {convTaskOptions.map(t => (
                    <button key={t.id} type="button" onMouseDown={e => { e.preventDefault(); insertConvTaskRef(t); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left">
                      <span className="font-medium truncate flex-1">{t.title}</span>
                      <span className="text-muted-foreground text-[10px] shrink-0">{t.status}</span>
                    </button>
                  ))}
                </div>
              )}
              {/* Pending attachments */}
              {convPendingAtts.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1.5">
                  {convPendingAtts.map((att, i) => {
                    const isImg = att.fileType.startsWith('image/');
                    return isImg ? (
                      <div key={i} className="relative group">
                        <img src={resolveConvPath(att.filePath)} alt={att.fileName} className="size-12 object-cover rounded-lg border border-primary/20 shadow-sm" />
                        <button onClick={() => setConvPendingAtts(prev => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="size-2.5" />
                        </button>
                      </div>
                    ) : (
                      <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg border bg-muted/60 text-xs group">
                        <FileText className="size-3 text-blue-500 shrink-0" />
                        <span className="truncate max-w-[100px]">{att.fileName}</span>
                        <button onClick={() => setConvPendingAtts(prev => prev.filter((_, j) => j !== i))}
                          className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="size-2.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <input ref={convFileInputRef} type="file" multiple className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp" onChange={handleConvFileUpload} />
              <div className="border-2 border-border/60 rounded-xl bg-background focus-within:border-primary/40 transition-all">
                <Textarea
                  ref={convTextareaRef}
                  placeholder="Type a message… @ to mention · # to reference a task"
                  value={convMessage}
                  onChange={handleConvTextChange}
                  rows={2}
                  className="resize-none border-0 shadow-none focus-visible:ring-0 text-sm px-3 pt-2 pb-1 bg-transparent"
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setConvMentionQuery(null); setConvTaskQuery(null); return; }
                    if (e.key === 'Enter' && !e.shiftKey && convMentionCandidates.length === 0 && convTaskOptions.length === 0) {
                      e.preventDefault(); handleSendMessage();
                    }
                  }}
                />
                <div className="flex items-center justify-between px-3 pb-2">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => convFileInputRef.current?.click()} disabled={convUploading}
                      className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                      {convUploading ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
                    </button>
                    <button type="button" onClick={() => { const pos = convTextareaRef.current?.selectionStart ?? convMessage.length; setConvMessage(v => `${v.slice(0, pos)}@${v.slice(pos)}`); setConvMentionQuery(''); setTimeout(() => convTextareaRef.current?.focus(), 0); }}
                      className="text-muted-foreground hover:text-foreground transition-colors">
                      <AtSign className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => { const pos = convTextareaRef.current?.selectionStart ?? convMessage.length; setConvMessage(v => `${v.slice(0, pos)}#${v.slice(pos)}`); setConvTaskQuery(''); fetchTaskSuggestions(''); setTimeout(() => convTextareaRef.current?.focus(), 0); }}
                      title="Reference a task"
                      className="text-muted-foreground hover:text-foreground transition-colors font-bold text-sm leading-none pb-0.5">
                      #
                    </button>
                  </div>
                  <Button size="icon" variant={convMessage.trim() || convPendingAtts.length > 0 ? 'default' : 'ghost'}
                    onClick={handleSendMessage} disabled={(!convMessage.trim() && convPendingAtts.length === 0) || convSending}
                    className="size-7 rounded-lg">
                    {convSending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 text-center">Enter to send · Shift+Enter for new line · @ mention · # task reference</p>
            </div>
          </CardContent>
        </Card>

        {/* Inline conversation lightbox */}
        {convLbIdx >= 0 && convLbImages[convLbIdx] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
            onClick={() => setConvLbIdx(-1)}
            onTouchStart={e => { convTouchX.current = e.touches[0].clientX; }}
            onTouchEnd={e => { const dx = e.changedTouches[0].clientX - convTouchX.current; if (Math.abs(dx) > 50) dx < 0 ? setConvLbIdx(i => Math.min(i + 1, convLbImages.length - 1)) : setConvLbIdx(i => Math.max(i - 1, 0)); else setConvLbIdx(-1); }}>
            <button type="button" className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-black/40 z-10"
              onClick={e => { e.stopPropagation(); setConvLbIdx(-1); }}><X className="size-5" /></button>
            {convLbImages.length > 1 && (
              <>
                <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-full bg-black/40 z-10"
                  onClick={e => { e.stopPropagation(); setConvLbIdx(i => Math.max(i - 1, 0)); }}><ChevronLeft className="size-5" /></button>
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-full bg-black/40 z-10"
                  onClick={e => { e.stopPropagation(); setConvLbIdx(i => Math.min(i + 1, convLbImages.length - 1)); }}><ChevronRight className="size-5" /></button>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-xs bg-black/40 px-3 py-1 rounded-full z-10">{convLbIdx + 1}/{convLbImages.length}</div>
              </>
            )}
            <img src={convLbImages[convLbIdx]} alt="Preview"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={e => e.stopPropagation()} />
          </div>
        )}
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
            {isTaskOverdue ? (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">This task is overdue</p>
                  <p className="text-xs mt-0.5 text-red-600/80">A delay justification is required. This note will be automatically posted to the task conversation.</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Optionally describe how you completed this task. If provided, it will be posted to the task conversation.
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="complete-note" className={isTaskOverdue ? 'text-red-700' : ''}>
                {isTaskOverdue ? (
                  <>Delay justification <span className="text-red-500">*</span></>
                ) : (
                  <>Completion note <span className="text-muted-foreground">(optional)</span></>
                )}
              </Label>
              <Textarea
                id="complete-note"
                placeholder={isTaskOverdue
                  ? 'Explain why this task was delayed and how it was resolved…'
                  : 'How did you complete this task?'
                }
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
                rows={4}
                className={isTaskOverdue && !completeNote.trim() ? 'border-red-300 focus-visible:ring-red-400' : ''}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCompleteDialog(false); setCompleteNote(''); }} disabled={updating}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmComplete}
              disabled={updating || (isTaskOverdue && !completeNote.trim())}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
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
              Your message will be posted to the task conversation and all participants will be notified. You'll be taken to the conversation after sending.
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
                  router.push(`/conversations?taskId=${task.id}`);
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
              Your request will be posted to the task conversation and sent to the creator as a push notification.
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
              onClick={async () => {
                if (!extensionMessage.trim()) return;
                setSendingRequest(true);
                try {
                  // Post to conversation
                  await fetch(`/api/tasks/${task.id}/messages`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: `⏱️ *Time Extension Request:*\n${extensionMessage.trim()}` }),
                  });
                  // Also send push notification
                  await handleSendRequest('time_extension', extensionMessage);
                  setShowExtensionDialog(false);
                  setExtensionMessage('');
                  router.push(`/conversations?taskId=${task.id}`);
                } finally { setSendingRequest(false); }
              }}
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
