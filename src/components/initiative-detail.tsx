'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Target, 
  Calendar,
  DollarSign,
  Users,
  Building2,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

type Initiative = {
  id: string;
  initiativeNumber: string;
  name: string;
  category: string | null;
  description: string | null;
  objective: string | null;
  status: string;
  priority: string;
  progress: number | null;
  startDate: string | null;
  endDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  budget: number | null;
  notes: string | null;
  owner: { id: string; name: string; email: string; position: string | null };
  department: { id: string; name: string } | null;
  creator: { id: string; name: string; email: string };
  updater: { id: string; name: string; email: string };
  milestones: Array<{
    id: string;
    name: string;
    status: string;
    progress: number | null;
    plannedDate: string | null;
    actualDate: string | null;
    responsible: { id: string; name: string; email: string } | null;
  }>;
  tasks: Array<{
    id: string;
    taskName: string;
    status: string;
    progress: number | null;
    startDate: string | null;
    endDate: string | null;
    assignedUser: { id: string; name: string; email: string } | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

type InitiativeDetailProps = {
  initiative: Initiative;
  userRole: string;
  userId: string;
};

const statusColors = {
  Planned: 'bg-gray-100 text-gray-800 border-gray-300',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
  'On Hold': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Completed: 'bg-green-100 text-green-800 border-green-300',
  Cancelled: 'bg-red-100 text-red-800 border-red-300',
  Pending: 'bg-gray-100 text-gray-800 border-gray-300',
  Delayed: 'bg-red-100 text-red-800 border-red-300',
};

const priorityColors = {
  Low: 'bg-gray-100 text-gray-800 border-gray-300',
  Medium: 'bg-orange-100 text-orange-800 border-orange-300',
  High: 'bg-red-100 text-red-800 border-red-300',
  Critical: 'bg-purple-100 text-purple-800 border-purple-300',
};

export function InitiativeDetail({ initiative, userRole, userId }: InitiativeDetailProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const canManage = ['Admin', 'Manager'].includes(userRole);
  const canDelete = userRole === 'Admin';

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this initiative? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/initiatives/${initiative.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete initiative');

      router.push('/initiatives');
      router.refresh();
    } catch (error) {
      alert('Failed to delete initiative');
      setDeleting(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const completedMilestones = initiative.milestones.filter(m => m.status === 'Completed').length;
  const completedTasks = initiative.tasks.filter(t => t.status === 'Completed').length;

  return (
    <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/initiatives">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{initiative.name}</h1>
                <p className="text-muted-foreground">{initiative.initiativeNumber}</p>
              </div>
            </div>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/initiatives/${initiative.id}/edit`}>
                <Edit className="size-4 mr-2" />
                Edit
              </Link>
            </Button>
            {canDelete && (
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="size-4 mr-2" />
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className={`mt-2 ${statusColors[initiative.status as keyof typeof statusColors]}`}
                >
                  {initiative.status}
                </Badge>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Priority</p>
                <Badge
                  variant="outline"
                  className={`mt-2 ${priorityColors[initiative.priority as keyof typeof priorityColors]}`}
                >
                  {initiative.priority}
                </Badge>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold mt-1">{Math.round(initiative.progress || 0)}%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Budget</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(initiative.budget)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {initiative.category && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <p className="mt-1">{initiative.category}</p>
                </div>
              )}

              {initiative.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="mt-1 text-sm">{initiative.description}</p>
                </div>
              )}

              {initiative.objective && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Objective</p>
                  <p className="mt-1 text-sm">{initiative.objective}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Overall Progress</p>
                <Progress value={initiative.progress || 0} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Milestones ({completedMilestones}/{initiative.milestones.length})</CardTitle>
                {canManage && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/initiatives/${initiative.id}/milestones`}>
                      Manage
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {initiative.milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground">No milestones yet</p>
              ) : (
                <div className="space-y-3">
                  {initiative.milestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{milestone.name}</p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${statusColors[milestone.status as keyof typeof statusColors]}`}
                          >
                            {milestone.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>Planned: {formatDate(milestone.plannedDate)}</span>
                          {milestone.actualDate && (
                            <span>Actual: {formatDate(milestone.actualDate)}</span>
                          )}
                          {milestone.responsible && (
                            <span>Responsible: {milestone.responsible.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <Progress value={milestone.progress || 0} className="w-24 h-2" />
                        <p className="text-xs text-center mt-1">{Math.round(milestone.progress || 0)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tasks ({completedTasks}/{initiative.tasks.length})</CardTitle>
                {canManage && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/initiatives/${initiative.id}/tasks`}>
                      Manage
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {initiative.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks yet</p>
              ) : (
                <div className="space-y-2">
                  {initiative.tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{task.taskName}</p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${statusColors[task.status as keyof typeof statusColors]}`}
                          >
                            {task.status}
                          </Badge>
                        </div>
                        {task.assignedUser && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Assigned to: {task.assignedUser.name}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        <Progress value={task.progress || 0} className="w-20 h-2" />
                        <p className="text-xs text-center mt-1">{Math.round(task.progress || 0)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {initiative.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{initiative.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Owner</p>
                  <p className="text-sm text-muted-foreground">{initiative.owner.name}</p>
                  {initiative.owner.position && (
                    <p className="text-xs text-muted-foreground">{initiative.owner.position}</p>
                  )}
                </div>
              </div>

              {initiative.department && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Department</p>
                    <p className="text-sm text-muted-foreground">{initiative.department.name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Timeline</p>
                  <p className="text-sm text-muted-foreground">
                    Start: {formatDate(initiative.startDate)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    End: {formatDate(initiative.endDate)}
                  </p>
                </div>
              </div>

              {(initiative.actualStartDate || initiative.actualEndDate) && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Actual Dates</p>
                    {initiative.actualStartDate && (
                      <p className="text-sm text-muted-foreground">
                        Started: {formatDate(initiative.actualStartDate)}
                      </p>
                    )}
                    {initiative.actualEndDate && (
                      <p className="text-sm text-muted-foreground">
                        Ended: {formatDate(initiative.actualEndDate)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Info */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">Created by</p>
                <p className="font-medium">{initiative.creator.name}</p>
                <p className="text-xs text-muted-foreground">{formatDate(initiative.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last updated by</p>
                <p className="font-medium">{initiative.updater.name}</p>
                <p className="text-xs text-muted-foreground">{formatDate(initiative.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
