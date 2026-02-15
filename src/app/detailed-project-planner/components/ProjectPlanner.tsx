'use client';

import { useState, useCallback, useEffect } from 'react';
import { PlannerProjectData, ContextMenuState } from '../lib/types';
import { calculateDuration, toDateString, addWorkingDays } from '../lib/dateUtils';
import { getChildLevel } from '../lib/taskCalculations';
import { useTaskTree } from '../hooks/useTaskTree';
import { useTimeScale } from '../hooks/useTimeScale';
import { useSyncScroll } from '../hooks/useSyncScroll';
import { useGanttDrag } from '../hooks/useGanttDrag';
import { SplitPane } from './SplitPane';
import { Toolbar } from './Toolbar';
import { TaskTable } from './TaskTable';
import { GanttChart } from './GanttChart';
import { ContextMenu } from './ContextMenu';

interface ProjectPlannerProps {
  projects: PlannerProjectData[];
  initialProjectId?: string;
}

export function ProjectPlanner({ projects, initialProjectId }: ProjectPlannerProps) {
  const [projectList, setProjectList] = useState<PlannerProjectData[]>(projects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || null);
  const [isLoading, setIsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    taskId: null,
  });

  const {
    tree,
    visibleTasks,
    collapsedIds,
    selectedTaskId,
    toggleCollapse,
    collapseAll,
    expandAll,
    selectTask,
    setTasks,
    tasks,
    findTask,
  } = useTaskTree();

  const { timeScale, zoomLevel, setZoomLevel, totalWidth, dateToX, xToDate, pixelsToDays } =
    useTimeScale(visibleTasks);

  const { tableRef, ganttRef, handleTableScroll, handleGanttScroll } = useSyncScroll();

  const { dragState, dragTooltip, onDragStart, onDragMove, onDragEnd, isDragging } = useGanttDrag();

  // Fetch tasks when project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }

    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/detailed-project-planner/api/tasks?projectId=${selectedProjectId}`
        );
        if (res.ok) {
          const data = await res.json();
          setTasks(data);
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [selectedProjectId, setTasks]);

  // Global mouse move/up for drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      onDragMove(e.clientX, e.clientY, timeScale.pixelsPerDay);
    };

    const handleMouseUp = async () => {
      const result = onDragEnd();
      if (result) {
        await handleDragComplete(result.taskId, result.dayDelta, result.type);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onDragMove, onDragEnd, timeScale.pixelsPerDay]);

  // Handle drag complete - update task dates
  const handleDragComplete = async (
    taskId: string,
    dayDelta: number,
    type: 'move' | 'resize-left' | 'resize-right'
  ) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.startDate || !task.endDate) return;

    const msPerDay = 86400000;
    const startDate = new Date(task.startDate);
    const endDate = new Date(task.endDate);

    let newStart: Date;
    let newEnd: Date;

    if (type === 'move') {
      newStart = new Date(startDate.getTime() + dayDelta * msPerDay);
      newEnd = new Date(endDate.getTime() + dayDelta * msPerDay);
    } else if (type === 'resize-right') {
      newStart = startDate;
      newEnd = new Date(endDate.getTime() + dayDelta * msPerDay);
    } else {
      newStart = new Date(startDate.getTime() + dayDelta * msPerDay);
      newEnd = endDate;
    }

    const newDuration = calculateDuration(newStart, newEnd);

    try {
      const res = await fetch(`/detailed-project-planner/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: toDateString(newStart),
          endDate: toDateString(newEnd),
          durationDays: newDuration,
        }),
      });

      if (res.ok) {
        // Refresh all tasks to get recalculated parents
        await refreshTasks();
      }
    } catch (error) {
      console.error('Failed to update task after drag:', error);
    }
  };

  // Refresh tasks from server
  const refreshTasks = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(
        `/detailed-project-planner/api/tasks?projectId=${selectedProjectId}`
      );
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
    }
  };

  // Handle inline task update
  const handleUpdateTask = useCallback(
    async (taskId: string, field: string, value: string) => {
      const updateData: Record<string, unknown> = {};

      if (field === 'name') {
        updateData.name = value;
      } else if (field === 'startDate') {
        updateData.startDate = value || null;
        // Recalculate duration if both dates exist
        const task = tasks.find(t => t.id === taskId);
        if (task && value && task.endDate) {
          const dur = calculateDuration(new Date(value), new Date(task.endDate));
          updateData.durationDays = dur;
        }
      } else if (field === 'endDate') {
        updateData.endDate = value || null;
        const task = tasks.find(t => t.id === taskId);
        if (task && value && task.startDate) {
          const dur = calculateDuration(new Date(task.startDate), new Date(value));
          updateData.durationDays = dur;
        }
      } else if (field === 'durationDays') {
        const days = parseFloat(value);
        if (!isNaN(days)) {
          updateData.durationDays = days;
          // Calculate end date from start + duration
          const task = tasks.find(t => t.id === taskId);
          if (task && task.startDate) {
            const newEnd = addWorkingDays(new Date(task.startDate), Math.ceil(days));
            updateData.endDate = toDateString(newEnd);
          }
          if (days === 0) {
            updateData.isMilestone = true;
          }
        }
      }

      try {
        const res = await fetch(`/detailed-project-planner/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (res.ok) {
          await refreshTasks();
        }
      } catch (error) {
        console.error('Failed to update task:', error);
      }
    },
    [tasks, selectedProjectId]
  );

  // Add new task
  const handleAddTask = useCallback(async () => {
    if (!selectedProjectId) return;

    const selectedTask = selectedTaskId ? findTask(selectedTaskId) : null;
    let level = 'building';
    let parentId: string | null = null;

    if (selectedTask) {
      // Add at the same level as the selected task
      level = selectedTask.level;
      parentId = selectedTask.parentId;
    }

    // Default dates: today + 7 days
    const today = new Date();
    const endDate = addWorkingDays(today, 7);

    try {
      const res = await fetch('/detailed-project-planner/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plannerProjectId: selectedProjectId,
          parentId,
          name: 'New Task',
          level,
          startDate: toDateString(today),
          endDate: toDateString(endDate),
          durationDays: 7,
        }),
      });

      if (res.ok) {
        const newTask = await res.json();
        await refreshTasks();
        selectTask(newTask.id);
      }
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  }, [selectedProjectId, selectedTaskId, findTask, selectTask]);

  // Add sub-task
  const handleAddSubTask = useCallback(async () => {
    if (!selectedProjectId || !selectedTaskId) return;

    const parentTask = findTask(selectedTaskId);
    if (!parentTask) return;

    const childLevel = getChildLevel(parentTask.level);
    if (!childLevel) return;

    const today = new Date();
    const endDate = addWorkingDays(today, 7);

    try {
      const res = await fetch('/detailed-project-planner/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plannerProjectId: selectedProjectId,
          parentId: selectedTaskId,
          name: 'New Sub-Task',
          level: childLevel,
          startDate: toDateString(today),
          endDate: toDateString(endDate),
          durationDays: 7,
        }),
      });

      if (res.ok) {
        const newTask = await res.json();
        // Expand parent
        if (collapsedIds.has(selectedTaskId)) {
          toggleCollapse(selectedTaskId);
        }
        await refreshTasks();
        selectTask(newTask.id);
      }
    } catch (error) {
      console.error('Failed to add sub-task:', error);
    }
  }, [selectedProjectId, selectedTaskId, findTask, collapsedIds, toggleCollapse, selectTask]);

  // Delete task
  const handleDeleteTask = useCallback(async () => {
    if (!selectedTaskId) return;

    if (!confirm('Are you sure you want to delete this task and all its sub-tasks?')) return;

    try {
      const res = await fetch(`/detailed-project-planner/api/tasks/${selectedTaskId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        selectTask(null);
        await refreshTasks();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }, [selectedTaskId, selectTask]);

  // Indent task (make it a child of the task above it)
  const handleIndent = useCallback(async () => {
    if (!selectedTaskId) return;

    const taskIndex = visibleTasks.findIndex(t => t.id === selectedTaskId);
    if (taskIndex <= 0) return;

    const task = visibleTasks[taskIndex];
    const prevTask = visibleTasks[taskIndex - 1];

    // Can only indent if the previous task is at the same level or higher
    const currentLevelIdx = ['building', 'activity', 'sub_activity', 'sub_sub_activity'].indexOf(task.level);
    const prevLevelIdx = ['building', 'activity', 'sub_activity', 'sub_sub_activity'].indexOf(prevTask.level);

    if (currentLevelIdx > prevLevelIdx + 1) return; // Already too deep

    const newLevel = getChildLevel(prevTask.level);
    if (!newLevel) return;

    try {
      const res = await fetch(`/detailed-project-planner/api/tasks/${selectedTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: prevTask.id,
          level: newLevel,
        }),
      });

      if (res.ok) {
        await refreshTasks();
      }
    } catch (error) {
      console.error('Failed to indent task:', error);
    }
  }, [selectedTaskId, visibleTasks]);

  // Outdent task (move it up one level)
  const handleOutdent = useCallback(async () => {
    if (!selectedTaskId) return;

    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task || !task.parentId) return;

    const parent = tasks.find(t => t.id === task.parentId);
    if (!parent) return;

    const levelOrder = ['building', 'activity', 'sub_activity', 'sub_sub_activity'];
    const currentIdx = levelOrder.indexOf(task.level);
    if (currentIdx <= 0) return;

    try {
      const res = await fetch(`/detailed-project-planner/api/tasks/${selectedTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: parent.parentId,
          level: parent.level,
        }),
      });

      if (res.ok) {
        await refreshTasks();
      }
    } catch (error) {
      console.error('Failed to outdent task:', error);
    }
  }, [selectedTaskId, tasks]);

  // Context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    selectTask(taskId);
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      taskId,
    });
  }, [selectTask]);

  // Handle bar mouse down for drag
  const handleBarMouseDown = useCallback(
    (e: React.MouseEvent, taskId: string, type: 'move' | 'resize-left' | 'resize-right') => {
      const task = findTask(taskId);
      if (!task || task.isSummary) return;
      selectTask(taskId);
      onDragStart(taskId, type, e.clientX, task);
    },
    [findTask, selectTask, onDragStart]
  );

  // Handle project change
  const handleProjectChange = useCallback((projectId: string) => {
    setSelectedProjectId(projectId || null);
    selectTask(null);
  }, [selectTask]);

  const isAllCollapsed = visibleTasks.length > 0 && collapsedIds.size > 0 &&
    tree.every(node => node.children.length === 0 || collapsedIds.has(node.id));

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <Toolbar
        projects={projectList}
        selectedProjectId={selectedProjectId}
        onProjectChange={handleProjectChange}
        onAddTask={handleAddTask}
        onIndent={handleIndent}
        onOutdent={handleOutdent}
        onCollapseAll={collapseAll}
        onExpandAll={expandAll}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        isAllCollapsed={isAllCollapsed}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-2 bg-blue-50 text-blue-600 text-[13px]">
          Loading tasks...
        </div>
      )}

      {/* Main split panel */}
      {selectedProjectId ? (
        <div className="flex-1 overflow-hidden">
          <SplitPane
            left={
              <TaskTable
                ref={tableRef}
                visibleTasks={visibleTasks}
                selectedTaskId={selectedTaskId}
                onSelectTask={selectTask}
                onToggleCollapse={toggleCollapse}
                onUpdateTask={handleUpdateTask}
                onContextMenu={handleContextMenu}
                onScroll={handleTableScroll}
              />
            }
            right={
              <GanttChart
                ref={ganttRef}
                visibleTasks={visibleTasks}
                timeScale={timeScale}
                totalWidth={totalWidth}
                selectedTaskId={selectedTaskId}
                onSelectTask={selectTask}
                dragState={dragState}
                dragTooltip={dragTooltip}
                onBarMouseDown={handleBarMouseDown}
                onScroll={handleGanttScroll}
              />
            }
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <div className="text-lg font-medium mb-2">Select a Project</div>
            <div className="text-[13px]">
              Choose a project from the dropdown above to view its schedule
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      <ContextMenu
        state={contextMenu}
        onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
        onAddTask={handleAddTask}
        onAddSubTask={handleAddSubTask}
        onDeleteTask={handleDeleteTask}
        onIndent={handleIndent}
        onOutdent={handleOutdent}
      />
    </div>
  );
}
