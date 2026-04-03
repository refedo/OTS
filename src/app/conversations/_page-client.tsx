'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSessionValidator } from '@/hooks/use-session-validator';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Building2, Briefcase, Loader2, Send, Plus, Search, X, ArrowLeft } from 'lucide-react';
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

type Message = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; position: string | null };
};

type Participant = {
  joinedAt: string;
  user: { id: string; name: string; position: string | null };
};

type TaskOption = {
  id: string;
  title: string;
  status: string;
  project?: { projectNumber: string; name: string } | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtTime(date: string) {
  return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function statusColor(status: string) {
  switch (status) {
    case 'Completed': return 'bg-emerald-100 text-emerald-700';
    case 'In Progress': return 'bg-blue-100 text-blue-700';
    case 'Pending': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ConversationsPage() {
  const { isValidating } = useSessionValidator();
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

  // Start new conversation state
  const [showStartNew, setShowStartNew] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskOptions, setTaskOptions] = useState<TaskOption[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [firstMessage, setFirstMessage] = useState('');
  const [selectedNewTask, setSelectedNewTask] = useState<TaskOption | null>(null);
  const [startingSend, setStartingSend] = useState(false);

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

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (taskId: string) => {
    setLoadingConv(true);
    setMessages([]);
    setParticipants([]);
    const res = await fetch(`/api/tasks/${taskId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
      setParticipants(data.participants ?? []);
    }
    setLoadingConv(false);
  }, []);

  useEffect(() => {
    if (!selectedTaskId) return;
    loadMessages(selectedTaskId);
  }, [selectedTaskId, loadMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Search tasks for starting a new conversation
  useEffect(() => {
    if (!showStartNew) return;
    if (taskSearch.trim().length < 2) { setTaskOptions([]); return; }
    const timer = setTimeout(async () => {
      setLoadingTasks(true);
      try {
        const res = await fetch(`/api/tasks?search=${encodeURIComponent(taskSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setTaskOptions((Array.isArray(data) ? data : data.tasks ?? []).slice(0, 8));
        }
      } finally {
        setLoadingTasks(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [taskSearch, showStartNew]);

  const handleSelectConversation = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowStartNew(false);
  };

  const handleSendMessage = async () => {
    if (!selectedTaskId || !newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTaskId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        setNewMessage('');
        await loadConversations();
      }
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
      }
    } finally {
      setStartingSend(false);
    }
  };

  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 lg:p-6 max-lg:pt-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageCircle className="size-6" />
          Conversations
        </h1>
        <Button size="sm" onClick={() => { setShowStartNew(true); setSelectedTaskId(null); }}>
          <Plus className="size-4 mr-1" /> Start New
        </Button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-10rem)]">
        {/* ── Left Panel: Conversation List ──────────────────────────────── */}
        <div className="w-80 shrink-0 flex flex-col border rounded-xl overflow-hidden bg-background">
          {loadingList ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-6">
              <MessageCircle className="size-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Start New" to begin.</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {conversations.map(conv => (
                <button
                  key={conv.taskId}
                  onClick={() => handleSelectConversation(conv.taskId)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/50',
                    selectedTaskId === conv.taskId && 'bg-muted',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm truncate leading-tight">{conv.taskTitle}</span>
                    {conv.lastMessage && (
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(conv.lastMessage.createdAt)}</span>
                    )}
                  </div>

                  {conv.project && (
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                      <Briefcase className="size-3 shrink-0" />
                      <span className="truncate">{conv.project.projectNumber}</span>
                    </div>
                  )}

                  {conv.lastMessage && (
                    <p className="mt-1 text-[11px] text-muted-foreground truncate">
                      <span className="font-medium text-foreground/80">{conv.lastMessage.user.name}:</span>{' '}
                      {conv.lastMessage.content}
                    </p>
                  )}

                  <div className="flex items-center gap-1 mt-1.5">
                    {conv.participants.slice(0, 4).map(p => (
                      <div
                        key={p.id}
                        title={p.name}
                        className="size-4 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary"
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {conv.participants.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">+{conv.participants.length - 4}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right Panel ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col border rounded-xl overflow-hidden bg-background min-w-0">
          {showStartNew ? (
            /* Start New Conversation */
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-5 py-3 border-b">
                <h2 className="font-semibold text-sm">Start New Conversation</h2>
                <button onClick={() => setShowStartNew(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Task Search */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Search for a task</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={taskSearch}
                      onChange={e => { setTaskSearch(e.target.value); setSelectedNewTask(null); }}
                      placeholder="Type task name..."
                      className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {loadingTasks && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />}
                  </div>

                  {taskOptions.length > 0 && !selectedNewTask && (
                    <div className="mt-1 border rounded-lg overflow-hidden bg-background shadow-sm">
                      {taskOptions.map(task => (
                        <button
                          key={task.id}
                          onClick={() => { setSelectedNewTask(task); setTaskSearch(task.title); setTaskOptions([]); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors border-b last:border-0"
                        >
                          <div className="text-sm font-medium truncate">{task.title}</div>
                          {task.project && (
                            <div className="text-xs text-muted-foreground">{task.project.projectNumber} · {task.project.name}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedNewTask && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm">
                      <MessageCircle className="size-4 text-primary shrink-0" />
                      <span className="truncate font-medium">{selectedNewTask.title}</span>
                      <button onClick={() => { setSelectedNewTask(null); setTaskSearch(''); }} className="ml-auto shrink-0">
                        <X className="size-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </div>

                {/* First message */}
                {selectedNewTask && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Your first message</label>
                    <textarea
                      value={firstMessage}
                      onChange={e => setFirstMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStartNewConversation(); } }}
                      placeholder="Type your message..."
                      rows={4}
                      className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
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
            /* Conversation Thread */
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-start justify-between px-5 py-3 border-b shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{selectedConv.taskTitle}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(selectedConv.taskStatus)}`}>
                      {selectedConv.taskStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    {selectedConv.project && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="size-3" />
                        {selectedConv.project.projectNumber} · {selectedConv.project.name}
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
                <Link href={`/tasks/${selectedTaskId}`} className="shrink-0 ml-3">
                  <Button variant="outline" size="sm" className="text-xs">Open Task</Button>
                </Link>
              </div>

              {/* Participants */}
              {participants.length > 0 && (
                <div className="flex items-center gap-2 px-5 py-2 border-b bg-muted/20 shrink-0">
                  <span className="text-xs text-muted-foreground">Participants:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {participants.map(p => (
                      <span key={p.user.id} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {p.user.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {loadingConv ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageCircle className="size-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No messages yet. Start the conversation below.</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.user.id === currentUserId;
                    const showDate = i === 0 || fmtDate(messages[i - 1].createdAt) !== fmtDate(msg.createdAt);
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="text-center my-2">
                            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              {fmtDate(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                          <div className={cn('max-w-[70%] space-y-1')}>
                            {!isMe && (
                              <div className="text-[11px] text-muted-foreground px-1">{msg.user.name}</div>
                            )}
                            <div className={cn(
                              'px-3.5 py-2 rounded-2xl text-sm',
                              isMe
                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                : 'bg-muted rounded-tl-sm',
                            )}>
                              {msg.content}
                            </div>
                            <div className={cn('text-[10px] text-muted-foreground px-1', isMe ? 'text-right' : 'text-left')}>
                              {fmtTime(msg.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="px-4 py-3 border-t shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder="Type a message... (Enter to send)"
                    rows={2}
                    className="flex-1 px-3 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="shrink-0 rounded-xl"
                  >
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <MessageCircle className="size-14 text-muted-foreground/20 mb-4" />
              <p className="font-medium text-muted-foreground">Select a conversation</p>
              <p className="text-sm text-muted-foreground mt-1">Choose from the list on the left, or start a new one.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
