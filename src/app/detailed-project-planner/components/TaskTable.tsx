'use client';

import { forwardRef } from 'react';
import { TaskNode, COLORS, ROW_HEIGHT } from '../lib/types';
import { TaskRow } from './TaskRow';

interface TaskTableProps {
  visibleTasks: TaskNode[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onToggleCollapse: (taskId: string) => void;
  onUpdateTask: (taskId: string, field: string, value: string) => void;
  onContextMenu: (e: React.MouseEvent, taskId: string) => void;
  onScroll: () => void;
}

export const TaskTable = forwardRef<HTMLDivElement, TaskTableProps>(
  function TaskTable(
    {
      visibleTasks,
      selectedTaskId,
      onSelectTask,
      onToggleCollapse,
      onUpdateTask,
      onContextMenu,
      onScroll,
    },
    ref
  ) {
    return (
      <div className="h-full flex flex-col" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        {/* Table Header */}
        <div
          className="flex items-center border-b flex-shrink-0 text-[12px] font-semibold text-gray-600"
          style={{
            height: '50px',
            backgroundColor: COLORS.tableHeaderBg,
            borderColor: COLORS.tableBorder,
          }}
        >
          <div
            className="flex-shrink-0 text-center border-r"
            style={{ width: '40px', borderColor: COLORS.tableBorder }}
          >
            ID
          </div>
          <div
            className="flex-shrink-0 text-center border-r"
            style={{ width: '30px', borderColor: COLORS.tableBorder }}
          >
            <span title="Task Mode">M</span>
          </div>
          <div
            className="flex-1 px-2 border-r"
            style={{ borderColor: COLORS.tableBorder }}
          >
            Task Name
          </div>
          <div
            className="flex-shrink-0 text-right px-2 border-r"
            style={{ width: '90px', borderColor: COLORS.tableBorder }}
          >
            Duration
          </div>
          <div
            className="flex-shrink-0 px-2 border-r"
            style={{ width: '110px', borderColor: COLORS.tableBorder }}
          >
            Start
          </div>
          <div
            className="flex-shrink-0 px-2"
            style={{ width: '110px' }}
          >
            Finish
          </div>
        </div>

        {/* Table Body */}
        <div
          ref={ref}
          className="flex-1 overflow-y-auto overflow-x-hidden"
          onScroll={onScroll}
        >
          {visibleTasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-[13px]">
              No tasks yet. Click &quot;Add Task&quot; to get started.
            </div>
          ) : (
            visibleTasks.map((task, index) => (
              <TaskRow
                key={task.id}
                task={task}
                rowIndex={index}
                isSelected={selectedTaskId === task.id}
                onSelect={onSelectTask}
                onToggleCollapse={onToggleCollapse}
                onUpdateTask={onUpdateTask}
                onContextMenu={onContextMenu}
              />
            ))
          )}
        </div>
      </div>
    );
  }
);
