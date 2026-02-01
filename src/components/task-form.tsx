'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Lock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

type User = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  departmentId: string | null;
  department: { id: string; name: string } | null;
};

type Project = {
  id: string;
  projectNumber: string;
  name: string;
};

type Building = {
  id: string;
  designation: string;
  name: string;
  projectId: string;
};

type Department = {
  id: string;
  name: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  assignedToId: string | null;
  projectId: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  isPrivate?: boolean;
};

type TaskFormProps = {
  users: User[];
  projects: Project[];
  buildings?: Building[];
  departments?: Department[];
  task?: Task;
};

export function TaskForm({ users, projects, buildings = [], departments = [], task }: TaskFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(task?.assignedToId || '');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(task?.projectId || '');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [isPrivate, setIsPrivate] = useState(task?.isPrivate || false);
  const [priority, setPriority] = useState(task?.priority || 'Medium');
  const [status, setStatus] = useState(task?.status || 'In Progress');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      description: (formData.get('description') as string) || null,
      assignedToId: (formData.get('assignedToId') as string) || null,
      projectId: (formData.get('projectId') as string) || null,
      buildingId: (formData.get('buildingId') as string) || null,
      departmentId: (formData.get('departmentId') as string) || null,
      taskInputDate: (formData.get('taskInputDate') as string) || null,
      dueDate: formData.get('dueDate') as string,
      priority: formData.get('priority') as string,
      status: formData.get('status') as string,
      isPrivate: isPrivate,
    };

    try {
      const url = task ? `/api/tasks/${task.id}` : '/api/tasks';
      const method = task ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save task');

      router.push('/tasks');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Task Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="Enter task title"
              defaultValue={task?.title || ''}
              required
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Enter task description..."
              defaultValue={task?.description || ''}
              disabled={loading}
              rows={4}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Assign To */}
            <div className="space-y-2">
              <Label htmlFor="assignedToId">Assign To</Label>
              <select
                id="assignedToId"
                name="assignedToId"
                value={selectedUserId}
                onChange={(e) => {
                  const userId = e.target.value;
                  setSelectedUserId(userId);
                  const selectedUser = users.find(u => u.id === userId);
                  if (selectedUser?.departmentId) {
                    setSelectedDepartmentId(selectedUser.departmentId);
                  }
                }}
                disabled={loading}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} {user.position && `(${user.position})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div className="space-y-2">
              <Label htmlFor="projectId">Project (Optional)</Label>
              <select
                id="projectId"
                name="projectId"
                value={selectedProjectId}
                onChange={(e) => {
                  const newProjectId = e.target.value;
                  setSelectedProjectId(newProjectId);
                  setSelectedBuildingId(''); // Reset building when project changes
                }}
                disabled={loading}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                <option value="">No Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectNumber} - {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">
                Priority <span className="text-destructive">*</span>
              </Label>
              <select
                id="priority"
                name="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                required
                disabled={loading}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-destructive">*</span>
              </Label>
              <select
                id="status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
                disabled={loading}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting for Approval">Waiting for Approval</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Building */}
            <div className="space-y-2">
              <Label htmlFor="buildingId">Building (Optional)</Label>
              <select
                id="buildingId"
                name="buildingId"
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                disabled={loading || !selectedProjectId}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                <option value="">{selectedProjectId ? 'No Building' : 'Select Project First'}</option>
                {buildings
                  .filter(building => !selectedProjectId || building.projectId === selectedProjectId)
                  .map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.designation} - {building.name}
                    </option>
                  ))}
              </select>
              {!selectedProjectId && (
                <p className="text-xs text-muted-foreground">
                  Please select a project first to see available buildings
                </p>
              )}
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="departmentId">Department (Optional)</Label>
              <select
                id="departmentId"
                name="departmentId"
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                disabled={loading}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                <option value="">No Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Task Input Date */}
            <div className="space-y-2">
              <Label htmlFor="taskInputDate">Task Input Date</Label>
              <Input
                id="taskInputDate"
                name="taskInputDate"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                disabled={loading}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">
                Due Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={task?.dueDate ? task.dueDate.split('T')[0] : ''}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Private Task */}
          <div className="flex items-center space-x-3 p-4 rounded-lg border bg-muted/50">
            <Checkbox
              id="isPrivate"
              checked={isPrivate}
              onCheckedChange={(checked) => setIsPrivate(checked === true)}
              disabled={loading}
            />
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-muted-foreground" />
              <Label htmlFor="isPrivate" className="cursor-pointer">
                Private Task
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-auto">
              Only you and the assigned user can see this task
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin mr-2" />}
              {task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
