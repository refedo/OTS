'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSessionValidator } from '@/hooks/use-session-validator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showConfirmation } from '@/components/ui/confirmation-dialog';
import { ArrowLeft, Plus, Calendar, CheckCircle, AlertCircle, Target, Layers } from 'lucide-react';

interface BacklogItem {
  id: string;
  code: string;
  title: string;
  description: string;
  type: string;
  category: string;
  businessReason: string;
  expectedValue: string | null;
  priority: string;
  status: string;
  affectedModules: string[];
  riskLevel: string;
  complianceFlag: boolean;
  linkedObjectiveId: string | null;
  linkedKpiId: string | null;
  createdAt: string;
  approvedAt: string | null;
  plannedAt: string | null;
  completedAt: string | null;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    assignedTo: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
}

export default function BacklogItemDetail() {
  const { isValidating } = useSessionValidator();
  const router = useRouter();
  const params = useParams();
  const [item, setItem] = useState<BacklogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
  });
  const [creatingTask, setCreatingTask] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchBacklogItem();
    }
  }, [params.id]);

  const fetchBacklogItem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/backlog/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setItem(data);
      } else {
        router.push('/backlog');
      }
    } catch (error) {
      console.error('Error fetching backlog item:', error);
      router.push('/backlog');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!item) return;

    try {
      const response = await fetch(`/api/backlog/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        showConfirmation({
          type: 'success',
          title: 'Status Updated',
          message: 'Backlog item status updated successfully!',
        });
        fetchBacklogItem();
      } else {
        const error = await response.json();
        showConfirmation({
          type: 'error',
          title: 'Update Failed',
          message: error.error || 'Failed to update status',
        });
      }
    } catch (error) {
      showConfirmation({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update status',
      });
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!item) return;

    try {
      const response = await fetch(`/api/backlog/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (response.ok) {
        showConfirmation({
          type: 'success',
          title: 'Priority Updated',
          message: 'Backlog item priority updated successfully!',
        });
        fetchBacklogItem();
      } else {
        const error = await response.json();
        showConfirmation({
          type: 'error',
          title: 'Update Failed',
          message: error.error || 'Failed to update priority',
        });
      }
    } catch (error) {
      showConfirmation({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update priority',
      });
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setCreatingTask(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskFormData.title,
          description: taskFormData.description,
          priority: taskFormData.priority,
          backlogItemId: item.id,
        }),
      });

      if (response.ok) {
        showConfirmation({
          type: 'success',
          title: 'Task Created',
          message: 'Task created and linked to backlog item successfully!',
        });
        setShowTaskForm(false);
        setTaskFormData({ title: '', description: '', priority: 'MEDIUM' });
        fetchBacklogItem();
      } else {
        const error = await response.json();
        showConfirmation({
          type: 'error',
          title: 'Creation Failed',
          message: error.error || 'Failed to create task',
        });
      }
    } catch (error) {
      showConfirmation({
        type: 'error',
        title: 'Creation Failed',
        message: 'Failed to create task',
      });
    } finally {
      setCreatingTask(false);
    }
  };

  if (isValidating || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading backlog item...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!item) {
    return null;
  }

  const isApproved = ['APPROVED', 'PLANNED', 'IN_PROGRESS', 'COMPLETED'].includes(item.status);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CORE_SYSTEM': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'PRODUCTION': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'DESIGN': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'DETAILING': return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'PROCUREMENT': return 'bg-green-100 text-green-800 border-green-300';
      case 'QC': return 'bg-red-100 text-red-800 border-red-300';
      case 'LOGISTICS': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'FINANCE': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'REPORTING': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'AI': return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'GOVERNANCE': return 'bg-slate-100 text-slate-800 border-slate-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'FEATURE': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'BUG': return 'bg-red-100 text-red-800 border-red-300';
      case 'TECH_DEBT': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'PERFORMANCE': return 'bg-green-100 text-green-800 border-green-300';
      case 'REPORTING': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'REFACTOR': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'COMPLIANCE': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'INSIGHT': return 'bg-pink-100 text-pink-800 border-pink-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IDEA': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'UNDER_REVIEW': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-300';
      case 'PLANNED': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'IN_PROGRESS': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'BLOCKED': return 'bg-red-100 text-red-800 border-red-300';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DROPPED': return 'bg-slate-100 text-slate-500 border-slate-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
        {/* Header */}
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/backlog')}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            Back to Backlog
          </Button>
          
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold tracking-tight">{item.code}</h1>
                <Badge variant={item.priority === 'CRITICAL' ? 'destructive' : item.priority === 'HIGH' ? 'default' : 'secondary'}>
                  {item.priority}
                </Badge>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(item.status)}`}>
                  {item.status.replace('_', ' ')}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(item.type)}`}>
                  {item.type.replace('_', ' ')}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(item.category)}`}>
                  {item.category.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xl text-muted-foreground">{item.title}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* WHY Section */}
            <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="size-5" />
                  WHY This Exists
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{item.businessReason}</p>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{item.description}</p>
              </CardContent>
            </Card>


            {/* Linked Tasks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Layers className="size-5" />
                  Linked Tasks ({item.tasks.length})
                </CardTitle>
                {isApproved && (
                  <Button
                    onClick={() => setShowTaskForm(!showTaskForm)}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="size-4" />
                    Create Task
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {showTaskForm && (
                  <form onSubmit={handleCreateTask} className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-2">
                      <Label htmlFor="taskTitle">Task Title *</Label>
                      <Input
                        id="taskTitle"
                        value={taskFormData.title}
                        onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                        placeholder="Enter task title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taskDescription">Description</Label>
                      <Textarea
                        id="taskDescription"
                        value={taskFormData.description}
                        onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                        placeholder="Enter task description"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taskPriority">Priority</Label>
                      <Select
                        value={taskFormData.priority}
                        onValueChange={(value) => setTaskFormData({ ...taskFormData, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={creatingTask}>
                        {creatingTask ? 'Creating...' : 'Create Task'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowTaskForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                {item.tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="size-12 mx-auto mb-3 opacity-50" />
                    <p>No tasks linked to this backlog item yet.</p>
                    {!isApproved && (
                      <p className="text-sm mt-2">Tasks can only be created after approval.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {item.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{task.title}</div>
                          {task.assignedTo && (
                            <div className="text-sm text-muted-foreground mt-1">
                              Assigned to: {task.assignedTo.name}
                            </div>
                          )}
                        </div>
                        <Badge variant={task.status === 'Completed' ? 'default' : 'secondary'}>
                          {task.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="size-5" />
                  Status Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-muted-foreground">Created:</div>
                  <div>{new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
                {item.approvedAt && (
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-muted-foreground">Approved:</div>
                    <div>{new Date(item.approvedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                )}
                {item.plannedAt && (
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-muted-foreground">Planned:</div>
                    <div>{new Date(item.plannedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                )}
                {item.completedAt && (
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-muted-foreground">Completed:</div>
                    <div>{new Date(item.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Change Status</Label>
                  <Select value={item.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IDEA">Idea</SelectItem>
                      <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="PLANNED">Planned</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="BLOCKED">Blocked</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="DROPPED">Dropped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Change Priority</Label>
                  <Select value={item.priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Risk Level</div>
                  <div className="mt-1">{item.riskLevel}</div>
                </div>
                {item.complianceFlag && (
                  <Badge variant="secondary">Compliance Required</Badge>
                )}
              </CardContent>
            </Card>

            {/* Affected Modules */}
            <Card>
              <CardHeader>
                <CardTitle>Affected Modules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {item.affectedModules.map((module, index) => (
                    <Badge key={index} variant="outline">
                      {module}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="size-5" />
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasks Completed</span>
                  <span className="font-medium">
                    {item.tasks.filter(t => t.status === 'Completed').length} / {item.tasks.length}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: item.tasks.length > 0
                        ? `${(item.tasks.filter(t => t.status === 'Completed').length / item.tasks.length) * 100}%`
                        : '0%'
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
