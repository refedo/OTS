'use client';

import { useEffect, useRef } from 'react';
import { ContextMenuState } from '../lib/types';

interface ContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  onAddTask: () => void;
  onAddSubTask: () => void;
  onDeleteTask: () => void;
  onIndent: () => void;
  onOutdent: () => void;
}

export function ContextMenu({
  state,
  onClose,
  onAddTask,
  onAddSubTask,
  onDeleteTask,
  onIndent,
  onOutdent,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (state.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [state.visible, onClose]);

  if (!state.visible) return null;

  const menuItems = [
    { label: 'Add Task', action: onAddTask, icon: '➕' },
    { label: 'Add Sub-Task', action: onAddSubTask, icon: '📁', disabled: !state.taskId },
    { label: 'separator', action: () => {}, icon: '' },
    { label: 'Indent →', action: onIndent, icon: '→', disabled: !state.taskId },
    { label: 'Outdent ←', action: onOutdent, icon: '←', disabled: !state.taskId },
    { label: 'separator', action: () => {}, icon: '' },
    { label: 'Delete Task', action: onDeleteTask, icon: '🗑️', disabled: !state.taskId, danger: true },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]"
      style={{ left: state.x, top: state.y }}
    >
      {menuItems.map((item, index) => {
        if (item.label === 'separator') {
          return <div key={index} className="border-t border-gray-100 my-1" />;
        }

        const isDisabled = 'disabled' in item && item.disabled;
        const isDanger = 'danger' in item && item.danger;

        return (
          <button
            key={item.label}
            className={`w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2 transition-colors
              ${isDisabled
                ? 'text-gray-300 cursor-not-allowed'
                : isDanger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-blue-50'
              }`}
            onClick={() => {
              if (!isDisabled) {
                item.action();
                onClose();
              }
            }}
            disabled={isDisabled}
          >
            <span className="w-5 text-center">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
