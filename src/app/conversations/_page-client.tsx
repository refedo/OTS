'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSessionValidator } from '@/hooks/use-session-validator';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Building2, Briefcase, Loader2, Send, Plus, Search, X, Hash, Users, UserPlus, UserMinus, AtSign, Calendar, Paperclip, FileText, Image as ImageIcon, ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Resolve attachment path — old uploads may be missing basePath prefix
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
function resolveFilePath(path: string): string {
  if (!path) return path;
  if (BASE && !path.startsWith(BASE) && path.startsWith('/uploads/')) {
    return `${BASE}${path}`;
  }
  return path;
}

// ── Types ──────────────────────────────────────────────────────────────────

type Conversation = {
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  project: { id: string; projectNumber: string; name: string } | null;
  building: { id: string; name: string; designation: string } | null;
  lastMessage: { content: string; createdAt: string; user: { id: string; name: string } } | null;
  participants: { id: string; name: string }[];
};

type MessageAttachment = {
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
};

type Message = {
  id: string;
  content: string;
  attachments?: MessageAttachment[] | null;
  createdAt: string;
  user: { id: string; name: string; position: string | null };
};

type Participant = {
  joinedAt: string;
  user: { id: string; name: string; position: string | null };
  invitedBy?: { id: string; name: string } | null;
};

type UserResult = {
  id: string;
  name: string;
  position: string | null;
};

type TaskOption = {
  id: string;
  title: string;
  status: string;
  dueDate?: string | null;
  mainActivity?: string | null;
  subActivity?: string | null;
  project?: { id: string; projectNumber: string; name: string } | null;
  building?: { id: string; designation: string; name: string } | null;
  assignedTo?: { id: string; name: string } | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function fmtTime(date: string) {
  return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function taskStatusStyle(status: string): string {
  switch (status) {
    case 'In Progress': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
    case 'Pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'Waiting for Approval': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'Completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'Cancelled': return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

function dueDateStyle(dueDate: string | null | undefined): string {
  if (!dueDate) return '';
  const diff = new Date(dueDate).getTime() - Date.now();
  const days = diff / 86400000;
  if (days < 0) return 'text-red-600 font-semibold';
  if (days < 3) return 'text-orange-500 font-medium';
  return 'text-muted-foreground';
}

function renderContent(content: string) {
  const parts = content.split(/(@\[[^\]]+\]|#\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const atM = part.match(/^@\[([^\]]+)\]$/);
    if (atM) {
      return (
        <span key={i} className="text-blue-500 font-medium bg-blue-500/10 rounded px-0.5">
          @{atM[1]}
        </span>
      );
    }
    const hashM = part.match(/^#\[([^\]]+)\]\(([^)]+)\)$/);
    if (hashM) {
      return (
        <a key={i} href={hashM[2]} className="text-primary font-medium underline underline-offset-2 hover:opacity-80">
          #{hashM[1]}
        </a>
      );
    }
    return part;
  });
}

function fmtDateLabel(date: string) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ConversationsPage() {
  const { isValidating } = useSessionValidator();
  const searchParams = useSearchParams();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Selected conversation state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // @ mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  // Attachment state
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; done: number } | null>(null);
  // Lightbox: track all images + current index for swipe navigation
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const lightboxSrc = lightboxIndex >= 0 ? lightboxImages[lightboxIndex] ?? null : null;
  const touchStartX = useRef<number>(0);

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images.map(resolveFilePath));
    setLightboxIndex(index);
  };
  const closeLightbox = () => setLightboxIndex(-1);
  const lightboxPrev = () => setLightboxIndex(i => (i > 0 ? i - 1 : lightboxImages.length - 1));
  const lightboxNext = () => setLightboxIndex(i => (i < lightboxImages.length - 1 ? i + 1 : 0));

  // Start new conversation state
  const [showStartNew, setShowStartNew] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskOptions, setTaskOptions] = useState<TaskOption[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [firstMessage, setFirstMessage] = useState('');
  const [selectedNewTask, setSelectedNewTask] = useState<TaskOption | null>(null);
  const [startingSend, setStartingSend] = useState(false);
  const [focusLoaded, setFocusLoaded] = useState(false);
  // Topic-only conversation (no task required)
  const [convTopic, setConvTopic] = useState('');
  // Invitees for new conversation
  const [newConvInviteeSearch, setNewConvInviteeSearch] = useState('');
  const [newConvInviteeResults, setNewConvInviteeResults] = useState<UserResult[]>([]);
  const [newConvInvitees, setNewConvInvitees] = useState<UserResult[]>([]);
  const [searchingNewInvitees, setSearchingNewInvitees] = useState(false);

  // Participant management
  const [showPeople, setShowPeople] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const selectedConv = conversations.find(c => c.taskId === selectedTaskId) ?? null;

  // Load current user ID
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.user?.id) setCurrentUserId(d.user.id);
    });
  }, []);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/conversations');
    if (res.ok) setConversations(await res.json());
    setLoadingList(false);
  }, []);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Deep-link: open conversation from notification (e.g. ?taskId=xxx)
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId && !selectedTaskId) {
      setSelectedTaskId(taskId);
    }
  }, [searchParams, selectedTaskId]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (taskId: string, initial = false) => {
    if (initial) {
      setLoadingConv(true);
      setMessages([]);
      setParticipants([]);
    }
    const res = await fetch(`/api/tasks/${taskId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(prev => {
        const incoming: Message[] = data.messages ?? [];
        // Append only new messages (by id) to avoid scroll-reset on polls
        if (!initial && prev.length > 0) {
          const existingIds = new Set(prev.map(m => m.id));
          const newOnes = incoming.filter(m => !existingIds.has(m.id));
          return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
        }
        return incoming;
      });
      setParticipants(data.participants ?? []);
    }
    if (initial) setLoadingConv(false);
  }, []);

  useEffect(() => {
    if (!selectedTaskId) return;
    loadMessages(selectedTaskId, true);
    // Poll every 5s for near-real-time updates
    const interval = setInterval(() => loadMessages(selectedTaskId), 5000);
    return () => clearInterval(interval);
  }, [selectedTaskId, loadMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load user's tasks on focus (before typing)
  const loadMyTasks = useCallback(async () => {
    if (focusLoaded) return;
    setLoadingTasks(true);
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        const tasks = (Array.isArray(data) ? data : data.tasks ?? []) as TaskOption[];
        setTaskOptions(tasks.slice(0, 20));
        setFocusLoaded(true);
      }
    } finally {
      setLoadingTasks(false);
    }
  }, [focusLoaded]);

  // Search tasks with debounce
  useEffect(() => {
    if (!showStartNew) return;
    if (taskSearch.trim().length === 0) {
      // Show preloaded tasks
      if (!focusLoaded) loadMyTasks();
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingTasks(true);
      try {
        const res = await fetch(`/api/tasks?search=${encodeURIComponent(taskSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setTaskOptions((Array.isArray(data) ? data : data.tasks ?? []).slice(0, 12));
        }
      } finally {
        setLoadingTasks(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [taskSearch, showStartNew, focusLoaded, loadMyTasks]);

  // User search for inviting to conversation
  useEffect(() => {
    if (!showPeople || userSearch.trim().length < 1) { setUserResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await fetch(`/api/users?forAssignment=true`, { credentials: 'include' });
        if (res.ok) {
          const all: UserResult[] = await res.json();
          const q = userSearch.toLowerCase();
          setUserResults(all.filter(u => u.name.toLowerCase().includes(q)).slice(0, 8));
        }
      } finally { setSearchingUsers(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [userSearch, showPeople]);

  // Invitee search for new conversation form
  useEffect(() => {
    if (newConvInviteeSearch.trim().length < 1) { setNewConvInviteeResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingNewInvitees(true);
      try {
        const res = await fetch('/api/users?forAssignment=true', { credentials: 'include' });
        if (res.ok) {
          const all: UserResult[] = await res.json();
          const q = newConvInviteeSearch.toLowerCase();
          setNewConvInviteeResults(
            all.filter(u => u.name.toLowerCase().includes(q) && !newConvInvitees.some(inv => inv.id === u.id)).slice(0, 8)
          );
        }
      } finally { setSearchingNewInvitees(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [newConvInviteeSearch, newConvInvitees]);

  const handleInviteUser = async (user: UserResult) => {
    if (!selectedTaskId || addingUserId) return;
    setAddingUserId(user.id);
    try {
      const res = await fetch(`/api/tasks/${selectedTaskId}/conversation/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        const newP: Participant = await res.json();
        setParticipants(prev => [...prev.filter(p => p.user.id !== user.id), newP]);
        setUserSearch('');
        setUserResults([]);
      }
    } finally { setAddingUserId(null); }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedTaskId || removingUserId) return;
    setRemovingUserId(userId);
    try {
      const res = await fetch(`/api/tasks/${selectedTaskId}/conversation/participants?userId=${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) setParticipants(prev => prev.filter(p => p.user.id !== userId));
    } finally { setRemovingUserId(null); }
  };

  const resetStartNew = () => {
    setShowStartNew(false);
    setSelectedNewTask(null);
    setFirstMessage('');
    setTaskSearch('');
    setConvTopic('');
    setNewConvInvitees([]);
    setNewConvInviteeSearch('');
    setNewConvInviteeResults([]);
    setFocusLoaded(false);
  };

  const handleSelectConversation = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowPeople(false);
    setUserSearch('');
    setUserResults([]);
    setPendingAttachments([]);
    resetStartNew();
  };

  // File upload with progress tracking
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setUploadProgress({ total: files.length, done: 0 });
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'conversations');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          // Detect type from name if server returns generic MIME
          const detectedType = data.fileType && data.fileType !== 'application/octet-stream'
            ? data.fileType
            : file.type || (file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? 'image/jpeg' : 'application/octet-stream');
          setPendingAttachments(prev => [...prev, {
            fileName: data.originalName,
            filePath: data.filePath,
            fileType: detectedType,
            fileSize: data.fileSize,
          }]);
        }
        setUploadProgress({ total: files.length, done: i + 1 });
      }
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // @ mention helpers
  const mentionCandidates = mentionQuery !== null
    ? participants
        .map(p => p.user)
        .filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
        .slice(0, 6)
    : [];

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart ?? value.length;
    setNewMessage(value);
    setMentionQuery(null);
    const textBefore = value.slice(0, cursor);
    const atMatch = textBefore.match(/@([\w ]*)$/);
    if (atMatch) setMentionQuery(atMatch[1]);
  };

  const insertMention = (user: { name: string }) => {
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? newMessage.length;
    const textBefore = newMessage.slice(0, cursor);
    const textAfter = newMessage.slice(cursor);
    const atMatch = textBefore.match(/@([\w ]*)$/);
    const prefix = atMatch ? textBefore.slice(0, atMatch.index) : textBefore;
    setNewMessage(`${prefix}@[${user.name}] ${textAfter}`);
    setMentionQuery(null);
    setTimeout(() => el?.focus(), 0);
  };

  const handleSendMessage = async () => {
    const content = newMessage.trim();
    if (!selectedTaskId || (!content && pendingAttachments.length === 0) || sending) return;
    setNewMessage('');
    setMentionQuery(null);
    const attachmentsToSend = [...pendingAttachments];
    setPendingAttachments([]);
    setSending(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTaskId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, attachments: attachmentsToSend }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        await loadConversations();
      } else {
        setNewMessage(content);
        setPendingAttachments(attachmentsToSend);
      }
    } catch {
      setNewMessage(content);
      setPendingAttachments(attachmentsToSend);
    } finally {
      setSending(false);
    }
  };

  const handleStartNewConversation = async () => {
    const message = firstMessage.trim();
    const hasTask = !!selectedNewTask;
    const hasTopic = convTopic.trim().length > 0;
    if ((!hasTask && !hasTopic) || !message || startingSend) return;
    setStartingSend(true);
    try {
      // Use POST /api/conversations to create the conversation (handles both task-linked and topic-only)
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedNewTask?.id ?? null,
          topic: hasTopic && !hasTask ? convTopic.trim() : null,
          firstMessage: message,
          inviteeIds: newConvInvitees.map(u => u.id),
        }),
      });
      if (res.ok) {
        const { taskId } = await res.json();
        await loadConversations();
        setSelectedTaskId(taskId);
        resetStartNew();
      }
    } finally {
      setStartingSend(false);
    }
  };

  if (isValidating) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      {/* ── Left Channel List ──────────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col border-r bg-gradient-to-b from-primary/5 via-primary/3 to-background">
        <div className="px-4 py-3.5 border-b bg-primary/8 flex items-center justify-between">
          <h2 className="font-bold text-sm flex items-center gap-2 text-primary">
            <MessageCircle className="size-4" />
            Conversations
          </h2>
          <button
            onClick={() => { resetStartNew(); setShowStartNew(true); setSelectedTaskId(null); }}
            className="size-7 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-all hover:scale-110"
            title="Start new conversation"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 py-1">
          {loadingList ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="size-5 animate-spin text-primary/40" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center">
              <MessageCircle className="size-10 text-primary/15 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No conversations yet</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Start one with the + button</p>
            </div>
          ) : (
            conversations.map(conv => {
              const active = selectedTaskId === conv.taskId;
              const initials = conv.lastMessage?.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';
              return (
                <button
                  key={conv.taskId}
                  onClick={() => handleSelectConversation(conv.taskId)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 mx-1 w-[calc(100%-8px)] rounded-lg transition-all mb-0.5',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-primary/8 text-foreground',
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={cn(
                      'size-8 rounded-xl shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5',
                      active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/15 text-primary',
                    )}>
                      {conv.taskTitle.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn('text-sm truncate font-semibold', active ? 'text-primary-foreground' : '')}>
                          {conv.taskTitle}
                        </span>
                        {conv.lastMessage && (
                          <span className={cn('text-[10px] shrink-0', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                            {timeAgo(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {conv.project && (
                        <span className={cn('text-[10px] font-medium', active ? 'text-primary-foreground/70' : 'text-primary/70')}>
                          {conv.project.projectNumber}
                          {conv.building ? ` · ${conv.building.designation}` : ''}
                        </span>
                      )}
                      {conv.lastMessage && (
                        <p className={cn('text-[11px] truncate mt-0.5', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                          <span className="font-medium">{conv.lastMessage.user.name.split(' ')[0]}:</span>{' '}
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right Panel ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {showStartNew ? (
          /* Start New Conversation */
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="font-semibold text-sm flex items-center gap-2 text-primary">
                <Plus className="size-4" />
                New Conversation
              </h2>
              <button onClick={resetStartNew} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Topic / Purpose */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Topic / Purpose</label>
                <input
                  type="text"
                  value={convTopic}
                  onChange={e => setConvTopic(e.target.value)}
                  placeholder="e.g. Weekly coordination, Design review…"
                  disabled={!!selectedNewTask}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  autoFocus={!selectedNewTask}
                />
                {!selectedNewTask && convTopic.trim() && (
                  <p className="text-[11px] text-muted-foreground mt-1">This will create a standalone discussion thread.</p>
                )}
              </div>

              {/* OR divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t" />
                <span className="text-[11px] text-muted-foreground font-medium">OR link to a task</span>
                <div className="flex-1 border-t" />
              </div>

              {/* Task Search */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Select a task (optional)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={e => { setTaskSearch(e.target.value); setSelectedNewTask(null); setConvTopic(''); }}
                    onFocus={() => { if (!focusLoaded && !taskSearch) loadMyTasks(); }}
                    placeholder="Search tasks by name…"
                    disabled={!!convTopic.trim() && !selectedNewTask}
                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {loadingTasks && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />}
                </div>

                {taskOptions.length > 0 && !selectedNewTask && (
                  <div className="mt-1 border rounded-lg overflow-hidden bg-background shadow-sm max-h-[260px] overflow-y-auto">
                    {taskOptions.map(task => (
                      <button
                        key={task.id}
                        onClick={() => { setSelectedNewTask(task); setTaskSearch(task.title); setTaskOptions([]); setConvTopic(''); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b last:border-0"
                      >
                        <div className="flex items-start gap-2">
                          <Hash className="size-3 text-muted-foreground shrink-0 mt-1" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold truncate">{task.title}</span>
                              <span className={`shrink-0 px-1.5 py-0 rounded text-[10px] font-medium ${taskStatusStyle(task.status)}`}>{task.status}</span>
                            </div>
                            <div className="flex items-center gap-2.5 mt-0.5 flex-wrap text-[11px]">
                              {task.project && <span className="text-blue-500 font-medium">{task.project.projectNumber}</span>}
                              {task.building && <span className="text-muted-foreground flex items-center gap-0.5"><Building2 className="size-2.5" />{task.building.name || task.building.designation}</span>}
                              {task.assignedTo && <span className="text-muted-foreground flex items-center gap-0.5"><Users className="size-2.5" />{task.assignedTo.name}</span>}
                              {task.dueDate && <span className={`flex items-center gap-0.5 ${dueDateStyle(task.dueDate)}`}><Calendar className="size-2.5" />{new Date(task.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedNewTask && (
                  <div className="mt-2 px-3 py-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Hash className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold truncate">{selectedNewTask.title}</span>
                          <span className={`px-1.5 py-0 rounded text-[10px] font-medium ${taskStatusStyle(selectedNewTask.status)}`}>{selectedNewTask.status}</span>
                        </div>
                        <div className="flex items-center gap-2.5 mt-0.5 flex-wrap text-[11px]">
                          {selectedNewTask.project && <span className="text-blue-500 font-medium">{selectedNewTask.project.projectNumber}</span>}
                          {selectedNewTask.building && <span className="text-muted-foreground">{selectedNewTask.building.name || selectedNewTask.building.designation}</span>}
                          {selectedNewTask.assignedTo && <span className="text-muted-foreground">→ {selectedNewTask.assignedTo.name}</span>}
                        </div>
                      </div>
                      <button onClick={() => { setSelectedNewTask(null); setTaskSearch(''); setFocusLoaded(false); }} className="shrink-0 mt-0.5">
                        <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Invitees */}
              {(selectedNewTask || convTopic.trim()) && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Invite people (optional)</label>
                  {newConvInvitees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {newConvInvitees.map(u => (
                        <span key={u.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {u.name}
                          <button onClick={() => setNewConvInvitees(prev => prev.filter(i => i.id !== u.id))} className="hover:text-destructive ml-0.5">
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={newConvInviteeSearch}
                      onChange={e => setNewConvInviteeSearch(e.target.value)}
                      placeholder="Search and add people…"
                      className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {searchingNewInvitees && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground" />}
                  </div>
                  {newConvInviteeResults.length > 0 && (
                    <div className="mt-1 border rounded-lg overflow-hidden bg-background shadow-sm">
                      {newConvInviteeResults.map(u => (
                        <button
                          key={u.id}
                          onClick={() => { setNewConvInvitees(prev => [...prev, u]); setNewConvInviteeSearch(''); setNewConvInviteeResults([]); }}
                          className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors border-b last:border-0 flex items-center gap-2.5"
                        >
                          <div className="size-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{u.name}</p>
                            {u.position && <p className="text-[11px] text-muted-foreground truncate">{u.position}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* First message */}
              {(selectedNewTask || convTopic.trim()) && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Your message</label>
                  <textarea
                    value={firstMessage}
                    onChange={e => setFirstMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStartNewConversation(); } }}
                    placeholder="Type your first message…"
                    rows={3}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    autoFocus={!!selectedNewTask || !!convTopic.trim()}
                  />
                  <Button
                    size="sm"
                    onClick={handleStartNewConversation}
                    disabled={!firstMessage.trim() || startingSend}
                    className="mt-2 w-full"
                  >
                    {startingSend ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Send className="size-3.5 mr-1.5" />}
                    Start Conversation
                    {newConvInvitees.length > 0 && ` · ${newConvInvitees.length} invited`}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : selectedTaskId && selectedConv ? (
          /* Conversation Thread */
          <div className="flex flex-col h-full">
            {/* Channel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                  {selectedConv.taskTitle.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm truncate">{selectedConv.taskTitle}</h3>
                  <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
                    {selectedConv.project && (
                      <span className="flex items-center gap-1 text-primary/80 font-medium">
                        <Briefcase className="size-3" />
                        {selectedConv.project.projectNumber}
                      </span>
                    )}
                    {selectedConv.building && (
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3" />
                        {selectedConv.building.name || selectedConv.building.designation}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowPeople(v => !v)}
                  title="Manage participants"
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    showPeople
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-primary/10 text-primary hover:bg-primary/20',
                  )}
                >
                  <Users className="size-3.5" />
                  <span>People</span>
                </button>
                <Link href={`/tasks/${selectedTaskId}`}>
                  <Button variant="outline" size="sm" className="text-xs h-8 border-primary/20 text-primary hover:bg-primary/5">
                    View Task
                  </Button>
                </Link>
              </div>
            </div>
            {/* Main area: messages + optional people panel */}
            <div className="flex flex-1 min-h-0">

            {/* Messages column */}
            <div className="flex-1 min-w-0 flex flex-col">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loadingConv ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <MessageCircle className="size-8 text-primary/50" />
                  </div>
                  <p className="font-semibold text-foreground/80">Start the conversation</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    Be the first to send a message. The task assignee and creator will be notified.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((msg, i) => {
                    const isMe = msg.user.id === currentUserId;
                    const prevMsg = i > 0 ? messages[i - 1] : null;
                    const showDate = !prevMsg || fmtDateLabel(prevMsg.createdAt) !== fmtDateLabel(msg.createdAt);
                    const showAuthor = !prevMsg || prevMsg.user.id !== msg.user.id || showDate;

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 border-t border-border/50" />
                            <span className="text-[11px] font-semibold text-muted-foreground bg-muted/50 px-3 py-0.5 rounded-full">
                              {fmtDateLabel(msg.createdAt)}
                            </span>
                            <div className="flex-1 border-t border-border/50" />
                          </div>
                        )}
                        <div className={cn(
                          'group flex gap-2.5 px-1',
                          showAuthor ? 'mt-3' : 'mt-0.5',
                          isMe ? 'flex-row-reverse' : 'flex-row',
                        )}>
                          {/* Avatar */}
                          {showAuthor ? (
                            <div className={cn(
                              'size-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 shadow-sm',
                              isMe
                                ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
                                : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
                            )}>
                              {msg.user.name.charAt(0).toUpperCase()}
                            </div>
                          ) : (
                            <div className="w-8 shrink-0 flex items-end justify-center">
                              <span className="text-[10px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                {fmtTime(msg.createdAt)}
                              </span>
                            </div>
                          )}
                          <div className={cn('flex flex-col max-w-[70%]', isMe ? 'items-end' : 'items-start')}>
                            {showAuthor && (
                              <div className={cn('flex items-baseline gap-2 mb-1 px-1', isMe ? 'flex-row-reverse' : '')}>
                                <span className="font-semibold text-xs">{isMe ? 'You' : msg.user.name}</span>
                                {msg.user.position && (
                                  <span className="text-[10px] text-muted-foreground">{msg.user.position}</span>
                                )}
                                <span className="text-[10px] text-muted-foreground">{fmtTime(msg.createdAt)}</span>
                              </div>
                            )}
                            {msg.content && (
                              <div className={cn(
                                'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm',
                                isMe
                                  ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm'
                                  : 'bg-muted rounded-tl-sm border border-border/30',
                              )}>
                                {renderContent(msg.content)}
                              </div>
                            )}
                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (() => {
                              const atts = msg.attachments as MessageAttachment[];
                              const msgImages = atts.filter(a => a.fileType.startsWith('image/')).map(a => resolveFilePath(a.filePath));
                              return (
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {atts.map((att, ai) => {
                                  const isImage = att.fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.fileName);
                                  const resolvedPath = resolveFilePath(att.filePath);
                                  if (isImage) {
                                    const imgIdx = msgImages.indexOf(resolvedPath);
                                    return (
                                      <button key={ai} type="button"
                                        onClick={() => openLightbox(msgImages, imgIdx >= 0 ? imgIdx : 0)}
                                        className={cn('block rounded-xl overflow-hidden max-w-[220px] hover:opacity-90 transition-opacity shadow-sm border', isMe ? 'border-primary/30' : 'border-border/50')}>
                                        <img src={resolvedPath} alt={att.fileName} className="max-h-36 object-contain bg-muted/50" />
                                      </button>
                                    );
                                  }
                                  const isPdf = att.fileType === 'application/pdf' || att.fileName.endsWith('.pdf');
                                  return (
                                    <div key={ai} className={cn('flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-xl text-xs shadow-sm',
                                      isMe ? 'bg-primary/80 text-primary-foreground border border-primary/30' : 'bg-muted border border-border/50')}>
                                      <FileText className="size-3.5 shrink-0" />
                                      <span className="truncate max-w-[120px]">{att.fileName}</span>
                                      {isPdf && (
                                        <button type="button" title="Preview PDF"
                                          onClick={() => openLightbox([resolvedPath], 0)}
                                          className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
                                          <ExternalLink className="size-3" />
                                        </button>
                                      )}
                                      <a href={resolvedPath} download={att.fileName}
                                        title="Download" className="ml-0.5 opacity-70 hover:opacity-100 transition-opacity">
                                        <Download className="size-3" />
                                      </a>
                                    </div>
                                  );
                                })}
                              </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="px-4 py-3 border-t bg-gradient-to-t from-background to-transparent shrink-0">
              {/* @ mention dropdown */}
              {mentionCandidates.length > 0 && (
                <div className="mb-1 border rounded-lg bg-popover shadow-md overflow-hidden">
                  {mentionCandidates.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); insertMention(u); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                    >
                      <span className="size-6 rounded-md bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium">{u.name}</span>
                      {u.position && <span className="text-muted-foreground text-xs ml-auto">{u.position}</span>}
                    </button>
                  ))}
                </div>
              )}
              {/* Upload progress bar */}
              {uploadProgress && (
                <div className="mb-2 px-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span>Uploading {uploadProgress.done}/{uploadProgress.total}…</span>
                    <span>{Math.round((uploadProgress.done / uploadProgress.total) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {/* Pending attachments preview */}
              {pendingAttachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2 px-1">
                  {pendingAttachments.map((att, i) => {
                    const isImage = att.fileType.startsWith('image/');
                    return isImage ? (
                      <div key={i} className="relative group">
                        <img
                          src={resolveFilePath(att.filePath)}
                          alt={att.fileName}
                          className="size-16 object-cover rounded-xl border-2 border-primary/20 shadow-sm"
                        />
                        <button
                          onClick={() => setPendingAttachments(prev => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border-2 border-border/60 bg-muted/60 text-xs group relative">
                        <FileText className="size-3.5 text-blue-500 shrink-0" />
                        <span className="truncate max-w-[120px]">{att.fileName}</span>
                        <button
                          onClick={() => setPendingAttachments(prev => prev.filter((_, j) => j !== i))}
                          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="size-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <input ref={fileInputRef} type="file" multiple className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileUpload}
              />
              <div className="border-2 border-border/60 rounded-2xl bg-background focus-within:border-primary/40 focus-within:shadow-md transition-all">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setMentionQuery(null); return; }
                    if (e.key === 'Enter' && !e.shiftKey && mentionCandidates.length === 0) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Message #${selectedConv.taskTitle.slice(0, 30)}...`}
                  rows={2}
                  className="w-full px-3 pt-2.5 pb-1 text-sm bg-transparent focus:outline-none resize-none"
                />
                <div className="flex items-center justify-between px-3 pb-2">
                  <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Attach file"
                    disabled={!!uploadProgress}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {uploadProgress ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
                  </button>
                  <button
                    type="button"
                    title="Mention someone (@)"
                    onClick={() => {
                      const pos = textareaRef.current?.selectionStart ?? newMessage.length;
                      const before = newMessage.slice(0, pos);
                      const after = newMessage.slice(pos);
                      setNewMessage(`${before}@${after}`);
                      setMentionQuery('');
                      setTimeout(() => textareaRef.current?.focus(), 0);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <AtSign className="size-4" />
                  </button>
                  </div>
                  <Button
                    size="icon"
                    variant={newMessage.trim() || pendingAttachments.length > 0 ? 'default' : 'ghost'}
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && pendingAttachments.length === 0) || sending}
                    className="size-7 rounded-lg"
                  >
                    {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 text-center">
                Enter to send · Shift+Enter for new line · @ to mention
              </p>
            </div>
            </div>{/* end messages column */}

            {/* People panel */}
            {showPeople && (
              <div className="w-64 shrink-0 border-l flex flex-col bg-muted/20 overflow-y-auto">
                <div className="px-3 py-2.5 border-b flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">People</span>
                  <button onClick={() => setShowPeople(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="size-3.5" />
                  </button>
                </div>

                {/* Invite section */}
                <div className="p-3 border-b">
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Invite someone</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search by name..."
                      className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {searchingUsers && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 size-3 animate-spin text-muted-foreground" />}
                  </div>
                  {userResults.length > 0 && (
                    <div className="mt-1 border rounded-md overflow-hidden bg-background shadow-sm">
                      {userResults
                        .filter(u => !participants.some(p => p.user.id === u.id))
                        .map(u => (
                          <button
                            key={u.id}
                            onClick={() => handleInviteUser(u)}
                            disabled={addingUserId === u.id}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted transition-colors border-b last:border-0"
                          >
                            <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate flex-1 text-left">{u.name}</span>
                            {addingUserId === u.id
                              ? <Loader2 className="size-3 animate-spin shrink-0" />
                              : <UserPlus className="size-3 text-muted-foreground shrink-0" />
                            }
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Participant list */}
                <div className="flex-1 overflow-y-auto">
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {participants.length} participant{participants.length !== 1 ? 's' : ''}
                  </p>
                  {participants.map(p => (
                    <div key={p.user.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40 group">
                      <div className={cn(
                        'size-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                        p.user.id === currentUserId ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                      )}>
                        {p.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{p.user.name}</p>
                        {p.user.position && <p className="text-[10px] text-muted-foreground truncate">{p.user.position}</p>}
                      </div>
                      {p.user.id !== currentUserId && (
                        <button
                          onClick={() => handleRemoveUser(p.user.id)}
                          disabled={removingUserId === p.user.id}
                          title="Remove from conversation"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        >
                          {removingUserId === p.user.id
                            ? <Loader2 className="size-3 animate-spin" />
                            : <UserMinus className="size-3.5" />
                          }
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>{/* end main area flex */}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="size-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-sm">
              <MessageCircle className="size-12 text-primary/60" />
            </div>
            <p className="font-bold text-xl text-foreground/80">Welcome to Conversations</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
              Select a conversation from the sidebar, or click the{' '}
              <span className="font-semibold text-primary">+</span>{' '}
              button to start a new one on any task.
            </p>
          </div>
        )}
      </div>
    </div>

    {/* Image / PDF lightbox with swipe navigation */}
    {lightboxIndex >= 0 && lightboxSrc && (() => {
      const isPdf = lightboxSrc.endsWith('.pdf');
      const hasMany = lightboxImages.length > 1;
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm select-none"
          onClick={closeLightbox}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(dx) > 50) { dx < 0 ? lightboxNext() : lightboxPrev(); }
            else { closeLightbox(); } // tap to dismiss
          }}
        >
          {/* Close */}
          <button type="button"
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors z-10"
            onClick={e => { e.stopPropagation(); closeLightbox(); }}>
            <X className="size-5" />
          </button>

          {/* Prev / Next */}
          {hasMany && (
            <>
              <button type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors z-10"
                onClick={e => { e.stopPropagation(); lightboxPrev(); }}>
                <ChevronLeft className="size-6" />
              </button>
              <button type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors z-10"
                onClick={e => { e.stopPropagation(); lightboxNext(); }}>
                <ChevronRight className="size-6" />
              </button>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-xs bg-black/40 px-3 py-1 rounded-full z-10">
                {lightboxIndex + 1} / {lightboxImages.length}
              </div>
            </>
          )}

          {/* Content */}
          {isPdf ? (
            <iframe src={lightboxSrc} className="w-[90vw] h-[90vh] rounded-lg shadow-2xl bg-white"
              onClick={e => e.stopPropagation()} title="PDF preview" />
          ) : (
            <img src={lightboxSrc} alt="Preview"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={e => e.stopPropagation()} />
          )}

          {/* Open in new tab */}
          <a href={lightboxSrc} target="_blank" rel="noreferrer"
            className="absolute bottom-4 right-4 text-white/60 hover:text-white text-xs px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors z-10 flex items-center gap-1"
            onClick={e => e.stopPropagation()}>
            <ExternalLink className="size-3" /> Open original
          </a>
        </div>
      );
    })()}
    </>
  );
}
