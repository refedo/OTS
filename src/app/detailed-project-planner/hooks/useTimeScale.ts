'use client';

import { useState, useMemo, useCallback } from 'react';
import { TimeScale, ZoomLevel, ZOOM_PIXELS_PER_DAY, HEADER_HEIGHT, ROW_HEIGHT } from '../lib/types';
import { TaskNode } from '../lib/types';

interface UseTimeScaleReturn {
  timeScale: TimeScale;
  zoomLevel: ZoomLevel;
  setZoomLevel: (level: ZoomLevel) => void;
  totalWidth: number;
  dateToX: (date: Date) => number;
  xToDate: (x: number) => Date;
  pixelsToDays: (pixels: number) => number;
}

export function useTimeScale(visibleTasks: TaskNode[]): UseTimeScaleReturn {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');

  const timeScale = useMemo<TimeScale>(() => {
    const pixelsPerDay = ZOOM_PIXELS_PER_DAY[zoomLevel];

    // Calculate date range from tasks
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    visibleTasks.forEach(task => {
      if (task.startDate) {
        const start = new Date(task.startDate);
        if (!minDate || start < minDate) minDate = start;
      }
      if (task.endDate) {
        const end = new Date(task.endDate);
        if (!maxDate || end > maxDate) maxDate = end;
      }
    });

    // Default range if no tasks
    if (!minDate) minDate = new Date();
    if (!maxDate) {
      maxDate = new Date(minDate);
      maxDate.setMonth(maxDate.getMonth() + 3);
    }

    // Add buffer: 2 weeks before and 4 weeks after
    const startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - 14);
    // Align to start of month
    startDate.setDate(1);

    const endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + 28);

    return {
      startDate,
      endDate,
      pixelsPerDay,
      headerHeight: HEADER_HEIGHT,
      rowHeight: ROW_HEIGHT,
      zoomLevel,
    };
  }, [visibleTasks, zoomLevel]);

  const totalWidth = useMemo(() => {
    const msPerDay = 86400000;
    const days = Math.ceil(
      (timeScale.endDate.getTime() - timeScale.startDate.getTime()) / msPerDay
    );
    return Math.max(days * timeScale.pixelsPerDay, 800);
  }, [timeScale]);

  const dateToX = useCallback(
    (date: Date) => {
      const msPerDay = 86400000;
      const days =
        (date.getTime() - timeScale.startDate.getTime()) / msPerDay;
      return days * timeScale.pixelsPerDay;
    },
    [timeScale]
  );

  const xToDate = useCallback(
    (x: number) => {
      const days = x / timeScale.pixelsPerDay;
      const ms = days * 86400000;
      return new Date(timeScale.startDate.getTime() + ms);
    },
    [timeScale]
  );

  const pixelsToDays = useCallback(
    (pixels: number) => {
      return pixels / timeScale.pixelsPerDay;
    },
    [timeScale]
  );

  return {
    timeScale,
    zoomLevel,
    setZoomLevel,
    totalWidth,
    dateToX,
    xToDate,
    pixelsToDays,
  };
}
