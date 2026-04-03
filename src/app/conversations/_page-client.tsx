'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionValidator } from '@/hooks/use-session-validator';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Building2, Briefcase, Loader2 } from 'lucide-react';
import Link from 'next/link';

type Conversation = {
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  project: { id: string; projectNumber: string; name: string } | null;
  building: { id: string; name: string; designation: string } | null;
  lastMessage: { content: string; createdAt: string; user: { id: string; name: string } } | null;
  participants: { id: string; name: string }[];
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusColor(status: string) {
  switch (status) {
    case 'Completed': return 'bg-emerald-100 text-emerald-700';
    case 'In Progress': return 'bg-blue-100 text-blue-700';
    case 'Pending': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export default function ConversationsPage() {
  const { isValidating } = useSessionValidator();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/conversations')
      .then(r => r.ok ? r.json() : [])
      .then(setConversations)
      .finally(() => setLoading(false));
  }, []);

  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="min-h-screen p-6 lg:p-8 max-lg:pt-20 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <MessageCircle className="size-8" />
          Conversations
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Task conversations you are participating in
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageCircle className="size-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No conversations yet.</p>
            <p className="text-muted-foreground text-sm mt-1">
              Open any task and start a conversation to see it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map(conv => (
            <Link key={conv.taskId} href={`/tasks/${conv.taskId}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{conv.taskTitle}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(conv.taskStatus)}`}>
                          {conv.taskStatus}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {conv.project && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="size-3" />
                            {conv.project.projectNumber} · {conv.project.name}
                          </span>
                        )}
                        {conv.building && (
                          <span className="flex items-center gap-1">
                            <Building2 className="size-3" />
                            {conv.building.name || conv.building.designation}
                          </span>
                        )}
                      </div>

                      {conv.lastMessage && (
                        <p className="mt-2 text-sm text-muted-foreground truncate">
                          <span className="font-medium text-foreground">{conv.lastMessage.user.name}:</span>{' '}
                          {conv.lastMessage.content}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex -space-x-1.5">
                          {conv.participants.slice(0, 5).map(p => (
                            <div
                              key={p.id}
                              title={p.name}
                              className="size-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary"
                            >
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {conv.participants.length > 5 && (
                            <div className="size-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                              +{conv.participants.length - 5}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {conv.participants.length} participant{conv.participants.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {conv.lastMessage && (
                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                        {timeAgo(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
