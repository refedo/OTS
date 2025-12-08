'use client';

import { useState } from 'react';
import { TasksOverviewResponse } from '@/lib/types/project-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw, ListTodo, Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface TasksOverviewWidgetProps {
  data: TasksOverviewResponse;
  onRefresh?: () => void;
  projectId: string;
  canCreateTask?: boolean;
}

export function TasksOverviewWidget({ data, onRefresh, projectId, canCreateTask }: TasksOverviewWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filter, setFilter] = useState<'all' | 'my-tasks' | 'non-completed' | 'completed'>('all');

  const formatDate = (date: Date | null) => {
    if (!date) return 'No deadline';
    const d = new Date(date);
    const now = new Date();
    const isOverdue = d < now;
    
    const formatted = d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    
    return isOverdue ? (
      <span className="text-red-600 dark:text-red-400 font-medium">{formatted}</span>
    ) : (
      formatted
    );
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Low':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'In Progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Pending':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ListTodo className="size-5" />
            Tasks Overview
          </CardTitle>
          <div className="flex items-center gap-2">
            {canCreateTask && (
              <Button variant="outline" size="sm">
                <Plus className="size-4 mr-2" />
                Add Task
              </Button>
            )}
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronUp className="size-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-2 mt-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{data.total}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-500/10">
            <p className="text-xs text-green-700 dark:text-green-400">Completed</p>
            <p className="text-lg font-semibold text-green-700 dark:text-green-400">
              {data.completed}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-500/10">
            <p className="text-xs text-blue-700 dark:text-blue-400">In Progress</p>
            <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
              {data.inProgress}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-500/10">
            <p className="text-xs text-gray-700 dark:text-gray-400">Pending</p>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-400">
              {data.pending}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-500/10">
            <p className="text-xs text-red-700 dark:text-red-400">Overdue</p>
            <p className="text-lg font-semibold text-red-700 dark:text-red-400">
              {data.overdue}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'my-tasks' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('my-tasks')}
          >
            My Tasks
          </Button>
          <Button
            variant={filter === 'non-completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('non-completed')}
          >
            Non-Completed
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
          >
            Completed
          </Button>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No tasks found for this project
                    </TableCell>
                  </TableRow>
                ) : (
                  data.tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium max-w-xs">
                        <div className="truncate">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {task.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.assignedTo ? task.assignedTo.name : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.buildingName || (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(task.status)}>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityBadge(task.priority)}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(task.dueDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
