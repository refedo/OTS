'use client';

/**
 * Notification Context
 * Provides real-time notification state management across the application
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface NotificationContextType {
  unreadCount: number;
  totalAlertCount: number; // Total of delayed tasks + underperforming schedules
  delayedTasksCount: number;
  deadlinesCount: number;
  refreshUnreadCount: () => Promise<void>;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalAlertCount, setTotalAlertCount] = useState(0);
  const [delayedTasksCount, setDelayedTasksCount] = useState(0);
  const [deadlinesCount, setDeadlinesCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      // Fetch all counts in parallel for faster loading
      const [notificationsRes, delayedTasksRes, schedulesRes] = await Promise.all([
        fetch('/api/notifications?isRead=false&limit=1'),
        fetch('/api/notifications/delayed-tasks'),
        fetch('/api/notifications/underperforming-schedules'),
      ]);

      let unread = 0;
      let delayedCount = 0;
      let schedulesCount = 0;

      if (notificationsRes.ok) {
        const data = await notificationsRes.json();
        unread = data.unreadCount || 0;
      }

      if (delayedTasksRes.ok) {
        const delayedData = await delayedTasksRes.json();
        delayedCount = delayedData.total || 0;
      }

      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        schedulesCount = schedulesData.total || 0;
      }

      // Update all states
      setUnreadCount(unread);
      setDelayedTasksCount(delayedCount);
      setDeadlinesCount(schedulesCount);
      setTotalAlertCount(unread + delayedCount + schedulesCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  const decrementUnreadCount = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    
    // Poll every 60 seconds (reduced from 30s to minimize server load)
    const interval = setInterval(refreshUnreadCount, 60000);
    
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        totalAlertCount,
        delayedTasksCount,
        deadlinesCount,
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
