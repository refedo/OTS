'use client';

import { useRef, useCallback, useEffect } from 'react';

interface UseSyncScrollReturn {
  tableRef: React.RefObject<HTMLDivElement | null>;
  ganttRef: React.RefObject<HTMLDivElement | null>;
  handleTableScroll: () => void;
  handleGanttScroll: () => void;
}

export function useSyncScroll(): UseSyncScrollReturn {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const ganttRef = useRef<HTMLDivElement | null>(null);
  const isSyncing = useRef(false);

  const handleTableScroll = useCallback(() => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    if (tableRef.current && ganttRef.current) {
      ganttRef.current.scrollTop = tableRef.current.scrollTop;
    }

    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, []);

  const handleGanttScroll = useCallback(() => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    if (ganttRef.current && tableRef.current) {
      tableRef.current.scrollTop = ganttRef.current.scrollTop;
    }

    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, []);

  return {
    tableRef,
    ganttRef,
    handleTableScroll,
    handleGanttScroll,
  };
}
