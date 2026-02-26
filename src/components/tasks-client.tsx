'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Plus, LayoutGrid, List, MoreVertical, Eye, Edit, Trash2, Calendar, User, AlertCircle, CheckSquare, Square, Loader2, Lock, ArrowUpDown, ArrowUp, ArrowDown, Copy, FolderTree, ChevronDown, ChevronRight, ShieldCheck, Shield, X, Sparkles, XCircle, ShieldX, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAlert } from '@/hooks/useAlert';

type Task = {
  id: string;
  title: string;
  description: string | null;
  taskInputDate: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  isPrivate: boolean;
  assignedTo: { id: string; name: string; email: string; position: string | null } | null;
  createdBy: { id: string; name: string; email: string };
  requester: { id: string; name: string; email: string } | null;
  releaseDate: string | null;
  project: { id: string; projectNumber: string; name: string } | null;
  building: { id: string; designation: string; name: string } | null;
  department: { id: string; name: string } | null;
  completedAt: string | null;
  completedBy: { id: string; name: string; email: string; position: string | null } | null;
  approvedAt: string | null;
  approvedBy: { id: string; name: string; email: string; position: string | null } | null;
  rejectedAt: string | null;
  rejectedBy: { id: string; name: string; email: string; position: string | null } | null;
  rejectionReason: string | null;
  remark: string | null;
  revision: string | null;
  createdAt: string;
  updatedAt: string;
};

const statusColors = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
  'Waiting for Approval': 'bg-purple-100 text-purple-800 border-purple-300',
  Completed: 'bg-green-100 text-green-800 border-green-300',
  Cancelled: 'bg-gray-100 text-gray-800 border-gray-300',
};

const priorityColors = {
  Low: 'bg-gray-100 text-gray-800 border-gray-300',
  Medium: 'bg-orange-100 text-orange-800 border-orange-300',
  High: 'bg-red-100 text-red-800 border-red-300',
};

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

type TasksClientProps = {
  initialTasks: Task[];
  userRole: string;
  userId: string;
  allUsers: User[];
  allProjects: Project[];
  allBuildings: Building[];
  allDepartments: Department[];
  userPermissions: string[];
  filterMyTasks?: boolean;
  initialProjectFilter?: string;
};

export function TasksClient({ initialTasks, userRole, userId, allUsers, allProjects, allBuildings, allDepartments, userPermissions, filterMyTasks = false, initialProjectFilter }: TasksClientProps) {
  const router = useRouter();
  const { showAlert, AlertDialog } = useAlert();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['In Progress']);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectFilter || '');
  const [buildingFilter, setBuildingFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'project'>('table');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [showTips, setShowTips] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tasks-tips-dismissed') !== 'true';
    }
    return true;
  });
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddData, setQuickAddData] = useState({
    title: '',
    assignedToId: '',
    requesterId: '',
    projectId: '',
    buildingId: '',
    departmentId: '',
    priority: 'Medium',
    status: 'Pending',
    taskInputDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    releaseDate: '',
    isPrivate: false,
    remark: '',
    revision: '',
  });
  const [assignedToFilter, setAssignedToFilter] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    title: string;
    description: string;
    assignedToId: string;
    requesterId: string;
    projectId: string;
    buildingId: string;
    departmentId: string;
    priority: string;
    status: string;
    taskInputDate: string;
    dueDate: string;
    releaseDate: string;
    isPrivate: boolean;
    remark: string;
    revision: string;
  }>({
    title: '',
    description: '',
    assignedToId: '',
    requesterId: '',
    projectId: '',
    buildingId: '',
    departmentId: '',
    priority: 'Medium',
    status: 'Pending',
    taskInputDate: '',
    dueDate: '',
    releaseDate: '',
    isPrivate: false,
    remark: '',
    revision: '',
  });
  const [updating, setUpdating] = useState(false);
  const [undoingTaskId, setUndoingTaskId] = useState<string | null>(null);
  const [recentlyChangedTasks, setRecentlyChangedTasks] = useState<Set<string>>(new Set());
  const [rejectionDialog, setRejectionDialog] = useState<{
    open: boolean;
    taskId: string | null;
    task: Task | null;
    reason: string;
  }>({ open: false, taskId: null, task: null, reason: '' });

  const canCreateTask = userPermissions.includes('tasks.create');
  const canEditTask = userPermissions.includes('tasks.edit') || userPermissions.includes('tasks.create');

  // Helper to toggle multi-select filter values
  const toggleStatusFilter = (status: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Multi-select: toggle the clicked status
      setStatusFilter(prev => {
        if (prev.includes(status)) {
          return prev.filter(s => s !== status);
        }
        return [...prev, status];
      });
    } else {
      // Single select: set only this status (or clear if already the only one)
      setStatusFilter(prev => {
        if (prev.length === 1 && prev[0] === status) return [];
        return [status];
      });
    }
  };

  const togglePriorityFilter = (priority: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setPriorityFilter(prev => {
        if (prev.includes(priority)) {
          return prev.filter(p => p !== priority);
        }
        return [...prev, priority];
      });
    } else {
      setPriorityFilter(prev => {
        if (prev.length === 1 && prev[0] === priority) return [];
        return [priority];
      });
    }
  };

  // Filtered buildings based on selected project
  const filteredBuildings = useMemo(() => {
    if (!projectFilter) return allBuildings;
    return allBuildings.filter(b => b.projectId === projectFilter);
  }, [allBuildings, projectFilter]);

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="size-3 ml-1 opacity-40" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="size-3 ml-1 text-primary" /> 
      : <ArrowDown className="size-3 ml-1 text-primary" />;
  };

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((task) => {
      // Filter for My Tasks - only show tasks assigned to current user
      if (filterMyTasks && task.assignedTo?.id !== userId) {
        return false;
      }

      const matchesSearch = !search || 
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase()) ||
        task.assignedTo?.name.toLowerCase().includes(search.toLowerCase()) ||
        task.project?.name.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(task.status);
      const matchesPriority = priorityFilter.length === 0 || priorityFilter.includes(task.priority);
      const matchesProject = !projectFilter || task.project?.id === projectFilter;
      const matchesBuilding = !buildingFilter || task.building?.id === buildingFilter;
      const matchesDepartment = !departmentFilter || task.department?.id === departmentFilter;
      const matchesAssignedTo = !assignedToFilter || task.assignedTo?.id === assignedToFilter;
      const matchesApproval = !approvalFilter || 
        (approvalFilter === 'approved' && task.approvedAt) ||
        (approvalFilter === 'not_approved' && !task.approvedAt);

      return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesBuilding && matchesDepartment && matchesAssignedTo && matchesApproval;
    });

    // Apply sorting
    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let aVal: any = '';
        let bVal: any = '';

        switch (sortColumn) {
          case 'title': aVal = a.title.toLowerCase(); bVal = b.title.toLowerCase(); break;
          case 'assignedTo': aVal = a.assignedTo?.name?.toLowerCase() || ''; bVal = b.assignedTo?.name?.toLowerCase() || ''; break;
          case 'department': aVal = a.department?.name?.toLowerCase() || ''; bVal = a.department?.name?.toLowerCase() || ''; break;
          case 'project': aVal = a.project?.projectNumber || ''; bVal = b.project?.projectNumber || ''; break;
          case 'building': aVal = a.building?.designation || ''; bVal = b.building?.designation || ''; break;
          case 'priority': {
            const order: Record<string, number> = { 'High': 0, 'Medium': 1, 'Low': 2 };
            aVal = order[a.priority] ?? 99; bVal = order[b.priority] ?? 99; break;
          }
          case 'status': {
            const order: Record<string, number> = { 'Pending': 0, 'In Progress': 1, 'Waiting for Approval': 2, 'Completed': 3, 'Cancelled': 4 };
            aVal = order[a.status] ?? 99; bVal = order[b.status] ?? 99; break;
          }
          case 'requester': aVal = a.requester?.name?.toLowerCase() || ''; bVal = a.requester?.name?.toLowerCase() || ''; break;
          case 'taskInputDate': aVal = a.taskInputDate || ''; bVal = b.taskInputDate || ''; break;
          case 'dueDate': aVal = a.dueDate || ''; bVal = b.dueDate || ''; break;
          case 'releaseDate': aVal = a.releaseDate || ''; bVal = b.releaseDate || ''; break;
          case 'completedAt': aVal = a.completedAt || ''; bVal = b.completedAt || ''; break;
          case 'approvedAt': aVal = a.approvedAt || ''; bVal = b.approvedAt || ''; break;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [tasks, search, statusFilter, priorityFilter, projectFilter, buildingFilter, departmentFilter, assignedToFilter, approvalFilter, filterMyTasks, userId, sortColumn, sortDirection]);

  // Expand/Collapse All for project management view
  const expandAll = useCallback(() => {
    const projectIds = new Set<string>();
    const buildingKeys = new Set<string>();
    const activityKeys = new Set<string>();
    
    filteredTasks.forEach(task => {
      if (!task.project) return;
      const pKey = task.project.id;
      projectIds.add(pKey);
      const bKey = task.building?.id || '__no_building__';
      buildingKeys.add(`${pKey}-${bKey}`);
      const actKey = task.department?.id || '__no_dept__';
      activityKeys.add(`${pKey}-${bKey}-${actKey}`);
    });
    
    setExpandedProjects(projectIds);
    setExpandedBuildings(buildingKeys);
    setExpandedActivities(activityKeys);
  }, [filteredTasks]);

  const collapseAll = useCallback(() => {
    setExpandedProjects(new Set());
    setExpandedBuildings(new Set());
    setExpandedActivities(new Set());
  }, []);

  // Auto-expand all when switching to project view
  useEffect(() => {
    if (viewMode === 'project') {
      expandAll();
    }
  }, [viewMode, expandAll]);

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete task');

      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (error) {
      showAlert('Failed to delete task', { type: 'error' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedTasks.size} task(s)?`)) return;

    try {
      setIsDeleting(true);
      const deletePromises = Array.from(selectedTasks).map(taskId =>
        fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      setTasks(tasks.filter(t => !selectedTasks.has(t.id)));
      setSelectedTasks(new Set());
      router.refresh();
    } catch (error) {
      showAlert('Failed to delete some tasks', { type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkComplete = async () => {
    if (selectedTasks.size === 0) return;
    
    const incompleteTasks = tasks.filter(t => selectedTasks.has(t.id) && t.status !== 'Completed');
    
    if (incompleteTasks.length === 0) {
      showAlert('All selected tasks are already completed', { type: 'info' });
      return;
    }

    if (!confirm(`Mark ${incompleteTasks.length} task(s) as completed?`)) return;

    try {
      setIsDeleting(true); // Reuse the loading state
      const updatePromises = incompleteTasks.map(task =>
        fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Completed' }),
        })
      );

      const responses = await Promise.all(updatePromises);
      const updatedTasks = await Promise.all(responses.map(r => r.json()));

      // Update tasks in state
      setTasks(tasks.map(t => {
        const updated = updatedTasks.find(ut => ut.id === t.id);
        return updated || t;
      }));
      
      setSelectedTasks(new Set());
      router.refresh();
    } catch (error) {
      showAlert('Failed to complete some tasks', { type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkUncomplete = async () => {
    if (selectedTasks.size === 0) return;
    
    const completedTasks = tasks.filter(t => selectedTasks.has(t.id) && t.status === 'Completed');
    
    if (completedTasks.length === 0) {
      showAlert('No completed tasks selected', { type: 'info' });
      return;
    }

    if (!confirm(`Mark ${completedTasks.length} task(s) as incomplete (In Progress)?`)) return;

    try {
      setIsDeleting(true);
      const updatePromises = completedTasks.map(task =>
        fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'In Progress' }),
        })
      );

      const responses = await Promise.all(updatePromises);
      const updatedTasks = await Promise.all(responses.map(r => r.json()));

      // Update tasks in state
      setTasks(tasks.map(t => {
        const updated = updatedTasks.find(ut => ut.id === t.id);
        return updated || t;
      }));
      
      setSelectedTasks(new Set());
      router.refresh();
    } catch (error) {
      showAlert('Failed to uncomplete some tasks', { type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'In Progress' : 'Completed';
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update task');

      const updatedTask = await response.json();
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      router.refresh();
    } catch (error) {
      showAlert('Failed to update task status', { type: 'error' });
    }
  };

  const handleToggleApproval = async (taskId: string, currentlyApproved: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: !currentlyApproved }),
      });

      if (!response.ok) throw new Error('Failed to update approval');

      const updatedTask = await response.json();
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      
      // Mark as recently changed
      setRecentlyChangedTasks(prev => new Set(prev).add(taskId));
      setTimeout(() => {
        setRecentlyChangedTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      }, 5 * 60 * 1000); // 5 minutes
      
      router.refresh();
      showAlert(currentlyApproved ? 'Task approval revoked' : 'Task approved successfully', { type: 'success' });
    } catch (error) {
      showAlert('Failed to update approval status', { type: 'error' });
    }
  };

  const handleUndo = async (taskId: string) => {
    if (!confirm('Are you sure you want to undo the last change to this task?')) return;

    setUndoingTaskId(taskId);
    try {
      const response = await fetch(`/api/tasks/${taskId}/undo`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to undo changes');
      }

      const result = await response.json();
      setTasks(tasks.map(t => t.id === taskId ? result.task : t));
      setRecentlyChangedTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      showAlert('Changes undone successfully', { type: 'success' });
      router.refresh();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : 'Failed to undo changes', { type: 'error' });
    } finally {
      setUndoingTaskId(null);
    }
  };

  const handleOpenRejectionDialog = (task: Task) => {
    setRejectionDialog({ open: true, taskId: task.id, task, reason: '' });
  };

  const handleRejectTask = async (duplicateAfter: boolean) => {
    if (!rejectionDialog.taskId || !rejectionDialog.task) return;

    try {
      // First, reject the task
      const response = await fetch(`/api/tasks/${rejectionDialog.taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rejected: true, 
          rejectionReason: rejectionDialog.reason || 'No reason provided'
        }),
      });

      if (!response.ok) throw new Error('Failed to reject task');

      const updatedTask = await response.json();
      setTasks(tasks.map(t => t.id === rejectionDialog.taskId ? updatedTask : t));

      // If user wants to duplicate, create a new task
      if (duplicateAfter && rejectionDialog.task) {
        const task = rejectionDialog.task;
        const duplicateResponse = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${task.title} (Rev)`,
            description: task.description,
            assignedToId: task.assignedTo?.id || null,
            projectId: task.project?.id || null,
            buildingId: task.building?.id || null,
            departmentId: task.department?.id || null,
            priority: task.priority,
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null,
            taskInputDate: new Date().toISOString().split('T')[0],
            status: 'Pending',
            isPrivate: task.isPrivate,
            remark: `Revision of rejected task. Original rejection reason: ${rejectionDialog.reason || 'Not specified'}`,
            revision: task.revision ? `${task.revision}-R` : 'R1',
          }),
        });

        if (duplicateResponse.ok) {
          const newTask = await duplicateResponse.json();
          setTasks([newTask, ...tasks.map(t => t.id === rejectionDialog.taskId ? updatedTask : t)]);
          showAlert('Task rejected and new revision created', { type: 'success' });
        } else {
          showAlert('Task rejected but failed to create revision', { type: 'warning' });
        }
      } else {
        showAlert('Task rejected successfully', { type: 'success' });
      }

      router.refresh();
    } catch (error) {
      showAlert('Failed to reject task', { type: 'error' });
    } finally {
      setRejectionDialog({ open: false, taskId: null, task: null, reason: '' });
    }
  };

  const handleDuplicate = async (task: Task) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${task.title} (Copy)`,
          description: task.description,
          assignedToId: task.assignedTo?.id || null,
          projectId: task.project?.id || null,
          buildingId: task.building?.id || null,
          departmentId: task.department?.id || null,
          priority: task.priority,
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null,
          taskInputDate: new Date().toISOString().split('T')[0],
          status: 'Pending',
          isPrivate: task.isPrivate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to duplicate task');
      }

      const newTask = await response.json();
      setTasks([newTask, ...tasks]);
      showAlert('Task duplicated successfully', { type: 'success' });
    } catch (error) {
      showAlert(error instanceof Error ? error.message : 'Failed to duplicate task', { type: 'error' });
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddData.title.trim()) {
      showAlert('Please enter a task title', { type: 'warning' });
      return;
    }

    if (!quickAddData.dueDate) {
      showAlert('Please enter a due date', { type: 'warning' });
      return;
    }

    // Validate due date is not before input date
    if (quickAddData.taskInputDate && quickAddData.dueDate && new Date(quickAddData.dueDate) < new Date(quickAddData.taskInputDate)) {
      showAlert('Due date cannot be before input date', { type: 'warning' });
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quickAddData.title,
          assignedToId: quickAddData.assignedToId || null,
          requesterId: quickAddData.requesterId || null,
          projectId: quickAddData.projectId || null,
          buildingId: quickAddData.buildingId || null,
          departmentId: quickAddData.departmentId || null,
          priority: quickAddData.priority,
          taskInputDate: quickAddData.taskInputDate || null,
          dueDate: quickAddData.dueDate,
          releaseDate: quickAddData.releaseDate || null,
          status: quickAddData.status,
          isPrivate: quickAddData.isPrivate,
          remark: quickAddData.remark || null,
          revision: quickAddData.revision || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create task');
      }

      const newTask = await response.json();
      setTasks([newTask, ...tasks]);
      setQuickAddData({ 
        title: '', 
        assignedToId: '',
        requesterId: '',
        projectId: '', 
        buildingId: '',
        departmentId: '', 
        priority: 'Medium',
        status: 'In Progress', 
        taskInputDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        releaseDate: '',
        isPrivate: false,
        remark: '',
        revision: '',
      });
      setShowQuickAdd(false);
      // Don't use router.refresh() as it causes redirect
    } catch (error) {
      showAlert(error instanceof Error ? error.message : 'Failed to create task', { type: 'error' });
      console.error('Task creation error:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    
    // Convert dates to YYYY-MM-DD format for date inputs
    const formatDateForInput = (dateString: string | null) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    setEditData({
      title: task.title,
      description: task.description || '',
      assignedToId: task.assignedTo?.id || '',
      requesterId: task.requester?.id || '',
      projectId: task.project?.id || '',
      buildingId: task.building?.id || '',
      departmentId: task.department?.id || '',
      priority: task.priority,
      status: task.status,
      taskInputDate: formatDateForInput(task.taskInputDate),
      dueDate: formatDateForInput(task.dueDate),
      releaseDate: formatDateForInput(task.releaseDate),
      isPrivate: task.isPrivate,
      remark: task.remark || '',
      revision: task.revision || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditData({ 
      title: '', 
      description: '',
      assignedToId: '',
      requesterId: '',
      projectId: '', 
      buildingId: '',
      departmentId: '', 
      priority: 'Medium',
      status: 'Pending', 
      taskInputDate: '',
      dueDate: '',
      releaseDate: '',
      isPrivate: false,
      remark: '',
      revision: '',
    });
  };

  const handleQuickEdit = async () => {
    if (!editingTaskId) return;

    // Validate required fields
    if (!editData.title.trim()) {
      showAlert('Title is required', { type: 'error' });
      return;
    }
    if (!editData.dueDate) {
      showAlert('Due date is required', { type: 'error' });
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${editingTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task');
      }

      const updatedTask = await response.json();
      setTasks(tasks.map(t => t.id === editingTaskId ? updatedTask : t));
      
      // Mark as recently changed
      setRecentlyChangedTasks(prev => new Set(prev).add(editingTaskId));
      setTimeout(() => {
        setRecentlyChangedTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(editingTaskId);
          return newSet;
        });
      }, 5 * 60 * 1000); // 5 minutes
      
      handleCancelEdit();
      router.refresh();
    } catch (error) {
      showAlert(error instanceof Error ? error.message : 'Failed to update task', { type: 'error' });
      console.error('Task update error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}-${month}-${year}`;
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'Completed') return false;
    return new Date(dueDate) < new Date();
  };

  const getOverdueDays = (dueDate: string, status: string) => {
    if (status === 'Completed') return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getOverdueColor = (overdueDays: number) => {
    if (overdueDays === 0) return '';
    if (overdueDays <= 3) return 'bg-amber-50 border-l-4 border-l-amber-500';
    return 'bg-red-50 border-l-4 border-l-red-500';
  };

  const getCompletionStatus = (task: Task) => {
    if (task.status !== 'Completed' || !task.dueDate) return null;
    
    const completionDate = new Date(task.updatedAt);
    const dueDate = new Date(task.dueDate);
    
    // Set both to start of day for fair comparison
    completionDate.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((completionDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'early', label: 'Early', days: Math.abs(diffDays), color: 'text-green-600' };
    } else if (diffDays === 0) {
      return { status: 'ontime', label: 'On Time', days: 0, color: 'text-blue-600' };
    } else {
      return { status: 'delayed', label: 'Delayed', days: diffDays, color: 'text-red-600' };
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 w-full">
      <div className="w-full p-6 lg:p-8 space-y-6 max-lg:pt-20">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track your tasks
            </p>
            <div className="mt-4">
              <div className="inline-flex items-center gap-6 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                {/* Main Stats */}
                <div className="flex items-center gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Tasks</p>
                    <p className="text-3xl font-bold text-primary">{filteredTasks.length}</p>
                  </div>
                  {tasks.length !== filteredTasks.length && (
                    <div className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                      of {tasks.length} total
                    </div>
                  )}
                </div>
                
                {/* Status Breakdown */}
                <div className="flex items-center gap-4 pl-6 border-l border-primary/20">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm">
                      {filteredTasks.filter(t => t.status === 'Pending').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm">
                      {filteredTasks.filter(t => t.status === 'In Progress').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-sm">
                      {filteredTasks.filter(t => t.status === 'Waiting for Approval').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm">
                      {filteredTasks.filter(t => t.status === 'Completed').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                    <span className="text-sm">
                      {filteredTasks.filter(t => t.status === 'Cancelled').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {canCreateTask && (
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className={cn(
                  showQuickAdd 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0'
                )}
              >
                <Plus className="size-4 mr-2" />
                {showQuickAdd ? 'Hide Quick Add' : 'Quick Add Task'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/tasks/new">
                  <Plus className="size-4 mr-2" />
                  Full Form
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedTasks.size > 0 && (
          <Card className="border-primary">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    {selectedTasks.size} task(s) selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTasks(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBulkComplete}
                    disabled={isDeleting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckSquare className="size-4 mr-2" />
                        Complete
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkUncomplete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Square className="size-4 mr-2" />
                        Uncomplete
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-4 mr-2" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter buttons */}
              <div className="flex flex-wrap gap-2 items-center">
                {/* View Toggle */}
                <div className="flex gap-1">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    title="Table View"
                  >
                    <List className="size-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    title="Card View"
                  >
                    <LayoutGrid className="size-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'project' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('project')}
                    title="Project Management View"
                  >
                    <FolderTree className="size-4" />
                  </Button>
                </div>

                <div className="h-6 w-px bg-border" />

                {/* Multi-select tip bubble */}
                <div className="relative group">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200 text-xs text-blue-700">
                    <Sparkles className="h-3 w-3" />
                    <span>Ctrl+Click for multi-select</span>
                  </div>
                </div>

                <div className="h-6 w-px bg-border" />

                {/* Status filters - Ctrl+Click for multi-select */}
                <span className="text-sm text-muted-foreground">Status:</span>
                <Button
                  variant={statusFilter.length === 0 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter([])}
                >
                  All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => toggleStatusFilter('Pending', e)}
                  className={cn(
                    statusFilter.includes('Pending') 
                      ? 'bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600 hover:text-white' 
                      : 'hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-300'
                  )}
                >
                  Pending
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => toggleStatusFilter('In Progress', e)}
                  className={cn(
                    statusFilter.includes('In Progress') 
                      ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600 hover:text-white' 
                      : 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                  )}
                >
                  In Progress
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => toggleStatusFilter('Waiting for Approval', e)}
                  className={cn(
                    statusFilter.includes('Waiting for Approval') 
                      ? 'bg-purple-500 text-white border-purple-500 hover:bg-purple-600 hover:text-white' 
                      : 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300'
                  )}
                >
                  Waiting for Approval
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => toggleStatusFilter('Completed', e)}
                  className={cn(
                    statusFilter.includes('Completed') 
                      ? 'bg-green-500 text-white border-green-500 hover:bg-green-600 hover:text-white' 
                      : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                  )}
                >
                  Completed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => toggleStatusFilter('Cancelled', e)}
                  className={cn(
                    statusFilter.includes('Cancelled') 
                      ? 'bg-gray-500 text-white border-gray-500 hover:bg-gray-600 hover:text-white' 
                      : 'hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  Cancelled
                </Button>

                <div className="h-6 w-px bg-border" />

                {/* Approval filter */}
                <span className="text-sm text-muted-foreground">Approval:</span>
                <Button
                  variant={approvalFilter === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setApprovalFilter('')}
                >
                  All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setApprovalFilter('approved')}
                  className={cn(
                    approvalFilter === 'approved'
                      ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 hover:text-white'
                      : 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                  )}
                >
                  Approved
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setApprovalFilter('not_approved')}
                  className={cn(
                    approvalFilter === 'not_approved'
                      ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 hover:text-white'
                      : 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
                  )}
                >
                  Not Approved
                </Button>

                <div className="h-6 w-px bg-border" />

                {/* Priority filters - Ctrl+Click for multi-select */}
                <span className="text-sm text-muted-foreground" title="Hold Ctrl/Cmd and click to select multiple">Priority:</span>
                <Button
                  variant={priorityFilter.length === 0 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriorityFilter([])}
                >
                  All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => togglePriorityFilter('High', e)}
                  className={cn(
                    priorityFilter.includes('High') 
                      ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 hover:text-white' 
                      : 'hover:bg-red-50 hover:text-red-700 hover:border-red-300'
                  )}
                >
                  High
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => togglePriorityFilter('Medium', e)}
                  className={cn(
                    priorityFilter.includes('Medium') 
                      ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600 hover:text-white' 
                      : 'hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300'
                  )}
                >
                  Medium
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => togglePriorityFilter('Low', e)}
                  className={cn(
                    priorityFilter.includes('Low') 
                      ? 'bg-gray-500 text-white border-gray-500 hover:bg-gray-600 hover:text-white' 
                      : 'hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  Low
                </Button>
              </div>

              {/* Additional Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Filters:</span>
                
                {/* Project Filter */}
                <select
                  value={projectFilter}
                  onChange={(e) => {
                    setProjectFilter(e.target.value);
                    setBuildingFilter(''); // Reset building when project changes
                  }}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="">All Projects</option>
                  {allProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectNumber} - {project.name}
                    </option>
                  ))}
                </select>

                {/* Building Filter - dependent on selected project */}
                <select
                  value={buildingFilter}
                  onChange={(e) => setBuildingFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="">{projectFilter ? 'All Buildings (filtered)' : 'All Buildings'}</option>
                  {filteredBuildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name} ({building.designation})
                    </option>
                  ))}
                </select>

                {/* Assigned To Filter */}
                <select
                  value={assignedToFilter}
                  onChange={(e) => setAssignedToFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="">All Assignees</option>
                  {allUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>

                {/* Department Filter */}
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="">All Departments</option>
                  {allDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>

                {/* Reset All Filters */}
                {(statusFilter.length > 0 || priorityFilter.length > 0 || projectFilter || buildingFilter || departmentFilter || assignedToFilter || approvalFilter || search) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStatusFilter([]);
                      setPriorityFilter([]);
                      setProjectFilter('');
                      setBuildingFilter('');
                      setDepartmentFilter('');
                      setAssignedToFilter('');
                      setApprovalFilter('');
                      setSearch('');
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reset All
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips Banner */}
        {showTips && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-blue-900">New Features</p>
                  <ul className="text-blue-800 space-y-0.5 text-xs">
                    <li><strong>Ctrl+Click</strong> on Status or Priority buttons to select multiple filters at once</li>
                    <li><strong>Click column headers</strong> to sort the table ascending/descending</li>
                    <li><strong>Project Management View</strong> (<FolderTree className="size-3 inline" />) groups tasks by Project &gt; Building &gt; Department</li>
                    <li><strong>Approval Status</strong> column tracks client approval with timestamp</li>
                    <li><strong>Duplicate Task</strong> option available in the row action menu (&hellip;)</li>
                  </ul>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-800 shrink-0 text-xs"
                  onClick={() => {
                    setShowTips(false);
                    localStorage.setItem('tasks-tips-dismissed', 'true');
                  }}
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks Display */}
        {filteredTasks.length === 0 && !showQuickAdd ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {search || statusFilter.length > 0 || priorityFilter.length > 0
                  ? 'No tasks found matching your filters'
                  : 'No tasks yet. Create your first task!'}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'table' || showQuickAdd ? (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('title')}>
                      <div className="flex items-center">Task {getSortIcon('title')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('assignedTo')}>
                      <div className="flex items-center">Assigned To {getSortIcon('assignedTo')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('requester')}>
                      <div className="flex items-center">Requester {getSortIcon('requester')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('department')}>
                      <div className="flex items-center">Department {getSortIcon('department')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('project')}>
                      <div className="flex items-center">Project {getSortIcon('project')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('building')}>
                      <div className="flex items-center">Building {getSortIcon('building')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('priority')}>
                      <div className="flex items-center">Priority {getSortIcon('priority')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                      <div className="flex items-center">Status {getSortIcon('status')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none min-w-[110px]" onClick={() => handleSort('taskInputDate')}>
                      <div className="flex items-center">Input Date {getSortIcon('taskInputDate')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none min-w-[110px]" onClick={() => handleSort('dueDate')}>
                      <div className="flex items-center">Due Date {getSortIcon('dueDate')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none min-w-[110px]" onClick={() => handleSort('releaseDate')}>
                      <div className="flex items-center">Release Date {getSortIcon('releaseDate')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none min-w-[120px]" onClick={() => handleSort('completedAt')}>
                      <div className="flex items-center">Completion {getSortIcon('completedAt')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('approvedAt')}>
                      <div className="flex items-center">Approval {getSortIcon('approvedAt')}</div>
                    </TableHead>
                    <TableHead>Remark</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Quick Add Row */}
                  {canCreateTask && showQuickAdd && (
                    <TableRow className="bg-muted/50">
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        <Input
                          placeholder="Task title..."
                          value={quickAddData.title}
                          onChange={(e) => setQuickAddData({ ...quickAddData, title: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                          autoFocus
                          disabled={creating}
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          value={quickAddData.assignedToId}
                          onChange={(e) => {
                            const selectedUser = allUsers.find(u => u.id === e.target.value);
                            setQuickAddData({ 
                              ...quickAddData, 
                              assignedToId: e.target.value,
                              departmentId: selectedUser?.departmentId || ''
                            });
                          }}
                          className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                          disabled={creating}
                        >
                          <option value="">Unassigned</option>
                          {allUsers.map((user) => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          value={quickAddData.requesterId}
                          onChange={(e) => setQuickAddData({ ...quickAddData, requesterId: e.target.value })}
                          className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                          disabled={creating}
                        >
                          <option value="">No Requester</option>
                          {allUsers.map((user) => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          value={quickAddData.departmentId}
                          onChange={(e) => setQuickAddData({ ...quickAddData, departmentId: e.target.value })}
                          className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                          disabled={creating}
                        >
                          <option value="">No Dept</option>
                          {allDepartments.map((dept) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          value={quickAddData.projectId}
                          onChange={(e) => {
                            const newProjectId = e.target.value;
                            setQuickAddData({ 
                              ...quickAddData, 
                              projectId: newProjectId,
                              buildingId: '' // Reset building when project changes
                            });
                          }}
                          className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                          disabled={creating}
                        >
                          <option value="">No Project</option>
                          {allProjects.map((project) => (
                            <option key={project.id} value={project.id}>{project.projectNumber}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          value={quickAddData.buildingId}
                          onChange={(e) => setQuickAddData({ ...quickAddData, buildingId: e.target.value })}
                          className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                          disabled={creating || !quickAddData.projectId}
                        >
                          <option value="">{quickAddData.projectId ? 'No Building' : 'Select Project First'}</option>
                          {allBuildings
                            .filter(building => !quickAddData.projectId || building.projectId === quickAddData.projectId)
                            .map((building) => (
                              <option key={building.id} value={building.id}>{building.name} ({building.designation})</option>
                            ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          value={quickAddData.priority}
                          onChange={(e) => setQuickAddData({ ...quickAddData, priority: e.target.value })}
                          className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                          disabled={creating}
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          value={quickAddData.status}
                          onChange={(e) => setQuickAddData({ ...quickAddData, status: e.target.value })}
                          className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                          disabled={creating}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Waiting for Approval">Waiting for Approval</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={quickAddData.taskInputDate}
                          onChange={(e) => setQuickAddData({ ...quickAddData, taskInputDate: e.target.value })}
                          className="h-9 text-sm"
                          disabled={creating}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={quickAddData.dueDate}
                          onChange={(e) => setQuickAddData({ ...quickAddData, dueDate: e.target.value })}
                          className={cn("h-9 text-sm", !quickAddData.dueDate && "border-red-300")}
                          disabled={creating}
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={quickAddData.releaseDate}
                          onChange={(e) => setQuickAddData({ ...quickAddData, releaseDate: e.target.value })}
                          className="h-9 text-sm"
                          disabled={creating}
                        />
                      </TableCell>
                      <TableCell>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={quickAddData.isPrivate}
                            onChange={(e) => setQuickAddData({ ...quickAddData, isPrivate: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300"
                            disabled={creating}
                          />
                          <Lock className="size-3.5 text-amber-600" />
                        </label>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">-</span>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Remark..."
                          value={quickAddData.remark || ''}
                          onChange={(e) => setQuickAddData({ ...quickAddData, remark: e.target.value })}
                          className="h-9 text-sm"
                          disabled={creating}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Rev..."
                          value={quickAddData.revision || ''}
                          onChange={(e) => setQuickAddData({ ...quickAddData, revision: e.target.value })}
                          className="h-9 w-20 text-sm"
                          disabled={creating}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" onClick={handleQuickAdd} disabled={creating}>
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowQuickAdd(false)} disabled={creating}>
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredTasks.map((task) => {
                    const overdueDays = task.dueDate ? getOverdueDays(task.dueDate, task.status) : 0;
                    const overdueColor = getOverdueColor(overdueDays);
                    const isEditing = editingTaskId === task.id;
                    const isCompleted = task.status === 'Completed';
                    
                    return (
                    <TableRow key={task.id} className={cn(
                      isCompleted ? "bg-green-50/70 border-l-4 border-l-green-500" : overdueColor,
                      isEditing && "bg-blue-50/50"
                    )}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                          className="h-4 w-4 rounded border-gray-300"
                          disabled={isEditing}
                        />
                      </TableCell>
                      <TableCell>
                        {!isEditing ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleToggleComplete(task.id, task.status)}
                            title={task.status === 'Completed' ? 'Mark as incomplete' : 'Mark as complete'}
                          >
                            {task.status === 'Completed' ? (
                              <CheckSquare className="h-6 w-6 text-green-600" />
                            ) : (
                              <Square className="h-6 w-6 text-muted-foreground" />
                            )}
                          </Button>
                        ) : (
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editData.isPrivate}
                              onChange={(e) => setEditData({ ...editData, isPrivate: e.target.checked })}
                              className="h-4 w-4 rounded border-gray-300"
                              disabled={updating}
                            />
                            <Lock className="size-3.5 text-amber-600" />
                          </label>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            placeholder="Task title..."
                            value={editData.title}
                            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                            className="h-9 text-sm"
                            disabled={updating}
                          />
                        ) : (
                          <div>
                            <div className="flex items-center gap-1.5">
                              {task.isPrivate && (
                                <span title="Private task">
                                  <Lock className="size-3.5 text-amber-600" />
                                </span>
                              )}
                              <Link 
                                href={`/tasks/${task.id}`}
                                className="font-medium hover:text-primary hover:underline cursor-pointer"
                              >
                                {task.title}
                              </Link>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <select
                            value={editData.assignedToId}
                            onChange={(e) => {
                              const selectedUser = allUsers.find(u => u.id === e.target.value);
                              setEditData({ 
                                ...editData, 
                                assignedToId: e.target.value,
                                departmentId: selectedUser?.departmentId || ''
                              });
                            }}
                            className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                            disabled={updating}
                          >
                            <option value="">Unassigned</option>
                            {allUsers.map((user) => (
                              <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                          </select>
                        ) : (
                          task.assignedTo ? (
                            <div>
                              <p>{task.assignedTo.name}</p>
                              {task.assignedTo.position && (
                                <p className="text-xs text-muted-foreground">{task.assignedTo.position}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <select
                            value={editData.requesterId}
                            onChange={(e) => setEditData({ ...editData, requesterId: e.target.value })}
                            className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                            disabled={updating}
                          >
                            <option value="">No Requester</option>
                            {allUsers.map((user) => (
                              <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                          </select>
                        ) : (
                          task.requester ? (
                            <span className="text-sm">{task.requester.name}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <select
                            value={editData.departmentId}
                            onChange={(e) => setEditData({ ...editData, departmentId: e.target.value })}
                            className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                            disabled={updating}
                          >
                            <option value="">No Dept</option>
                            {allDepartments.map((dept) => (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                          </select>
                        ) : (
                          task.department ? (
                            <span className="text-sm">{task.department.name}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <select
                            value={editData.projectId}
                            onChange={(e) => {
                              const newProjectId = e.target.value;
                              setEditData({ 
                                ...editData, 
                                projectId: newProjectId,
                                buildingId: ''
                              });
                            }}
                            className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                            disabled={updating}
                          >
                            <option value="">No Project</option>
                            {allProjects.map((project) => (
                              <option key={project.id} value={project.id}>{project.projectNumber}</option>
                            ))}
                          </select>
                        ) : (
                          task.project ? (
                            <div>
                              <p className="text-sm">{task.project.projectNumber}</p>
                              <p className="text-xs text-muted-foreground">{task.project.name}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <select
                            value={editData.buildingId}
                            onChange={(e) => setEditData({ ...editData, buildingId: e.target.value })}
                            className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                            disabled={updating || !editData.projectId}
                          >
                            <option value="">{editData.projectId ? 'No Building' : 'Select Project First'}</option>
                            {allBuildings
                              .filter(building => !editData.projectId || building.projectId === editData.projectId)
                              .map((building) => (
                                <option key={building.id} value={building.id}>{building.name} ({building.designation})</option>
                              ))}
                          </select>
                        ) : (
                          task.building ? (
                            <div>
                              <p className="text-sm">{task.building.name}</p>
                              <p className="text-xs text-muted-foreground">{task.building.designation}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <select
                            value={editData.priority}
                            onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                            className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                            disabled={updating}
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        ) : (
                          <Badge
                            variant="outline"
                            className={priorityColors[task.priority as keyof typeof priorityColors]}
                          >
                            {task.priority}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <select
                            value={editData.status}
                            onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                            className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                            disabled={updating}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Waiting for Approval">Waiting for Approval</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        ) : (
                          <Badge
                            variant="outline"
                            className={statusColors[task.status as keyof typeof statusColors]}
                          >
                            {task.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editData.taskInputDate}
                            onChange={(e) => setEditData({ ...editData, taskInputDate: e.target.value })}
                            className="h-9 text-sm"
                            disabled={updating}
                          />
                        ) : (
                          task.taskInputDate ? (
                            <span className="text-sm">{formatDate(task.taskInputDate)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editData.dueDate}
                            onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                            className={cn("h-9 text-sm", !editData.dueDate && "border-red-300")}
                            disabled={updating}
                            required
                          />
                        ) : (
                          task.dueDate ? (
                            <div className={cn(
                              "flex items-center gap-1",
                              isOverdue(task.dueDate, task.status) && "text-destructive"
                            )}>
                              {isOverdue(task.dueDate, task.status) && (
                                <AlertCircle className="size-3" />
                              )}
                              <span className="text-sm">{formatDate(task.dueDate)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editData.releaseDate}
                            onChange={(e) => setEditData({ ...editData, releaseDate: e.target.value })}
                            className="h-9 text-sm"
                            disabled={updating}
                          />
                        ) : (
                          task.releaseDate ? (
                            <span className="text-sm">{formatDate(task.releaseDate)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {task.status === 'Completed' ? (
                          <div className="text-sm">
                            <div className="font-medium">{formatDate(task.completedAt || task.updatedAt)}</div>
                            <div className="text-xs text-muted-foreground">
                              {task.completedBy ? (
                                <>Completed by {task.completedBy.name}</>
                              ) : (
                                <>Completed by {task.createdBy.name}</>
                              )}
                            </div>
                            {(() => {
                              const completionStatus = getCompletionStatus(task);
                              return completionStatus ? (
                                <div className={cn("text-xs font-medium", completionStatus.color)}>
                                  {completionStatus.label}
                                  {completionStatus.days > 0 && ` (+${completionStatus.days}d)`}
                                  {completionStatus.days < 0 && ` (-${completionStatus.days}d)`}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {task.rejectedAt ? (
                            <div className="flex items-center gap-1">
                              <ShieldX className="h-5 w-5 text-red-600" />
                              <div className="text-xs">
                                <div className="font-medium text-red-600">Rejected</div>
                                {task.rejectionReason && (
                                  <div className="text-muted-foreground truncate max-w-[100px]" title={task.rejectionReason}>
                                    {task.rejectionReason}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleToggleApproval(task.id, !!task.approvedAt)}
                                disabled={task.status !== 'Completed' && !task.approvedAt}
                                title={task.status !== 'Completed' && !task.approvedAt ? 'Task must be completed before approval' : (task.approvedAt ? 'Revoke approval' : 'Approve task')}
                              >
                                {task.approvedAt ? (
                                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <Shield className={cn("h-5 w-5", task.status === 'Completed' ? "text-muted-foreground" : "text-muted-foreground/40")} />
                                )}
                              </Button>
                              {task.status === 'Completed' && !task.approvedAt && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleOpenRejectionDialog(task)}
                                  title="Reject task"
                                >
                                  <XCircle className="h-5 w-5 text-red-500 hover:text-red-600" />
                                </Button>
                              )}
                              {task.approvedAt && (
                                <div className="text-xs">
                                  <div className="font-medium text-emerald-700">{formatDate(task.approvedAt)}</div>
                                  {task.approvedBy && (
                                    <div className="text-muted-foreground">by {task.approvedBy.name}</div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            placeholder="Remark..."
                            value={editData.remark}
                            onChange={(e) => setEditData({ ...editData, remark: e.target.value })}
                            className="h-8 text-sm"
                            disabled={updating}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground truncate max-w-[150px] block" title={task.remark || ''}>
                            {task.remark || '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            placeholder="Rev..."
                            value={editData.revision}
                            onChange={(e) => setEditData({ ...editData, revision: e.target.value })}
                            className="h-8 w-20 text-sm font-mono"
                            disabled={updating}
                          />
                        ) : (
                          <span className="text-sm font-mono">{task.revision || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" onClick={handleQuickEdit} disabled={updating}>
                              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={updating}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {canEditTask && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleStartEdit(task)}
                                title="Edit task"
                              >
                                <Edit className="size-4 text-muted-foreground hover:text-primary" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/tasks/${task.id}`)}>
                                  <Eye className="size-4" />
                                  View Details
                                </DropdownMenuItem>
                                {canEditTask && recentlyChangedTasks.has(task.id) && (
                                  <DropdownMenuItem 
                                    onClick={() => handleUndo(task.id)}
                                    disabled={undoingTaskId === task.id}
                                    className="text-orange-600"
                                  >
                                    <Undo2 className="size-4" />
                                    {undoingTaskId === task.id ? 'Undoing...' : 'Undo Last Change'}
                                  </DropdownMenuItem>
                                )}
                                {canEditTask && (
                                  <DropdownMenuItem onClick={() => router.push(`/tasks/${task.id}/edit`)}>
                                    <Edit className="size-4" />
                                    Edit Task (Full Form)
                                  </DropdownMenuItem>
                                )}
                                {canCreateTask && (
                                  <DropdownMenuItem onClick={() => handleDuplicate(task)}>
                                    <Copy className="size-4" />
                                    Duplicate Task
                                  </DropdownMenuItem>
                                )}
                                {['CEO', 'Admin'].includes(userRole) && (
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(task.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="size-4" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="hover:shadow-lg transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">
                      <Link href={`/tasks/${task.id}`} className="hover:text-primary hover:underline flex items-center gap-1.5">
                        {task.isPrivate && <span title="Private task"><Lock className="size-3.5 text-amber-600" /></span>}
                        {task.title}
                      </Link>
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 flex-shrink-0">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/tasks/${task.id}`)}>
                          <Eye className="size-4" />
                          View Details
                        </DropdownMenuItem>
                        {canEditTask && recentlyChangedTasks.has(task.id) && (
                          <DropdownMenuItem 
                            onClick={() => handleUndo(task.id)}
                            disabled={undoingTaskId === task.id}
                            className="text-orange-600"
                          >
                            <Undo2 className="size-4" />
                            {undoingTaskId === task.id ? 'Undoing...' : 'Undo Last Change'}
                          </DropdownMenuItem>
                        )}
                        {canEditTask && (
                          <DropdownMenuItem onClick={() => router.push(`/tasks/${task.id}/edit`)}>
                            <Edit className="size-4" />
                            Edit Task
                          </DropdownMenuItem>
                        )}
                        {canCreateTask && (
                          <DropdownMenuItem onClick={() => handleDuplicate(task)}>
                            <Copy className="size-4" />
                            Duplicate Task
                          </DropdownMenuItem>
                        )}
                        {['CEO', 'Admin'].includes(userRole) && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(task.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className={statusColors[task.status as keyof typeof statusColors]}
                    >
                      {task.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={priorityColors[task.priority as keyof typeof priorityColors]}
                    >
                      {task.priority}
                    </Badge>
                    {task.approvedAt && (
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">
                        <ShieldCheck className="size-3 mr-1" /> Approved
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                  {task.description && (
                    <p className="text-muted-foreground line-clamp-2">{task.description}</p>
                  )}

                  {task.assignedTo && (
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{task.assignedTo.name}</p>
                        {task.assignedTo.position && (
                          <p className="text-xs text-muted-foreground">{task.assignedTo.position}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {task.project && (
                    <div className="text-xs">
                      <p className="text-muted-foreground">Project</p>
                      <p className="font-medium">{task.project.projectNumber} - {task.project.name}</p>
                    </div>
                  )}

                  {task.dueDate && (
                    <div className={cn(
                      "flex items-center gap-2",
                      isOverdue(task.dueDate, task.status) && "text-destructive"
                    )}>
                      <Calendar className="size-4" />
                      <div>
                        <p className="text-xs text-muted-foreground">Due Date</p>
                        <p className="font-medium flex items-center gap-1">
                          {isOverdue(task.dueDate, task.status) && (
                            <AlertCircle className="size-3" />
                          )}
                          {formatDate(task.dueDate)}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Project Management View - hierarchical: Project > Building > Activity > Task */
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderTree className="h-4 w-4" />
                  Project Management View
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    <ChevronDown className="h-3.5 w-3.5 mr-1" />
                    Expand All
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    <ChevronRight className="h-3.5 w-3.5 mr-1" />
                    Collapse All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {(() => {
                const projectGroups = new Map<string, { project: Task['project']; buildings: Map<string, { building: Task['building']; tasks: Task[] }> }>();
                const noProjectTasks: Task[] = [];

                filteredTasks.forEach(task => {
                  if (!task.project) {
                    noProjectTasks.push(task);
                    return;
                  }
                  const pKey = task.project.id;
                  if (!projectGroups.has(pKey)) {
                    projectGroups.set(pKey, { project: task.project, buildings: new Map() });
                  }
                  const pg = projectGroups.get(pKey)!;
                  const bKey = task.building?.id || '__no_building__';
                  if (!pg.buildings.has(bKey)) {
                    pg.buildings.set(bKey, { building: task.building, tasks: [] });
                  }
                  pg.buildings.get(bKey)!.tasks.push(task);
                });

                const toggleProject = (id: string) => {
                  setExpandedProjects(prev => {
                    const next = new Set(prev);
                    next.has(id) ? next.delete(id) : next.add(id);
                    return next;
                  });
                };
                const toggleBuilding = (id: string) => {
                  setExpandedBuildings(prev => {
                    const next = new Set(prev);
                    next.has(id) ? next.delete(id) : next.add(id);
                    return next;
                  });
                };

                const getDuration = (task: Task) => {
                  if (!task.taskInputDate || !task.dueDate) return '-';
                  const start = new Date(task.taskInputDate);
                  const end = new Date(task.dueDate);
                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                  return `${days}d`;
                };

                const renderTaskRow = (task: Task, indent: number) => {
                  const isCompleted = task.status === 'Completed';
                  const overdueDays = task.dueDate ? getOverdueDays(task.dueDate, task.status) : 0;
                  const rowColor = isCompleted 
                    ? "bg-green-50/70 border-l-4 border-l-green-500" 
                    : overdueDays > 3 
                      ? "bg-red-50 border-l-4 border-l-red-500"
                      : overdueDays > 0
                        ? "bg-amber-50 border-l-4 border-l-amber-500"
                        : "";
                  const isEditing = editingTaskId === task.id;
                  
                  return (
                  <TableRow key={task.id} className={cn(rowColor, "hover:bg-muted/50", isEditing && "bg-blue-50/50")}>
                    <TableCell style={{ paddingLeft: `${indent * 24 + 12}px` }}>
                      {isEditing ? (
                        <div className="space-y-1">
                          <Input
                            placeholder="Task title..."
                            value={editData.title}
                            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                            className="h-7 text-sm"
                            disabled={updating}
                          />
                          <Input
                            placeholder="Description..."
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            className="h-7 text-xs"
                            disabled={updating}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleToggleComplete(task.id, task.status)}
                            >
                              {task.status === 'Completed' ? (
                                <CheckSquare className="h-4 w-4 text-green-600" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            <Link
                              href={`/tasks/${task.id}`}
                              className="hover:text-primary hover:underline truncate text-sm"
                            >
                              {task.title}
                            </Link>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[300px] ml-7" title={task.description}>
                              {task.description}
                            </p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {isEditing ? (
                        <select
                          value={editData.assignedToId}
                          onChange={(e) => setEditData({ ...editData, assignedToId: e.target.value })}
                          className="w-full h-7 px-1 rounded border bg-background text-xs"
                          disabled={updating}
                        >
                          <option value="">Unassigned</option>
                          {allUsers.map((user) => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                          ))}
                        </select>
                      ) : (
                        task.assignedTo?.name || '-'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{getDuration(task)}</TableCell>
                    <TableCell className="text-sm">
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editData.taskInputDate}
                          onChange={(e) => setEditData({ ...editData, taskInputDate: e.target.value })}
                          className="h-7 text-xs w-28"
                          disabled={updating}
                        />
                      ) : (
                        task.taskInputDate ? formatDate(task.taskInputDate) : '-'
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editData.dueDate}
                          onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                          className="h-7 text-xs w-28"
                          disabled={updating}
                        />
                      ) : task.dueDate ? (
                        <span className={cn(
                          task.status !== 'Completed' && (() => {
                            const due = new Date(task.dueDate);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            due.setHours(0, 0, 0, 0);
                            const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            if (diffDays < 0) return 'text-red-600 font-medium';
                            if (diffDays <= 3) return 'text-orange-600 font-medium';
                            return '';
                          })()
                        )}>
                          {formatDate(task.dueDate)}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                          className="w-full h-7 px-1 rounded border bg-background text-xs"
                          disabled={updating}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      ) : (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColors[task.status as keyof typeof statusColors])}>
                          {task.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <select
                          value={editData.priority}
                          onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                          className="w-full h-7 px-1 rounded border bg-background text-xs"
                          disabled={updating}
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      ) : (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priorityColors[task.priority as keyof typeof priorityColors])}>
                          {task.priority}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {task.rejectedAt ? (
                          <div className="flex items-center gap-1">
                            <ShieldX className="h-4 w-4 text-red-600" />
                            <span className="text-[10px] text-red-600">Rejected</span>
                          </div>
                        ) : task.approvedAt ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleToggleApproval(task.id, true)}
                            title="Revoke approval"
                          >
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleToggleApproval(task.id, false)}
                              disabled={task.status !== 'Completed'}
                              title={task.status !== 'Completed' ? 'Task must be completed before approval' : 'Approve task'}
                            >
                              <Shield className={cn("h-4 w-4", task.status === 'Completed' ? "text-muted-foreground" : "text-muted-foreground/40")} />
                            </Button>
                            {task.status === 'Completed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleOpenRejectionDialog(task)}
                                title="Reject task"
                              >
                                <XCircle className="h-4 w-4 text-red-500 hover:text-red-600" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {task.createdBy?.name || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {task.status === 'Waiting for Approval' && task.completedAt
                        ? formatDate(task.completedAt)
                        : task.approvedAt
                          ? formatDate(task.approvedAt)
                          : '-'}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          placeholder="Remark..."
                          value={editData.remark}
                          onChange={(e) => setEditData({ ...editData, remark: e.target.value })}
                          className="h-7 text-xs w-24"
                          disabled={updating}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground truncate max-w-[100px] block" title={task.remark || ''}>
                          {task.remark || '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          placeholder="Rev..."
                          value={editData.revision}
                          onChange={(e) => setEditData({ ...editData, revision: e.target.value })}
                          className="h-7 text-xs w-16 font-mono"
                          disabled={updating}
                        />
                      ) : (
                        <span className="text-xs font-mono">{task.revision || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" className="h-6 px-2 text-xs" onClick={handleQuickEdit} disabled={updating}>
                            {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleCancelEdit} disabled={updating}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0" 
                            title="Quick edit"
                            onClick={() => handleStartEdit(task)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/tasks/${task.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/tasks/${task.id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Full Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(task)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            {canEditTask && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(task.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
                };

                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task Name</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="min-w-[110px]">Start</TableHead>
                        <TableHead className="min-w-[110px]">Finish</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Approval</TableHead>
                        <TableHead>Requester</TableHead>
                        <TableHead>Release Date</TableHead>
                        <TableHead>Remark</TableHead>
                        <TableHead>Revision</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from(projectGroups.entries()).map(([projectId, { project, buildings }]) => {
                        const isProjectExpanded = expandedProjects.has(projectId);
                        const projectTasks = Array.from(buildings.values()).flatMap(b => b.tasks);
                        const completedCount = projectTasks.filter(t => t.status === 'Completed').length;

                        return (
                          <React.Fragment key={projectId}>
                            <TableRow
                              className="bg-blue-50 hover:bg-blue-100 cursor-pointer font-semibold border-l-4 border-l-blue-500"
                              onClick={() => toggleProject(projectId)}
                            >
                              <TableCell className="py-2.5">
                                <div className="flex items-center gap-1.5">
                                  {isProjectExpanded ? <ChevronDown className="size-4 text-blue-600" /> : <ChevronRight className="size-4 text-blue-600" />}
                                  <span className="text-blue-700 font-semibold">Project# {project?.projectNumber}</span>
                                  <span className="text-xs font-normal text-blue-600/70 ml-1">- {project?.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{projectTasks.length} tasks</TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground">{completedCount}/{projectTasks.length}</span>
                              </TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                            </TableRow>

                            {isProjectExpanded && Array.from(buildings.entries()).map(([buildingId, { building, tasks: bTasks }]) => {
                              const isBuildingExpanded = expandedBuildings.has(`${projectId}-${buildingId}`);
                              const bCompleted = bTasks.filter(t => t.status === 'Completed').length;

                              return (
                                <React.Fragment key={buildingId}>
                                  <TableRow
                                    className="bg-amber-50 hover:bg-amber-100 cursor-pointer border-l-4 border-l-amber-500"
                                    onClick={() => toggleBuilding(`${projectId}-${buildingId}`)}
                                  >
                                    <TableCell className="py-2" style={{ paddingLeft: '36px' }}>
                                      <div className="flex items-center gap-1.5 font-medium">
                                        {isBuildingExpanded ? <ChevronDown className="size-3.5 text-amber-600" /> : <ChevronRight className="size-3.5 text-amber-600" />}
                                        <span className="text-amber-700">{building ? building.name : 'No Building'}</span>
                                        {building && <span className="text-xs font-normal text-amber-600/70">({building.designation})</span>}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{bTasks.length} tasks</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell>
                                      <span className="text-xs text-muted-foreground">{bCompleted}/{bTasks.length}</span>
                                    </TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                  </TableRow>

                                  {isBuildingExpanded && (() => {
                                    const activityGroups = new Map<string, { name: string; tasks: Task[] }>();
                                    bTasks.forEach(task => {
                                      const actKey = task.department?.id || '__no_dept__';
                                      const actName = task.department?.name || 'General';
                                      if (!activityGroups.has(actKey)) {
                                        activityGroups.set(actKey, { name: actName, tasks: [] });
                                      }
                                      activityGroups.get(actKey)!.tasks.push(task);
                                    });

                                    return Array.from(activityGroups.entries()).map(([actKey, { name: actName, tasks: actTasks }]) => {
                                      const isActivityExpanded = expandedActivities.has(`${projectId}-${buildingId}-${actKey}`);
                                      const toggleActivity = () => {
                                        setExpandedActivities(prev => {
                                          const next = new Set(prev);
                                          const key = `${projectId}-${buildingId}-${actKey}`;
                                          next.has(key) ? next.delete(key) : next.add(key);
                                          return next;
                                        });
                                      };

                                      return (
                                        <React.Fragment key={actKey}>
                                          <TableRow
                                            className="bg-purple-50 hover:bg-purple-100 cursor-pointer border-l-4 border-l-purple-400"
                                            onClick={toggleActivity}
                                          >
                                            <TableCell className="py-1.5" style={{ paddingLeft: '60px' }}>
                                              <div className="flex items-center gap-1.5 font-medium text-sm">
                                                {isActivityExpanded ? <ChevronDown className="size-3 text-purple-500" /> : <ChevronRight className="size-3 text-purple-500" />}
                                                <span className="text-purple-700">{actName}</span>
                                                <span className="text-xs font-normal text-purple-500/70">({actTasks.length})</span>
                                              </div>
                                            </TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                          </TableRow>
                                          {isActivityExpanded && actTasks.map(task => renderTaskRow(task, 4))}
                                        </React.Fragment>
                                      );
                                    });
                                  })()}
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}

                      {/* Tasks without project */}
                      {noProjectTasks.length > 0 && (
                        <>
                          <TableRow className="bg-gray-50 font-semibold">
                            <TableCell className="py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-700">Unassigned to Project</span>
                                <span className="text-xs font-normal text-muted-foreground">({noProjectTasks.length} tasks)</span>
                              </div>
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                          {noProjectTasks.map(task => renderTaskRow(task, 1))}
                        </>
                      )}

                      {filteredTasks.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                            No tasks found matching your filters
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
      <AlertDialog />
      
      {/* Rejection Dialog */}
      {rejectionDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Reject Task
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You are about to reject the task: <strong>{rejectionDialog.task?.title}</strong>
              </p>
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason (Optional)</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Enter reason for rejection..."
                  value={rejectionDialog.reason}
                  onChange={(e) => setRejectionDialog({ ...rejectionDialog, reason: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  Would you like to create a new revision of this task to track the rework?
                </p>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button
                variant="outline"
                onClick={() => setRejectionDialog({ open: false, taskId: null, task: null, reason: '' })}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRejectTask(false)}
              >
                Reject Only
              </Button>
              <Button
                onClick={() => handleRejectTask(true)}
              >
                Reject & Create Revision
              </Button>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
