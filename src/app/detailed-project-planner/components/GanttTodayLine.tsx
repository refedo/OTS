'use client';

import { TimeScale, COLORS, ROW_HEIGHT } from '../lib/types';
import { daysBetween } from '../lib/dateUtils';

interface GanttTodayLineProps {
  timeScale: TimeScale;
  totalRows: number;
}

export function GanttTodayLine({ timeScale, totalRows }: GanttTodayLineProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if today is within the visible range
  if (today < timeScale.startDate || today > timeScale.endDate) return null;

  const x = daysBetween(timeScale.startDate, today) * timeScale.pixelsPerDay;
  const totalHeight = timeScale.headerHeight + totalRows * ROW_HEIGHT;

  return (
    <g>
      {/* Today line */}
      <line
        x1={x}
        y1={0}
        x2={x}
        y2={totalHeight}
        stroke={COLORS.ganttTodayLine}
        strokeWidth={1.5}
        strokeDasharray="6,3"
      />

      {/* Today label at top */}
      <rect
        x={x - 20}
        y={2}
        width={40}
        height={16}
        rx={3}
        fill={COLORS.ganttTodayLine}
      />
      <text
        x={x}
        y={14}
        textAnchor="middle"
        style={{
          fontSize: '10px',
          fill: 'white',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          fontWeight: 600,
        }}
      >
        Today
      </text>
    </g>
  );
}
