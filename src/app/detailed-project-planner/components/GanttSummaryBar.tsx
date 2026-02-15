'use client';

import { TaskNode, COLORS, ROW_HEIGHT, TimeScale } from '../lib/types';
import { daysBetween } from '../lib/dateUtils';

interface GanttSummaryBarProps {
  task: TaskNode;
  timeScale: TimeScale;
  isSelected: boolean;
  onClick: (taskId: string) => void;
}

export function GanttSummaryBar({
  task,
  timeScale,
  isSelected,
  onClick,
}: GanttSummaryBarProps) {
  if (!task.startDate || !task.endDate) return null;
  if (!(task.isSummary || task.children.length > 0)) return null;

  const startDate = new Date(task.startDate);
  const endDate = new Date(task.endDate);

  const x = daysBetween(timeScale.startDate, startDate) * timeScale.pixelsPerDay;
  const durationDays = Math.max(1, daysBetween(startDate, endDate));
  const width = Math.max(durationDays * timeScale.pixelsPerDay, 8);
  const y = task.rowIndex * ROW_HEIGHT + timeScale.headerHeight;

  // MS Project summary bar: thin bar with downward triangles at each end
  const barHeight = 3;
  const barY = y + ROW_HEIGHT * 0.35;
  const triangleSize = 8;
  const triangleHeight = 6;

  const color = isSelected ? '#111111' : COLORS.ganttSummary;

  return (
    <g
      className="gantt-summary-bar cursor-pointer"
      onClick={() => onClick(task.id)}
    >
      {/* Thin horizontal bar */}
      <rect
        x={x}
        y={barY}
        width={width}
        height={barHeight}
        fill={color}
      />

      {/* Left downward triangle ▼ */}
      <polygon
        points={`
          ${x},${barY}
          ${x + triangleSize},${barY}
          ${x + triangleSize / 2},${barY + triangleHeight}
        `}
        fill={color}
      />

      {/* Right downward triangle ▼ */}
      <polygon
        points={`
          ${x + width - triangleSize},${barY}
          ${x + width},${barY}
          ${x + width - triangleSize / 2},${barY + triangleHeight}
        `}
        fill={color}
      />

      {/* Progress indicator on summary bar */}
      {task.progress > 0 && (
        <rect
          x={x}
          y={barY - 1}
          width={(task.progress / 100) * width}
          height={barHeight + 2}
          fill={color}
          opacity={0.6}
        />
      )}
    </g>
  );
}
