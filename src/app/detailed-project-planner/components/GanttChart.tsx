'use client';

import { forwardRef, useRef } from 'react';
import { TaskNode, TimeScale, ROW_HEIGHT, DragState } from '../lib/types';
import { GanttTimeScale } from './GanttTimeScale';
import { GanttBar } from './GanttBar';
import { GanttSummaryBar } from './GanttSummaryBar';
import { GanttMilestone } from './GanttMilestone';
import { GanttTodayLine } from './GanttTodayLine';

interface GanttChartProps {
  visibleTasks: TaskNode[];
  timeScale: TimeScale;
  totalWidth: number;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  dragState: DragState | null;
  dragTooltip: { x: number; y: number; text: string } | null;
  onBarMouseDown: (e: React.MouseEvent, taskId: string, type: 'move' | 'resize-left' | 'resize-right') => void;
  onScroll: () => void;
}

export const GanttChart = forwardRef<HTMLDivElement, GanttChartProps>(
  function GanttChart(
    {
      visibleTasks,
      timeScale,
      totalWidth,
      selectedTaskId,
      onSelectTask,
      dragState,
      dragTooltip,
      onBarMouseDown,
      onScroll,
    },
    ref
  ) {
    const totalHeight = timeScale.headerHeight + visibleTasks.length * ROW_HEIGHT;
    const svgRef = useRef<SVGSVGElement>(null);

    return (
      <div className="h-full flex flex-col">
        {/* Gantt scrollable area */}
        <div
          ref={ref}
          className="flex-1 overflow-auto relative"
          onScroll={onScroll}
        >
          <svg
            ref={svgRef}
            width={totalWidth}
            height={Math.max(totalHeight, 400)}
            className="select-none"
            style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
          >
            {/* Time scale header + grid lines */}
            <GanttTimeScale
              timeScale={timeScale}
              totalWidth={totalWidth}
              totalRows={visibleTasks.length}
            />

            {/* Summary bars (rendered first, behind regular bars) */}
            {visibleTasks.map(task => {
              if (task.isSummary || task.children.length > 0) {
                return (
                  <GanttSummaryBar
                    key={`summary-${task.id}`}
                    task={task}
                    timeScale={timeScale}
                    isSelected={selectedTaskId === task.id}
                    onClick={onSelectTask}
                  />
                );
              }
              return null;
            })}

            {/* Milestone markers */}
            {visibleTasks.map(task => {
              if (task.isMilestone) {
                return (
                  <GanttMilestone
                    key={`milestone-${task.id}`}
                    task={task}
                    timeScale={timeScale}
                    isSelected={selectedTaskId === task.id}
                    onClick={onSelectTask}
                  />
                );
              }
              return null;
            })}

            {/* Regular task bars */}
            {visibleTasks.map(task => {
              if (task.isMilestone) return null;
              if (task.isSummary || task.children.length > 0) return null;

              const isDragging = dragState?.taskId === task.id;

              return (
                <GanttBar
                  key={`bar-${task.id}`}
                  task={task}
                  timeScale={timeScale}
                  isSelected={selectedTaskId === task.id}
                  dragDayDelta={isDragging ? dragState.currentDayDelta : 0}
                  dragType={isDragging ? dragState.type : undefined}
                  onMouseDown={onBarMouseDown}
                  onClick={onSelectTask}
                />
              );
            })}

            {/* Today line */}
            <GanttTodayLine
              timeScale={timeScale}
              totalRows={visibleTasks.length}
            />
          </svg>

          {/* Drag tooltip */}
          {dragTooltip && (
            <div
              className="fixed z-50 bg-gray-800 text-white text-[11px] px-2 py-1 rounded shadow-lg pointer-events-none"
              style={{
                left: dragTooltip.x + 10,
                top: dragTooltip.y - 30,
              }}
            >
              {dragTooltip.text}
            </div>
          )}
        </div>
      </div>
    );
  }
);
