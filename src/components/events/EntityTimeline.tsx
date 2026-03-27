'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, ChevronDown, Clock } from 'lucide-react';
import type { EventSeverity } from '@/types/system-events';
import { EventDetailDrawer, type SystemEventDetail } from './EventDetailDrawer';

interface EntityTimelineProps {
  entityType: string;
  entityId: string;
  projectId?: string;
  limit?: number;
  className?: string;
}

const DOT_COLOR: Record<EventSeverity, string> = {
  INFO: 'border-blue-400',
  WARNING: 'border-yellow-500',
  ERROR: 'border-red-500',
  CRITICAL: 'border-red-600',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function EntityTimeline({
  entityType,
  entityId,
  projectId,
  limit = 10,
  className,
}: EntityTimelineProps) {
  const [events, setEvents] = useState<SystemEventDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [selected, setSelected] = useState<SystemEventDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    load(0, true);
  }, [entityType, entityId]);

  async function load(offset: number, replace: boolean) {
    replace ? setLoading(true) : setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        entityType,
        entityId,
        limit: String(limit),
        offset: String(offset),
      });
      if (projectId) params.set('projectId', projectId);

      const res = await fetch(`/api/system-events?${params}`);
      if (res.ok) {
        const data = await res.json();
        const incoming = (data.events ?? []) as SystemEventDetail[];
        setEvents(prev => (replace ? incoming : [...prev, ...incoming]));
        setTotal(data.total ?? 0);
        setNextOffset(offset + limit);
      }
    } finally {
      replace ? setLoading(false) : setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <div className={className}>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-3.5 rounded-full mt-0.5 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Activity className="size-6 mx-auto mb-2 opacity-40" />
          No events recorded
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-[6px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-3">
          {events.map(event => (
            <div
              key={event.id}
              className="flex gap-3 cursor-pointer group"
              onClick={() => {
                setSelected(event);
                setDrawerOpen(true);
              }}
            >
              {/* Timeline dot */}
              <div
                className={`size-3.5 rounded-full border-2 bg-background shrink-0 mt-0.5 z-10 transition-transform group-hover:scale-125 ${DOT_COLOR[event.severity] ?? 'border-border'}`}
              />

              {/* Content */}
              <div className="flex-1 pb-2 min-w-0">
                <p className="text-sm leading-snug truncate group-hover:text-primary transition-colors">
                  {event.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  {(event.eventCategory ?? event.category) && (
                    <span>{event.eventCategory ?? event.category}</span>
                  )}
                  {event.userName && (
                    <span>· {event.userName}</span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Clock className="size-2.5" />
                    {relativeTime(event.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {total > events.length && (
        <div className="mt-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            disabled={loadingMore}
            onClick={() => load(nextOffset, false)}
          >
            {loadingMore ? (
              'Loading…'
            ) : (
              <>
                <ChevronDown className="size-3 mr-1" />
                {total - events.length} more
              </>
            )}
          </Button>
        </div>
      )}

      <EventDetailDrawer
        event={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
