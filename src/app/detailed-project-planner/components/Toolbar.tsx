'use client';

import { ZoomLevel } from '../lib/types';
import { PlannerProjectData } from '../lib/types';
import {
  Plus,
  IndentIncrease,
  IndentDecrease,
  ChevronsDownUp,
  ChevronsUpDown,
  ZoomIn,
  ZoomOut,
  Calendar,
} from 'lucide-react';

interface ToolbarProps {
  projects: PlannerProjectData[];
  selectedProjectId: string | null;
  onProjectChange: (projectId: string) => void;
  onAddTask: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  zoomLevel: ZoomLevel;
  onZoomChange: (level: ZoomLevel) => void;
  isAllCollapsed: boolean;
}

const zoomOptions: { value: ZoomLevel; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export function Toolbar({
  projects,
  selectedProjectId,
  onProjectChange,
  onAddTask,
  onIndent,
  onOutdent,
  onCollapseAll,
  onExpandAll,
  zoomLevel,
  onZoomChange,
  isAllCollapsed,
}: ToolbarProps) {
  const currentZoomIndex = zoomOptions.findIndex(z => z.value === zoomLevel);

  const handleZoomIn = () => {
    if (currentZoomIndex > 0) {
      onZoomChange(zoomOptions[currentZoomIndex - 1].value);
    }
  };

  const handleZoomOut = () => {
    if (currentZoomIndex < zoomOptions.length - 1) {
      onZoomChange(zoomOptions[currentZoomIndex + 1].value);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0">
      {/* Project Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <select
          value={selectedProjectId || ''}
          onChange={e => onProjectChange(e.target.value)}
          className="text-[13px] border border-gray-300 rounded px-2 py-1.5 bg-white min-w-[200px] focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select Project...</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Task Actions */}
      <button
        onClick={onAddTask}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        title="Add Task"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Task</span>
      </button>

      <button
        onClick={onIndent}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="Indent (make sub-task)"
      >
        <IndentIncrease className="w-4 h-4" />
      </button>

      <button
        onClick={onOutdent}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="Outdent (promote task)"
      >
        <IndentDecrease className="w-4 h-4" />
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Collapse/Expand */}
      <button
        onClick={isAllCollapsed ? onExpandAll : onCollapseAll}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        title={isAllCollapsed ? 'Expand All' : 'Collapse All'}
      >
        {isAllCollapsed ? (
          <>
            <ChevronsUpDown className="w-3.5 h-3.5" />
            <span>Expand</span>
          </>
        ) : (
          <>
            <ChevronsDownUp className="w-3.5 h-3.5" />
            <span>Collapse</span>
          </>
        )}
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleZoomIn}
          disabled={currentZoomIndex === 0}
          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="flex items-center bg-gray-100 rounded overflow-hidden">
          {zoomOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => onZoomChange(opt.value)}
              className={`px-2.5 py-1 text-[12px] font-medium transition-colors ${
                zoomLevel === opt.value
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleZoomOut}
          disabled={currentZoomIndex === zoomOptions.length - 1}
          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
