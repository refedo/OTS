'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSessionValidator } from '@/hooks/use-session-validator';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Building2, Briefcase, Loader2, Send, Plus, Search, X, Hash, Users, UserPlus, UserMinus, AtSign, Calendar, Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
  const parts = content.split(/(@\[[^\]]+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^@\[([^\]]+)\]$/);
    if (m) {
      return (
        <span key={i} className="text-blue-500 font-medium bg-blue-500/10 rounded px-0.5">
          @{m[1]}
        </span>
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
  const [uploadingFile, setUploadingFile] = useState(false);

  // Start new conversation state
  const [showStartNew, setShowStartNew] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskOptions, setTaskOptions] = useState<TaskOption[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [firstMessage, setFirstMessage] = useState('');
  const [selectedNewTask, setSelectedNewTask] = useState<TaskOption | null>(null);
  const [startingSend, setStartingSend] = useState(false);
  const [focusLoaded, setFocusLoaded] = useState(false);

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

  const handleSelectConversation = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowStartNew(false);
    setShowPeople(false);
    setUserSearch('');
    setUserResults([]);
    setPendingAttachments([]);
  };

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingFile(true);
    try {
      for (const file of Array.from(e.target.files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'conversations');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          setPendingAttachments(prev => [...prev, {
            fileName: data.originalName,
            filePath: data.filePath,
            fileType: data.fileType,
            fileSize: data.fileSize,
          }]);
        }
      }
    } finally {
      setUploadingFile(false);
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
    if (!selectedNewTask || !firstMessage.trim() || startingSend) return;
    setStartingSend(true);
    try {
      const res = await fetch(`/api/tasks/${selectedNewTask.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: firstMessage.trim() }),
      });
      if (res.ok) {
        await loadConversations();
        setSelectedTaskId(selectedNewTask.id);
        setShowStartNew(false);
        setSelectedNewTask(null);
        setFirstMessage('');
        setTaskSearch('');
        setFocusLoaded(false);
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
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      {/* ── Left Channel List (Slack-style) ───────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col border-r bg-muted/30">
        <div className="px-3 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-1.5">
            <MessageCircle className="size-4" />
            Conversations
          </h2>
          <button
            onClick={() => { setShowStartNew(true); setSelectedTaskId(null); setFocusLoaded(false); }}
            className="size-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Start new conversation"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loadingList ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            conversations.map(conv => {
              const active = selectedTaskId === conv.taskId;
              return (
                <button
                  key={conv.taskId}
                  onClick={() => handleSelectConversation(conv.taskId)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 transition-colors border-b border-border/30',
                    active ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-muted/50',
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Hash className="size-3 text-muted-foreground shrink-0" />
                    <span className={cn('text-sm truncate', active ? 'font-semibold' : 'font-medium')}>
                      {conv.taskTitle}
                    </span>
                  </div>

                  {conv.project && (
                    <span className="text-[10px] text-muted-foreground truncate block pl-4.5">
                      {conv.project.projectNumber}
                    </span>
                  )}

                  {conv.lastMessage && (
                    <div className="flex items-center justify-between mt-1 pl-4.5">
                      <p className="text-[11px] text-muted-foreground truncate flex-1 mr-2">
                        <span className="font-medium">{conv.lastMessage.user.name.split(' ')[0]}:</span>{' '}
                        {conv.lastMessage.content}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {timeAgo(conv.lastMessage.createdAt)}
                      </span>
                    </div>
                  )}
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
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Plus className="size-4" />
                Start New Conversation
              </h2>
              <button onClick={() => setShowStartNew(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Task Search */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Select a task</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={e => { setTaskSearch(e.target.value); setSelectedNewTask(null); }}
                    onFocus={() => { if (!focusLoaded && !taskSearch) loadMyTasks(); }}
                    placeholder="Search tasks by name..."
                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {loadingTasks && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />}
                </div>

                {taskOptions.length > 0 && !selectedNewTask && (
                  <div className="mt-1 border rounded-lg overflow-hidden bg-background shadow-sm max-h-[340px] overflow-y-auto">
                    {taskOptions.map(task => (
                      <button
                        key={task.id}
                        onClick={() => { setSelectedNewTask(task); setTaskSearch(task.title); setTaskOptions([]); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b last:border-0"
                      >
                        <div className="flex items-start gap-2">
                          <Hash className="size-3 text-muted-foreground shrink-0 mt-1" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold truncate">{task.title}</span>
                              <span className={`shrink-0 px-1.5 py-0 rounded text-[10px] font-medium ${taskStatusStyle(task.status)}`}>
                                {task.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 mt-0.5 flex-wrap text-[11px]">
                              {task.project && (
                                <span className="text-blue-500 font-medium">{task.project.projectNumber}</span>
                              )}
                              {task.building && (
                                <span className="text-muted-foreground flex items-center gap-0.5">
                                  <Building2 className="size-2.5" />
                                  {task.building.name || task.building.designation}
                                </span>
                              )}
                              {task.mainActivity && (
                                <span className="text-violet-500">{task.mainActivity}</span>
                              )}
                              {task.assignedTo && (
                                <span className="text-muted-foreground flex items-center gap-0.5">
                                  <Users className="size-2.5" />
                                  {task.assignedTo.name}
                                </span>
                              )}
                              {task.dueDate && (
                                <span className={`flex items-center gap-0.5 ${dueDateStyle(task.dueDate)}`}>
                                  <Calendar className="size-2.5" />
                                  {new Date(task.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </span>
                              )}
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
                          <span className={`px-1.5 py-0 rounded text-[10px] font-medium ${taskStatusStyle(selectedNewTask.status)}`}>
                            {selectedNewTask.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 mt-0.5 flex-wrap text-[11px]">
                          {selectedNewTask.project && <span className="text-blue-500 font-medium">{selectedNewTask.project.projectNumber}</span>}
                          {selectedNewTask.building && <span className="text-muted-foreground">{selectedNewTask.building.name || selectedNewTask.building.designation}</span>}
                          {selectedNewTask.assignedTo && <span className="text-muted-foreground">→ {selectedNewTask.assignedTo.name}</span>}
                          {selectedNewTask.dueDate && (
                            <span className={dueDateStyle(selectedNewTask.dueDate)}>
                              Due {new Date(selectedNewTask.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => { setSelectedNewTask(null); setTaskSearch(''); setFocusLoaded(false); }} className="shrink-0 mt-0.5">
                        <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* First message */}
              {selectedNewTask && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Your message</label>
                  <textarea
                    value={firstMessage}
                    onChange={e => setFirstMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStartNewConversation(); } }}
                    placeholder="Type your message..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleStartNewConversation}
                    disabled={!firstMessage.trim() || startingSend}
                    className="mt-2"
                  >
                    {startingSend ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Send className="size-3.5 mr-1" />}
                    Start Conversation
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : selectedTaskId && selectedConv ? (
          /* Slack-style Conversation Thread */
          <div className="flex flex-col h-full">
            {/* Channel header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Hash className="size-4 text-muted-foreground shrink-0" />
                <span className="font-semibold text-sm truncate">{selectedConv.taskTitle}</span>
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                  {selectedConv.project && (
                    <span className="flex items-center gap-1">
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
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowPeople(v => !v)}
                  title="Manage participants"
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors',
                    showPeople ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Users className="size-3.5" />
                  <span>{participants.length}</span>
                </button>
                <Link href={`/tasks/${selectedTaskId}`}>
                  <Button variant="ghost" size="sm" className="text-xs h-7">View Task</Button>
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
                  <Hash className="size-12 text-muted-foreground/20 mb-3" />
                  <p className="font-medium text-muted-foreground">This is the start of the conversation</p>
                  <p className="text-sm text-muted-foreground mt-1">Send a message to begin.</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {messages.map((msg, i) => {
                    const isMe = msg.user.id === currentUserId;
                    const prevMsg = i > 0 ? messages[i - 1] : null;
                    const showDate = !prevMsg || fmtDateLabel(prevMsg.createdAt) !== fmtDateLabel(msg.createdAt);
                    const showAuthor = !prevMsg || prevMsg.user.id !== msg.user.id || showDate;

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex items-center gap-3 my-3">
                            <div className="flex-1 border-t" />
                            <span className="text-[11px] font-medium text-muted-foreground bg-background px-2">
                              {fmtDateLabel(msg.createdAt)}
                            </span>
                            <div className="flex-1 border-t" />
                          </div>
                        )}
                        <div className={cn(
                          'group flex gap-2.5 py-0.5 px-2 -mx-2 rounded-md transition-colors hover:bg-muted/40',
                          showAuthor && 'mt-2',
                        )}>
                          {/* Avatar */}
                          {showAuthor ? (
                            <div className={cn(
                              'size-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold mt-0.5',
                              isMe ? 'bg-primary/15 text-primary' : 'bg-amber-500/15 text-amber-600',
                            )}>
                              {msg.user.name.charAt(0).toUpperCase()}
                            </div>
                          ) : (
                            <div className="w-8 shrink-0">
                              <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity leading-6 block text-center">
                                {fmtTime(msg.createdAt)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {showAuthor && (
                              <div className="flex items-baseline gap-2 mb-0.5">
                                <span className="font-semibold text-sm">{msg.user.name}</span>
                                {msg.user.position && (
                                  <span className="text-[10px] text-muted-foreground">{msg.user.position}</span>
                                )}
                                <span className="text-[10px] text-muted-foreground">{fmtTime(msg.createdAt)}</span>
                              </div>
                            )}
                            {msg.content && (
                              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {renderContent(msg.content)}
                              </div>
                            )}
                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {(msg.attachments as MessageAttachment[]).map((att, ai) => {
                                  const isImage = att.fileType.startsWith('image/');
                                  return isImage ? (
                                    <a key={ai} href={att.filePath} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border max-w-[240px]">
                                      <img src={att.filePath} alt={att.fileName} className="max-h-40 object-contain bg-muted" />
                                    </a>
                                  ) : (
                                    <a key={ai} href={att.filePath} target="_blank" rel="noreferrer"
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-muted/50 text-xs hover:bg-muted transition-colors"
                                    >
                                      <FileText className="size-3.5 text-blue-500 shrink-0" />
                                      <span className="truncate max-w-[160px]">{att.fileName}</span>
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input — Slack-style */}
            <div className="px-4 py-3 border-t shrink-0">
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
              {/* Pending attachments preview */}
              {pendingAttachments.length > 0 && (
                <div className="mb-1 flex flex-wrap gap-1.5 px-1">
                  {pendingAttachments.map((att, i) => {
                    const isImage = att.fileType.startsWith('image/');
                    return (
                      <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg border bg-muted/50 text-xs group">
                        {isImage ? <ImageIcon className="size-3 text-blue-500" /> : <FileText className="size-3 text-blue-500" />}
                        <span className="truncate max-w-[140px]">{att.fileName}</span>
                        <button onClick={() => setPendingAttachments(prev => prev.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
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
              <div className="border rounded-xl bg-background focus-within:ring-2 focus-within:ring-ring transition-shadow">
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
                    disabled={uploadingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {uploadingFile ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
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
                    variant={newMessage.trim() ? 'default' : 'ghost'}
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
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
            <MessageCircle className="size-16 text-muted-foreground/15 mb-4" />
            <p className="font-semibold text-lg text-muted-foreground">Welcome to Conversations</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Select a conversation from the sidebar, or start a new one by clicking the + button.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
