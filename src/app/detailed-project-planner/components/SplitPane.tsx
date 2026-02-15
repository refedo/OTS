'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MIN_TABLE_WIDTH, MIN_GANTT_WIDTH, DEFAULT_SPLIT_PERCENT } from '../lib/types';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export function SplitPane({ left, right }: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitPercent, setSplitPercent] = useState(DEFAULT_SPLIT_PERCENT);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalWidth = rect.width;
      const x = e.clientX - rect.left;

      // Enforce minimum widths
      const minLeftPercent = MIN_TABLE_WIDTH / totalWidth;
      const maxLeftPercent = 1 - MIN_GANTT_WIDTH / totalWidth;

      const newPercent = Math.max(minLeftPercent, Math.min(maxLeftPercent, x / totalWidth));
      setSplitPercent(newPercent);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full overflow-hidden"
      style={{ cursor: isDragging ? 'col-resize' : undefined }}
    >
      {/* Left Panel */}
      <div
        className="h-full overflow-hidden flex-shrink-0"
        style={{ width: `${splitPercent * 100}%` }}
      >
        {left}
      </div>

      {/* Divider */}
      <div
        className="h-full flex-shrink-0 relative group"
        style={{ width: '5px', cursor: 'col-resize' }}
        onMouseDown={handleMouseDown}
      >
        <div className={`absolute inset-0 transition-colors ${isDragging ? 'bg-blue-500' : 'bg-gray-300 group-hover:bg-blue-400'}`} />
      </div>

      {/* Right Panel */}
      <div className="h-full overflow-hidden flex-1">
        {right}
      </div>
    </div>
  );
}
