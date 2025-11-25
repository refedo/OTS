'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2, Calendar, User, Briefcase, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Task = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  assignedTo: { id: string; name: string; email: string; position: string | null } | null;
  createdBy: { id: string; name: string; email: string };
  project: { id: string; projectNumber: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
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
  userRole: string;
  userId: string;
};

export function TaskDetails({ task, userRole, userId }: TaskDetailsProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  const canEdit = ['Admin', 'Manager'].includes(userRole);
  const canDelete = userRole === 'Admin';
  const isAssignedUser = task.assignedTo?.id === userId;

  const formatDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'Completed') return false;
    return new Date(dueDate) < new Date();
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      router.refresh();
    } catch (error) {
      alert('Failed to update task status');
    } finally {
      setUpdating(false);
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
          </div>
        </div>

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

            {/* Quick Status Update (for assigned users) */}
            {isAssignedUser && task.status !== 'Completed' && (
              <Card>
                <CardHeader>
                  <CardTitle>Update Status</CardTitle>
                </CardHeader>
                <CardContent>
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
                        onClick={() => handleStatusUpdate('Completed')}
                        disabled={updating}
                        className="flex-1"
                      >
                        <CheckCircle2 className="size-4 mr-2" />
                        Mark as Completed
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
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
          </div>
        </div>
      </div>
    </main>
  );
}
