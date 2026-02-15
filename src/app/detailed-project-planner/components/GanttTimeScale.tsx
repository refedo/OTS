'use client';

import { TimeScale, COLORS, ROW_HEIGHT } from '../lib/types';
import { getMonthYearLabel, isWeekend, getDateRange } from '../lib/dateUtils';

interface GanttTimeScaleProps {
  timeScale: TimeScale;
  totalWidth: number;
  totalRows: number;
}

export function GanttTimeScale({ timeScale, totalWidth, totalRows }: GanttTimeScaleProps) {
  const dates = getDateRange(timeScale.startDate, timeScale.endDate);
  const totalHeight = timeScale.headerHeight + totalRows * ROW_HEIGHT;

  // Group dates by month for top header
  const months: { label: string; startX: number; width: number }[] = [];
  let currentMonth = -1;
  let currentYear = -1;
  let monthStartX = 0;

  dates.forEach((date, i) => {
    const month = date.getMonth();
    const year = date.getFullYear();
    const x = i * timeScale.pixelsPerDay;

    if (month !== currentMonth || year !== currentYear) {
      if (currentMonth !== -1) {
        months[months.length - 1].width = x - monthStartX;
      }
      months.push({
        label: getMonthYearLabel(date),
        startX: x,
        width: 0,
      });
      currentMonth = month;
      currentYear = year;
      monthStartX = x;
    }
  });

  // Close last month
  if (months.length > 0) {
    months[months.length - 1].width = totalWidth - months[months.length - 1].startX;
  }

  // Determine which day labels to show based on zoom
  const showEveryNDays = timeScale.zoomLevel === 'day' ? 1 : timeScale.zoomLevel === 'week' ? 5 : 10;

  return (
    <g>
      {/* Header background */}
      <rect
        x={0}
        y={0}
        width={totalWidth}
        height={timeScale.headerHeight}
        fill={COLORS.ganttHeaderBg}
      />

      {/* Month headers (top row) */}
      {months.map((month, i) => (
        <g key={i}>
          <rect
            x={month.startX}
            y={0}
            width={month.width}
            height={25}
            fill={COLORS.ganttHeaderBg}
            stroke={COLORS.ganttGridLine}
            strokeWidth={0.5}
          />
          <text
            x={month.startX + month.width / 2}
            y={16}
            textAnchor="middle"
            className="select-none"
            style={{
              fontSize: '12px',
              fill: '#64748B',
              fontFamily: "'Segoe UI', system-ui, sans-serif",
              fontWeight: 500,
            }}
          >
            {month.label}
          </text>
        </g>
      ))}

      {/* Day numbers (bottom row) + vertical grid lines */}
      {dates.map((date, i) => {
        const x = i * timeScale.pixelsPerDay;
        const dayNum = date.getDate();
        const isFriday = isWeekend(date);
        const showLabel = dayNum % showEveryNDays === 0 || dayNum === 1;

        return (
          <g key={i}>
            {/* Weekend (Friday) column shading */}
            {isFriday && (
              <rect
                x={x}
                y={timeScale.headerHeight}
                width={timeScale.pixelsPerDay}
                height={totalHeight - timeScale.headerHeight}
                fill={COLORS.ganttWeekendBg}
                opacity={0.5}
              />
            )}

            {/* Day label */}
            {showLabel && (
              <text
                x={x + timeScale.pixelsPerDay / 2}
                y={40}
                textAnchor="middle"
                className="select-none"
                style={{
                  fontSize: '11px',
                  fill: isFriday ? '#EF4444' : '#94A3B8',
                  fontFamily: "'Segoe UI', system-ui, sans-serif",
                }}
              >
                {dayNum}
              </text>
            )}

            {/* Vertical grid line */}
            {(dayNum === 1 || (timeScale.zoomLevel === 'day' && true) || (timeScale.zoomLevel === 'week' && dayNum % 5 === 0)) && (
              <line
                x1={x}
                y1={timeScale.headerHeight}
                x2={x}
                y2={totalHeight}
                stroke={dayNum === 1 ? '#CBD5E1' : COLORS.ganttGridLine}
                strokeWidth={dayNum === 1 ? 1 : 0.5}
              />
            )}
          </g>
        );
      })}

      {/* Header bottom border */}
      <line
        x1={0}
        y1={timeScale.headerHeight}
        x2={totalWidth}
        y2={timeScale.headerHeight}
        stroke={COLORS.tableBorder}
        strokeWidth={1}
      />

      {/* Horizontal row grid lines */}
      {Array.from({ length: totalRows + 1 }).map((_, i) => (
        <line
          key={`row-${i}`}
          x1={0}
          y1={timeScale.headerHeight + i * ROW_HEIGHT}
          x2={totalWidth}
          y2={timeScale.headerHeight + i * ROW_HEIGHT}
          stroke={COLORS.ganttGridLine}
          strokeWidth={0.5}
        />
      ))}
    </g>
  );
}
