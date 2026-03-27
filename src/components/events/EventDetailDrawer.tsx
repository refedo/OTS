'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCheck,
  Clock,
  Copy,
  FolderOpen,
  Hash,
  Info,
  Layers,
  Tag,
  Terminal,
  User,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { SEVERITY_COLORS, CATEGORY_COLORS } from '@/types/system-events';
import type { EventCategory, EventSeverity } from '@/types/system-events';

export interface SystemEventDetail {
  id: string;
  eventType: string;
  eventCategory: string | null;
  category: string;
  severity: EventSeverity;
  title: string;
  summary: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
  changedFields: Record<string, { old: unknown; new: unknown }> | null;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  user: { id: string; name: string } | null;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  projectId: string | null;
  projectNumber: string | null;
  buildingId: string | null;
  project: { id: string; projectNumber: string; name: string } | null;
  createdAt: string;
  duration: number | null;
  correlationId: string | null;
  parentEventId: string | null;
  sessionId: string | null;
}

interface EventDetailDrawerProps {
  event: SystemEventDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilterCorrelation?: (correlationId: string) => void;
}

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  INFO: <Info className="size-3.5" />,
  WARNING: <AlertTriangle className="size-3.5" />,
  ERROR: <XCircle className="size-3.5" />,
  CRITICAL: <AlertCircle className="size-3.5" />,
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function SectionHeading({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
      {icon}
      {label}
    </h4>
  );
}

export function EventDetailDrawer({
  event,
  open,
  onOpenChange,
  onFilterCorrelation,
}: EventDetailDrawerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (!event) return null;

  const displayCategory = event.eventCategory ?? event.category;
  const actorName = event.user?.name ?? event.userName;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={
                SEVERITY_COLORS[event.severity] ??
                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }
            >
              <span className="flex items-center gap-1">
                {SEVERITY_ICONS[event.severity]}
                {event.severity}
              </span>
            </Badge>

            {displayCategory && (
              <Badge
                variant="outline"
                className={
                  CATEGORY_COLORS[displayCategory as EventCategory] ??
                  'bg-gray-100 text-gray-700'
                }
              >
                {displayCategory}
              </Badge>
            )}

            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
              {event.eventType}
            </code>
          </div>

          <SheetTitle className="text-base mt-2 leading-snug">
            {event.title}
          </SheetTitle>

          <SheetDescription className="text-xs text-muted-foreground flex items-center gap-2">
            <Clock className="size-3 shrink-0" />
            {formatDateTime(event.createdAt)}
            {event.duration != null && (
              <span className="text-muted-foreground/60">
                · {formatDuration(event.duration)}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Body */}
        <ScrollArea className="flex-1 px-6 py-5">
          <div className="space-y-5">
            {/* Actor */}
            {actorName && (
              <section>
                <SectionHeading icon={<User className="size-3.5" />} label="Actor" />
                <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-0.5">
                  <div className="font-medium">{actorName}</div>
                  {event.userRole && (
                    <div className="text-muted-foreground text-xs">{event.userRole}</div>
                  )}
                  {event.ipAddress && (
                    <div className="text-muted-foreground text-xs font-mono">
                      {event.ipAddress}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Entity */}
            {(event.entityType || event.entityName || event.entityId) && (
              <section>
                <SectionHeading icon={<Tag className="size-3.5" />} label="Entity" />
                <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-0.5">
                  {event.entityType && (
                    <div className="text-muted-foreground text-xs">{event.entityType}</div>
                  )}
                  {event.entityName && (
                    <div className="font-medium">{event.entityName}</div>
                  )}
                  {event.entityId && (
                    <div className="text-muted-foreground text-xs font-mono flex items-center gap-1.5 mt-1">
                      <span className="truncate">{event.entityId}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-5 shrink-0"
                        onClick={() => copy(event.entityId!, 'entityId')}
                      >
                        {copiedId === 'entityId' ? (
                          <CheckCheck className="size-3 text-green-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Project */}
            {(event.project || event.projectNumber) && (
              <section>
                <SectionHeading
                  icon={<FolderOpen className="size-3.5" />}
                  label="Project"
                />
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <span className="font-medium">
                    {event.project?.projectNumber ?? event.projectNumber}
                  </span>
                  {event.project?.name && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      {event.project.name}
                    </span>
                  )}
                </div>
              </section>
            )}

            {/* Changed Fields */}
            {event.changedFields &&
              Object.keys(event.changedFields).length > 0 && (
                <section>
                  <SectionHeading
                    icon={<Layers className="size-3.5" />}
                    label="Changed Fields"
                  />
                  <div className="rounded-lg border overflow-hidden text-xs">
                    <table className="w-full">
                      <thead className="bg-muted/60">
                        <tr>
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            Field
                          </th>
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            Before
                          </th>
                          <th className="p-2 text-muted-foreground w-4" />
                          <th className="text-left p-2 font-medium text-muted-foreground">
                            After
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(event.changedFields).map(
                          ([field, change]) => (
                            <tr key={field} className="border-t">
                              <td className="p-2 font-mono text-muted-foreground">
                                {field}
                              </td>
                              <td className="p-2 max-w-[140px] truncate text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20">
                                {change.old == null ? (
                                  <em className="opacity-60">null</em>
                                ) : (
                                  String(change.old)
                                )}
                              </td>
                              <td className="p-2 text-center">
                                <ArrowRight className="size-3 text-muted-foreground" />
                              </td>
                              <td className="p-2 max-w-[140px] truncate text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20">
                                {change.new == null ? (
                                  <em className="opacity-60">null</em>
                                ) : (
                                  String(change.new)
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

            {/* Details */}
            {event.details && Object.keys(event.details).length > 0 && (
              <section>
                <SectionHeading
                  icon={<Terminal className="size-3.5" />}
                  label="Details"
                />
                <pre className="text-xs bg-muted/70 rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                  {JSON.stringify(event.details, null, 2)}
                </pre>
              </section>
            )}

            {/* Metadata */}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <section>
                <SectionHeading
                  icon={<Hash className="size-3.5" />}
                  label="Metadata"
                />
                <pre className="text-xs bg-muted/70 rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </section>
            )}

            {/* Correlation */}
            {event.correlationId && (
              <section>
                <SectionHeading
                  icon={<Hash className="size-3.5" />}
                  label="Correlation Group"
                />
                <div className="rounded-lg bg-muted/50 p-3 text-sm flex items-center justify-between gap-2">
                  <code className="font-mono text-xs text-muted-foreground truncate">
                    {event.correlationId}
                  </code>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => copy(event.correlationId!, 'corrId')}
                    >
                      {copiedId === 'corrId' ? (
                        <CheckCheck className="size-3.5 text-green-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                    {onFilterCorrelation && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          onFilterCorrelation(event.correlationId!);
                          onOpenChange(false);
                        }}
                      >
                        View group
                      </Button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Footer meta */}
            <section>
              <Separator className="mb-4" />
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Event ID</span>
                  <div className="flex items-center gap-1 font-mono">
                    <span>
                      {event.id.slice(0, 8)}…{event.id.slice(-4)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-5"
                      onClick={() => copy(event.id, 'eventId')}
                    >
                      {copiedId === 'eventId' ? (
                        <CheckCheck className="size-3 text-green-500" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </Button>
                  </div>
                </div>
                {event.sessionId && (
                  <div className="flex items-center justify-between">
                    <span>Session</span>
                    <span className="font-mono">{event.sessionId.slice(0, 16)}…</span>
                  </div>
                )}
                {event.userAgent && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="shrink-0">User Agent</span>
                    <span className="text-right truncate max-w-[240px]" title={event.userAgent}>
                      {event.userAgent}
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
