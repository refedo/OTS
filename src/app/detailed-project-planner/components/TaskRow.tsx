'use client';

import { useState, useRef, useEffect } from 'react';
import { TaskNode, LEVEL_INDENT, COLORS, ROW_HEIGHT } from '../lib/types';
import { formatDateMSProject, formatDuration } from '../lib/dateUtils';
import { ChevronRight, ChevronDown, Pin } from 'lucide-react';

interface TaskRowProps {
  task: TaskNode;
  rowIndex: number;
  isSelected: boolean;
  onSelect: (taskId: string) => void;
  onToggleCollapse: (taskId: string) => void;
  onUpdateTask: (taskId: string, field: string, value: string) => void;
  onContextMenu: (e: React.MouseEvent, taskId: string) => void;
}

export function TaskRow({
  task,
  rowIndex,
  isSelected,
  onSelect,
  onToggleCollapse,
  onUpdateTask,
  onContextMenu,
}: TaskRowProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const startEdit = (field: string, value: string) => {
    // Don't allow editing dates on summary tasks
    if (task.isSummary && (field === 'startDate' || field === 'endDate' || field === 'durationDays')) {
      return;
    }
    setEditingField(field);
    setEditValue(value);
  };

  const commitEdit = () => {
    if (editingField && editValue !== undefined) {
      onUpdateTask(task.id, editingField, editValue);
    }
    setEditingField(null);
  };

  const cancelEdit = () => {
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') cancelEdit();
    if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
    }
  };

  const indent = LEVEL_INDENT[task.level] || 0;
  const isSummary = task.isSummary || task.children.length > 0;
  const hasChildren = task.children.length > 0;

  return (
    <div
      className={`flex items-center border-b select-none transition-colors`}
      style={{
        height: `${ROW_HEIGHT}px`,
        lineHeight: `${ROW_HEIGHT}px`,
        backgroundColor: isSelected ? COLORS.tableRowSelected : undefined,
        borderColor: COLORS.tableBorder,
      }}
      onClick={() => onSelect(task.id)}
      onContextMenu={e => onContextMenu(e, task.id)}
      onMouseEnter={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = COLORS.tableRowHover;
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = '';
        }
      }}
    >
      {/* ID Column */}
      <div
        className="flex-shrink-0 text-center text-[13px] text-gray-500 border-r"
        style={{ width: '40px', borderColor: COLORS.tableBorder }}
      >
        {rowIndex + 1}
      </div>

      {/* Task Mode Column */}
      <div
        className="flex-shrink-0 flex items-center justify-center border-r"
        style={{ width: '30px', borderColor: COLORS.tableBorder }}
      >
        <Pin className={`w-3 h-3 ${task.taskMode === 'manual' ? 'text-blue-500' : 'text-gray-300'}`} />
      </div>

      {/* Task Name Column */}
      <div
        className="flex-1 min-w-0 flex items-center border-r overflow-hidden"
        style={{ borderColor: COLORS.tableBorder }}
      >
        <div style={{ paddingLeft: `${indent + 4}px` }} className="flex items-center gap-1 min-w-0 flex-1">
          {/* Collapse/Expand Toggle */}
          {hasChildren ? (
            <button
              onClick={e => {
                e.stopPropagation();
                onToggleCollapse(task.id);
              }}
              className="flex-shrink-0 p-0.5 hover:bg-gray-200 rounded"
            >
              {task.collapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              )}
            </button>
          ) : (
            <span className="w-[18px] flex-shrink-0" />
          )}

          {/* Task Name */}
          {editingField === 'name' ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-0 text-[13px] px-1 py-0 border border-blue-400 rounded outline-none bg-white"
              style={{ fontWeight: isSummary ? 600 : 400 }}
            />
          ) : (
            <span
              className="truncate text-[13px] cursor-text"
              style={{ fontWeight: isSummary ? 600 : 400 }}
              onDoubleClick={() => startEdit('name', task.name)}
              title={task.name}
            >
              {task.name}
            </span>
          )}
        </div>
      </div>

      {/* Duration Column */}
      <div
        className="flex-shrink-0 text-right px-2 border-r text-[13px]"
        style={{ width: '90px', borderColor: COLORS.tableBorder }}
      >
        {editingField === 'durationDays' ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-full text-right text-[13px] px-1 py-0 border border-blue-400 rounded outline-none bg-white"
          />
        ) : (
          <span
            className={`cursor-text ${task.isSummary ? 'text-gray-500' : ''}`}
            onDoubleClick={() =>
              startEdit('durationDays', task.durationDays != null ? String(Number(task.durationDays)) : '')
            }
          >
            {formatDuration(task.durationDays != null ? Number(task.durationDays) : null)}
          </span>
        )}
      </div>

      {/* Start Date Column */}
      <div
        className="flex-shrink-0 px-2 border-r text-[13px]"
        style={{ width: '110px', borderColor: COLORS.tableBorder }}
      >
        {editingField === 'startDate' ? (
          <input
            ref={inputRef}
            type="date"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-full text-[13px] px-1 py-0 border border-blue-400 rounded outline-none bg-white"
          />
        ) : (
          <span
            className={`cursor-text ${task.isSummary ? 'text-gray-500' : ''}`}
            onDoubleClick={() => {
              const dateStr = task.startDate
                ? new Date(task.startDate).toISOString().split('T')[0]
                : '';
              startEdit('startDate', dateStr);
            }}
          >
            {formatDateMSProject(task.startDate)}
          </span>
        )}
      </div>

      {/* Finish Date Column */}
      <div
        className="flex-shrink-0 px-2 text-[13px]"
        style={{ width: '110px' }}
      >
        {editingField === 'endDate' ? (
          <input
            ref={inputRef}
            type="date"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-full text-[13px] px-1 py-0 border border-blue-400 rounded outline-none bg-white"
          />
        ) : (
          <span
            className={`cursor-text ${task.isSummary ? 'text-gray-500' : ''}`}
            onDoubleClick={() => {
              const dateStr = task.endDate
                ? new Date(task.endDate).toISOString().split('T')[0]
                : '';
              startEdit('endDate', dateStr);
            }}
          >
            {formatDateMSProject(task.endDate)}
          </span>
        )}
      </div>
    </div>
  );
}
