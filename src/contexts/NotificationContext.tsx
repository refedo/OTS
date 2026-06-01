'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const POLL_MS = 60_000; // every 60 seconds

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
  const [taskMessageCount, setTaskMessageCount] = useState(0);

  // deadlinesCount (underperforming schedules) is fetched on-demand by the
  // notifications page itself — not polled globally to avoid expensive queries
  const deadlinesCount = 0;
  const totalAlertCount = unreadCount + delayedTasksCount;

  const refreshUnreadCount = useCallback(async () => {
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

  const decrementUnreadCount = useCallback(() => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, POLL_MS);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

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
