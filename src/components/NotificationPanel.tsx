'use client';

/**
 * Notification Panel Component
 * Displays list of notifications with tabs and actions
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Archive,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/contexts/NotificationContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  deadlineAt?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: any;
}

interface NotificationPanelProps {
  onClose?: () => void;
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notifications');
  const { refreshUnreadCount } = useNotifications();

  const fetchNotifications = async (filters: string = '') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications?${filters}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    let filters = '';

    switch (tab) {
      case 'tasks':
        filters = 'type=TASK_ASSIGNED&isArchived=false';
        break;
      case 'approvals':
        filters = 'type=APPROVAL_REQUIRED&isArchived=false';
        break;
      case 'deadlines':
        filters = 'type=DEADLINE_WARNING&isArchived=false';
        break;
      default:
        filters = 'isArchived=false';
    }

    fetchNotifications(filters);
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        refreshUnreadCount();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const archiveNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/archive`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        refreshUnreadCount();
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/bulk-read', {
        method: 'POST',
      });

      if (response.ok) {
        fetchNotifications();
        refreshUnreadCount();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate to related entity
    if (notification.relatedEntityType && notification.relatedEntityId) {
      const routes: Record<string, string> = {
        task: '/tasks',
        project: '/projects',
        rfi: '/qc/rfi',
        ncr: '/qc/ncr',
        document: '/documents',
      };

      const basePath = routes[notification.relatedEntityType];
      if (basePath) {
        router.push(`${basePath}?id=${notification.relatedEntityId}`);
        onClose?.();
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'APPROVAL_REQUIRED':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'DEADLINE_WARNING':
        return <Clock className="h-4 w-4 text-red-500" />;
      case 'APPROVED':
        return <CheckCheck className="h-4 w-4 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'SYSTEM':
        return <Info className="h-4 w-4 text-gray-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getDeadlineBadge = (deadlineAt?: string) => {
    if (!deadlineAt) return null;

    const deadline = new Date(deadlineAt);
    const now = new Date();
    const hoursRemaining = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (hoursRemaining < 0) {
      return <span className="text-xs font-semibold text-red-600">Overdue</span>;
    } else if (hoursRemaining < 24) {
      return <span className="text-xs font-semibold text-red-600">{hoursRemaining}h left</span>;
    } else if (hoursRemaining < 48) {
      return (
        <span className="text-xs font-semibold text-orange-600">
          {Math.floor(hoursRemaining / 24)}d left
        </span>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">Notifications</h3>
          <Button 
            variant="link" 
            size="sm" 
            onClick={markAllAsRead}
            className="text-blue-600 hover:text-blue-700 p-0 h-auto font-normal"
          >
            Mark as read
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b px-4 bg-transparent h-auto p-0">
          <TabsTrigger 
            value="notifications" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2"
          >
            Notifications
          </TabsTrigger>
          <TabsTrigger 
            value="tasks" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2"
          >
            Tasks
          </TabsTrigger>
          <TabsTrigger 
            value="approvals" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2"
          >
            Approvals
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 m-0">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${
                      !notification.isRead ? 'border-l-green-500 bg-green-50/30' : 'border-l-transparent'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          notification.type === 'APPROVED' ? 'bg-green-100' :
                          notification.type === 'REJECTED' ? 'bg-blue-100' :
                          notification.type === 'DEADLINE_WARNING' ? 'bg-orange-100' :
                          'bg-blue-100'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-gray-900 mb-0.5">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                              {notification.message}
                            </p>
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <Separator />
      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-between"
          onClick={() => {
            router.push('/notifications');
            onClose?.();
          }}
        >
          View all notifications
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
