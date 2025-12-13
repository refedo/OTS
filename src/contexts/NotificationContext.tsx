'use client';

/**
 * Notification Context
 * Provides real-time notification state management across the application
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface NotificationContextType {
  unreadCount: number;
  totalAlertCount: number; // Total of delayed tasks + underperforming schedules
  refreshUnreadCount: () => Promise<void>;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalAlertCount, setTotalAlertCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      // Fetch unread notifications
      const response = await fetch('/api/notifications?isRead=false&limit=1');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }

      // Fetch delayed tasks count
      const delayedTasksRes = await fetch('/api/notifications/delayed-tasks');
      let delayedTasksCount = 0;
      if (delayedTasksRes.ok) {
        const delayedData = await delayedTasksRes.json();
        delayedTasksCount = delayedData.total || 0;
      }

      // Fetch underperforming schedules count
      const schedulesRes = await fetch('/api/notifications/underperforming-schedules');
      let schedulesCount = 0;
      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        schedulesCount = schedulesData.total || 0;
      }

      // Set total alert count (delayed tasks + underperforming schedules)
      setTotalAlertCount(delayedTasksCount + schedulesCount);
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
    
    // Poll every 30 seconds
    const interval = setInterval(refreshUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        totalAlertCount,
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
