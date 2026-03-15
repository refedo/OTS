'use client';

/**
 * Notification Panel Component
 * Actionable dropdown with complete/approve/reject actions per notification.
 * Clicking a notification marks it as read and removes it from the list.
 * "Clear All" archives all notifications.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  ExternalLink,
  Trash2,
  Check,
  X,
  ThumbsUp,
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
  metadata?: Record<string, unknown>;
}

interface NotificationPanelProps {
  onClose?: () => void;
}

const TYPE_FILTERS: Record<string, string> = {
  notifications: 'isArchived=false',
  tasks: 'type=TASK_ASSIGNED&isArchived=false',
  approvals: 'type=APPROVAL_REQUIRED&isArchived=false',
};

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notifications');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { refreshUnreadCount } = useNotifications();

  const fetchNotifications = useCallback(async (filters: string = '') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications?${filters}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(TYPE_FILTERS[activeTab] ?? TYPE_FILTERS.notifications);
  }, [activeTab, fetchNotifications]);

  const removeFromList = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    refreshUnreadCount();
  };

  const markAsReadAndRemove = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    removeFromList(id);
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsReadAndRemove(notification.id);

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

  const handleAction = async (
    e: React.MouseEvent,
    notification: Notification,
    action: 'complete' | 'approve' | 'reject'
  ) => {
    e.stopPropagation();
    setActionLoading(`${notification.id}-${action}`);
    try {
      const response = await fetch(`/api/notifications/${notification.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        removeFromList(notification.id);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const markAllAsRead = async () => {
    await fetch('/api/notifications/bulk-read', { method: 'POST' });
    fetchNotifications(TYPE_FILTERS[activeTab] ?? TYPE_FILTERS.notifications);
    refreshUnreadCount();
  };

  const clearAll = async () => {
    await fetch('/api/notifications/bulk-archive', { method: 'POST' });
    setNotifications([]);
    refreshUnreadCount();
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

  const getIconBg = (type: string) => {
    switch (type) {
      case 'APPROVED': return 'bg-green-100';
      case 'REJECTED': return 'bg-red-100';
      case 'DEADLINE_WARNING': return 'bg-orange-100';
      case 'APPROVAL_REQUIRED': return 'bg-orange-100';
      default: return 'bg-blue-100';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const getDeadlineBadge = (deadlineAt?: string) => {
    if (!deadlineAt) return null;
    const hoursRemaining = Math.floor((new Date(deadlineAt).getTime() - Date.now()) / (1000 * 60 * 60));
    if (hoursRemaining < 0) return <span className="text-xs font-semibold text-red-600">Overdue</span>;
    if (hoursRemaining < 24) return <span className="text-xs font-semibold text-red-600">{hoursRemaining}h left</span>;
    if (hoursRemaining < 48) return <span className="text-xs font-semibold text-orange-600">{Math.floor(hoursRemaining / 24)}d left</span>;
    return null;
  };

  const canComplete = (n: Notification) =>
    n.relatedEntityType === 'task' && n.type === 'TASK_ASSIGNED';
  const canApproveReject = (n: Notification) =>
    n.relatedEntityType === 'task' && n.type === 'APPROVAL_REQUIRED';

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col h-[520px]">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 h-7 px-2"
                >
                  Mark all read
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-xs text-red-500 hover:text-red-600 h-7 px-2"
                  title="Clear all notifications"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="w-full justify-start rounded-none border-b px-4 bg-transparent h-auto p-0 shrink-0">
          <TabsTrigger
            value="notifications"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-3 py-2 text-xs"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-3 py-2 text-xs"
          >
            Tasks
          </TabsTrigger>
          <TabsTrigger
            value="approvals"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-3 py-2 text-xs"
          >
            Approvals
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors border-l-4 ${
                      !notification.isRead
                        ? 'border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                        : 'border-l-transparent'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${getIconBg(notification.type)}`}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-medium text-xs text-foreground leading-tight">
                            {notification.title}
                            {!notification.isRead && (
                              <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-blue-500 align-middle" />
                            )}
                          </h4>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        {getDeadlineBadge(notification.deadlineAt)}

                        {/* Action buttons */}
                        {(canComplete(notification) || canApproveReject(notification)) && (
                          <div className="flex gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                            {canComplete(notification) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px] text-green-700 border-green-300 hover:bg-green-50 hover:text-green-800"
                                disabled={actionLoading === `${notification.id}-complete`}
                                onClick={(e) => handleAction(e, notification, 'complete')}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                            )}
                            {canApproveReject(notification) && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px] text-green-700 border-green-300 hover:bg-green-50 hover:text-green-800"
                                  disabled={actionLoading === `${notification.id}-approve`}
                                  onClick={(e) => handleAction(e, notification, 'approve')}
                                >
                                  <ThumbsUp className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px] text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                                  disabled={actionLoading === `${notification.id}-reject`}
                                  onClick={(e) => handleAction(e, notification, 'reject')}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        )}
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
      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-xs"
          onClick={() => {
            router.push('/notifications');
            onClose?.();
          }}
        >
          View all notifications
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
