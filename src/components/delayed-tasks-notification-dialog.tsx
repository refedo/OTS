'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  Info,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface DelayedTask {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  status: string;
  delayDays: number;
  delayStatus: 'critical' | 'warning' | 'minor';
  assignedTo: { id: string; name: string; email: string } | null;
  project: { projectNumber: string; name: string } | null;
  createdBy: { name: string } | null;
}

interface DelayedTasksData {
  tasks: DelayedTask[];
  total: number;
  critical: number;
  warning: number;
  minor: number;
}

export function DelayedTasksNotificationDialog() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DelayedTasksData | null>(null);

  useEffect(() => {
    checkDelayedTasks();
  }, []);

  const checkDelayedTasks = async () => {
    try {
      // Only show once per session (not on every page navigation)
      const sessionKey = 'delayed_tasks_prompt_shown';
      if (sessionStorage.getItem(sessionKey)) {
        return;
      }

      const response = await fetch('/api/notifications/delayed-tasks?personal=true');
      if (!response.ok) return;

      const result: DelayedTasksData = await response.json();

      if (result.total > 0) {
        setData(result);
        setOpen(true);
        sessionStorage.setItem(sessionKey, 'true');
      }
    } catch {
      // Silently fail - this is a non-critical notification
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleViewTasks = () => {
    setOpen(false);
    window.location.href = '/notifications?tab=delayed-tasks';
  };

  if (!data) return null;

  const getDelayIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertOctagon className="size-4 text-red-600 flex-shrink-0" />;
      case 'warning': return <AlertCircle className="size-4 text-amber-600 flex-shrink-0" />;
      default: return <Info className="size-4 text-blue-600 flex-shrink-0" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-700 bg-red-50';
      case 'Medium': return 'text-amber-700 bg-amber-50';
      default: return 'text-blue-700 bg-blue-50';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-amber-600 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">Attention Required</DialogTitle>
              <DialogDescription className="mt-1">
                You have <span className="font-semibold text-red-600">{data.total}</span> delayed
                task{data.total !== 1 ? 's' : ''} that need{data.total === 1 ? 's' : ''} your attention
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Severity Summary */}
        <div className="grid grid-cols-3 gap-3 py-2">
          {data.critical > 0 && (
            <div className="flex flex-col items-center p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertOctagon className="size-5 text-red-600 mb-1" />
              <p className="text-xl font-bold text-red-700">{data.critical}</p>
              <p className="text-xs text-red-600 font-medium">Critical</p>
              <p className="text-xs text-muted-foreground">7+ days late</p>
            </div>
          )}
          {data.warning > 0 && (
            <div className="flex flex-col items-center p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="size-5 text-amber-600 mb-1" />
              <p className="text-xl font-bold text-amber-700">{data.warning}</p>
              <p className="text-xs text-amber-600 font-medium">Warning</p>
              <p className="text-xs text-muted-foreground">3-7 days late</p>
            </div>
          )}
          {data.minor > 0 && (
            <div className="flex flex-col items-center p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Info className="size-5 text-blue-600 mb-1" />
              <p className="text-xl font-bold text-blue-700">{data.minor}</p>
              <p className="text-xs text-blue-600 font-medium">Minor</p>
              <p className="text-xs text-muted-foreground">1-3 days late</p>
            </div>
          )}
        </div>

        {/* Task List */}
        <ScrollArea className="max-h-[calc(85vh-320px)]">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Most Overdue Tasks
            </p>
            {data.tasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                {getDelayIcon(task.delayStatus)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <Badge variant="destructive" className="text-xs">
                      <Clock className="size-3 mr-1" />
                      {task.delayDays}d overdue
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    {task.project && (
                      <span>{task.project.projectNumber} - {task.project.name}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {data.total > 5 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                and {data.total - 5} more delayed task{data.total - 5 !== 1 ? 's' : ''}...
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="ghost" onClick={handleClose}>
            Remind me later
          </Button>
          <Button onClick={handleViewTasks} className="gap-2">
            View All Delayed Tasks
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
