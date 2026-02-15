'use client';

import { useState, useCallback, useRef } from 'react';
import { DragState, TaskNode } from '../lib/types';
import { formatDateMSProject } from '../lib/dateUtils';

interface UseGanttDragReturn {
  dragState: DragState | null;
  dragTooltip: { x: number; y: number; text: string } | null;
  onDragStart: (taskId: string, type: DragState['type'], startX: number, task: TaskNode) => void;
  onDragMove: (clientX: number, clientY: number, pixelsPerDay: number) => void;
  onDragEnd: () => { taskId: string; dayDelta: number; type: DragState['type'] } | null;
  isDragging: boolean;
}

export function useGanttDrag(): UseGanttDragReturn {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragTooltip, setDragTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const onDragStart = useCallback(
    (taskId: string, type: DragState['type'], startX: number, task: TaskNode) => {
      const state: DragState = {
        taskId,
        type,
        startX,
        originalStartDate: task.startDate ? new Date(task.startDate) : new Date(),
        originalEndDate: task.endDate ? new Date(task.endDate) : new Date(),
        currentDayDelta: 0,
      };
      setDragState(state);
      dragRef.current = state;
    },
    []
  );

  const onDragMove = useCallback(
    (clientX: number, clientY: number, pixelsPerDay: number) => {
      if (!dragRef.current) return;

      const pixelDelta = clientX - dragRef.current.startX;
      const dayDelta = Math.round(pixelDelta / pixelsPerDay);

      dragRef.current = { ...dragRef.current, currentDayDelta: dayDelta };
      setDragState({ ...dragRef.current });

      // Calculate new dates for tooltip
      const msPerDay = 86400000;
      let newStart: Date;
      let newEnd: Date;

      if (dragRef.current.type === 'move') {
        newStart = new Date(dragRef.current.originalStartDate.getTime() + dayDelta * msPerDay);
        newEnd = new Date(dragRef.current.originalEndDate.getTime() + dayDelta * msPerDay);
      } else if (dragRef.current.type === 'resize-right') {
        newStart = dragRef.current.originalStartDate;
        newEnd = new Date(dragRef.current.originalEndDate.getTime() + dayDelta * msPerDay);
      } else {
        newStart = new Date(dragRef.current.originalStartDate.getTime() + dayDelta * msPerDay);
        newEnd = dragRef.current.originalEndDate;
      }

      setDragTooltip({
        x: clientX,
        y: clientY,
        text: `${formatDateMSProject(newStart)} → ${formatDateMSProject(newEnd)}`,
      });
    },
    []
  );

  const onDragEnd = useCallback((): { taskId: string; dayDelta: number; type: DragState['type'] } | null => {
    if (!dragRef.current || dragRef.current.currentDayDelta === 0) {
      setDragState(null);
      setDragTooltip(null);
      dragRef.current = null;
      return null;
    }

    const result = {
      taskId: dragRef.current.taskId,
      dayDelta: dragRef.current.currentDayDelta,
      type: dragRef.current.type,
    };

    setDragState(null);
    setDragTooltip(null);
    dragRef.current = null;

    return result;
  }, []);

  return {
    dragState,
    dragTooltip,
    onDragStart,
    onDragMove,
    onDragEnd,
    isDragging: dragState !== null,
  };
}
