'use client';

import { TaskNode, COLORS, ROW_HEIGHT, TimeScale } from '../lib/types';
import { daysBetween } from '../lib/dateUtils';

interface GanttBarProps {
  task: TaskNode;
  timeScale: TimeScale;
  isSelected: boolean;
  dragDayDelta?: number;
  dragType?: 'move' | 'resize-left' | 'resize-right';
  onMouseDown: (e: React.MouseEvent, taskId: string, type: 'move' | 'resize-left' | 'resize-right') => void;
  onClick: (taskId: string) => void;
}

export function GanttBar({
  task,
  timeScale,
  isSelected,
  dragDayDelta = 0,
  dragType,
  onMouseDown,
  onClick,
}: GanttBarProps) {
  if (!task.startDate || !task.endDate) return null;
  if (task.isSummary || task.children.length > 0) return null; // Summary bars rendered separately
  if (task.isMilestone) return null; // Milestones rendered separately

  const startDate = new Date(task.startDate);
  const endDate = new Date(task.endDate);

  // Apply drag delta
  const msPerDay = 86400000;
  let adjustedStart = startDate;
  let adjustedEnd = endDate;

  if (dragDayDelta !== 0) {
    if (dragType === 'move') {
      adjustedStart = new Date(startDate.getTime() + dragDayDelta * msPerDay);
      adjustedEnd = new Date(endDate.getTime() + dragDayDelta * msPerDay);
    } else if (dragType === 'resize-right') {
      adjustedEnd = new Date(endDate.getTime() + dragDayDelta * msPerDay);
    } else if (dragType === 'resize-left') {
      adjustedStart = new Date(startDate.getTime() + dragDayDelta * msPerDay);
    }
  }

  const x = daysBetween(timeScale.startDate, adjustedStart) * timeScale.pixelsPerDay;
  const durationDays = Math.max(1, daysBetween(adjustedStart, adjustedEnd));
  const width = Math.max(durationDays * timeScale.pixelsPerDay, 4);
  const y = task.rowIndex * ROW_HEIGHT + timeScale.headerHeight;
  const barHeight = ROW_HEIGHT * 0.5;
  const barY = y + (ROW_HEIGHT - barHeight) / 2;

  // Progress bar width
  const progressWidth = (task.progress / 100) * width;

  return (
    <g
      className="gantt-bar cursor-pointer"
      onClick={() => onClick(task.id)}
    >
      {/* Main bar */}
      <rect
        x={x}
        y={barY}
        width={width}
        height={barHeight}
        rx={2}
        ry={2}
        fill={isSelected ? COLORS.ganttBarHover : COLORS.ganttBar}
        stroke={isSelected ? '#2D8E94' : 'none'}
        strokeWidth={isSelected ? 1.5 : 0}
        className="transition-colors"
      />

      {/* Progress fill */}
      {task.progress > 0 && (
        <rect
          x={x}
          y={barY}
          width={Math.min(progressWidth, width)}
          height={barHeight}
          rx={2}
          ry={2}
          fill={COLORS.ganttBarProgress}
          opacity={0.8}
        />
      )}

      {/* Left resize handle */}
      <rect
        x={x - 2}
        y={barY}
        width={6}
        height={barHeight}
        fill="transparent"
        className="cursor-col-resize"
        onMouseDown={e => {
          e.stopPropagation();
          onMouseDown(e, task.id, 'resize-left');
        }}
      />

      {/* Right resize handle */}
      <rect
        x={x + width - 4}
        y={barY}
        width={6}
        height={barHeight}
        fill="transparent"
        className="cursor-col-resize"
        onMouseDown={e => {
          e.stopPropagation();
          onMouseDown(e, task.id, 'resize-right');
        }}
      />

      {/* Move handle (center area) */}
      <rect
        x={x + 6}
        y={barY}
        width={Math.max(width - 12, 0)}
        height={barHeight}
        fill="transparent"
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={e => {
          e.stopPropagation();
          onMouseDown(e, task.id, 'move');
        }}
      />
    </g>
  );
}
