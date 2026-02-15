'use client';

import { TaskNode, COLORS, ROW_HEIGHT, TimeScale } from '../lib/types';
import { daysBetween } from '../lib/dateUtils';

interface GanttMilestoneProps {
  task: TaskNode;
  timeScale: TimeScale;
  isSelected: boolean;
  onClick: (taskId: string) => void;
}

export function GanttMilestone({
  task,
  timeScale,
  isSelected,
  onClick,
}: GanttMilestoneProps) {
  if (!task.startDate) return null;
  if (!task.isMilestone) return null;

  const startDate = new Date(task.startDate);
  const x = daysBetween(timeScale.startDate, startDate) * timeScale.pixelsPerDay;
  const y = task.rowIndex * ROW_HEIGHT + timeScale.headerHeight;
  const centerY = y + ROW_HEIGHT / 2;
  const size = 6;

  const color = isSelected ? '#000000' : COLORS.ganttMilestone;

  return (
    <g
      className="gantt-milestone cursor-pointer"
      onClick={() => onClick(task.id)}
    >
      {/* Diamond shape ◆ */}
      <polygon
        points={`
          ${x},${centerY - size}
          ${x + size},${centerY}
          ${x},${centerY + size}
          ${x - size},${centerY}
        `}
        fill={color}
        stroke={isSelected ? '#000' : 'none'}
        strokeWidth={isSelected ? 1 : 0}
      />
    </g>
  );
}
