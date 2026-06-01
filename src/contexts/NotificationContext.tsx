'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const FAST_POLL_MS = 60_000;               // notifications + delayed tasks: every 60 s
const SCHEDULE_POLL_MS = 24 * 60 * 60 * 1000; // underperforming schedules: once per day

interface NotificationContextType {
  unreadCount: number;
  totalAlertCount: number;
  delayedTasksCount: number;
  deadlinesCount: number;
  taskMessageCount: number;
  refreshUnreadCount: () => Promise<void>;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [delayedTasksCount, setDelayedTasksCount] = useState(0);
  const [deadlinesCount, setDeadlinesCount] = useState(0);
  const [taskMessageCount, setTaskMessageCount] = useState(0);

  // Derived — no manual synchronisation needed
  const totalAlertCount = unreadCount + delayedTasksCount + deadlinesCount;

  // Fast-changing: unread notifications, delayed tasks, task messages — every 60 s
  const refreshCounts = useCallback(async () => {
    try {
      const [notificationsRes, delayedTasksRes, taskMsgRes] = await Promise.all([
        fetch('/api/notifications?isRead=false&limit=1'),
        fetch('/api/notifications/delayed-tasks'),
        fetch('/api/notifications?isRead=false&type=TASK_MESSAGE&limit=50'),
      ]);

      if (notificationsRes.ok) {
        const data = await notificationsRes.json() as { unreadCount?: number };
        setUnreadCount(data.unreadCount ?? 0);
      }
      if (delayedTasksRes.ok) {
        const data = await delayedTasksRes.json() as { total?: number };
        setDelayedTasksCount(data.total ?? 0);
      }
      if (taskMsgRes.ok) {
        const data = await taskMsgRes.json() as { total?: number };
        setTaskMessageCount(data.total ?? 0);
      }
    } catch {
      // non-critical polling failure — silent
    }
  }, []);

  // Slow-changing: schedule performance — once per day
  const refreshSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/underperforming-schedules');
      if (res.ok) {
        const data = await res.json() as { total?: number };
        setDeadlinesCount(data.total ?? 0);
      }
    } catch {
      // non-critical polling failure — silent
    }
  }, []);

  // Combined manual refresh (public API unchanged)
  const refreshUnreadCount = useCallback(async () => {
    await Promise.all([refreshCounts(), refreshSchedules()]);
  }, [refreshCounts, refreshSchedules]);

  const decrementUnreadCount = useCallback(() => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    refreshCounts();
    refreshSchedules();

    const fastInterval = setInterval(refreshCounts, FAST_POLL_MS);
    const slowInterval = setInterval(refreshSchedules, SCHEDULE_POLL_MS);

    return () => {
      clearInterval(fastInterval);
      clearInterval(slowInterval);
    };
  }, [refreshCounts, refreshSchedules]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        totalAlertCount,
        delayedTasksCount,
        deadlinesCount,
        taskMessageCount,
        refreshUnreadCount,
        decrementUnreadCount,
        resetUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
