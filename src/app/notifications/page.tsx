'use client';

/**
 * Notifications Page
 * Full-page notification center with filters and bulk actions
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
  Filter,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);

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

  const fetchAISummary = async () => {
    try {
      setLoadingSummary(true);
      const response = await fetch('/api/notifications/summary');
      if (response.ok) {
        const data = await response.json();
        setAiSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching AI summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    let filters = '';

    switch (tab) {
      case 'unread':
        filters = 'isRead=false&isArchived=false';
        break;
      case 'approvals':
        filters = 'type=APPROVAL_REQUIRED&isArchived=false';
        break;
      case 'deadlines':
        filters = 'type=DEADLINE_WARNING&isArchived=false';
        break;
      case 'archived':
        filters = 'isArchived=true';
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
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

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
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'APPROVAL_REQUIRED':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'DEADLINE_WARNING':
        return <Clock className="h-5 w-5 text-red-500" />;
      case 'APPROVED':
        return <CheckCheck className="h-5 w-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'SYSTEM':
        return <Info className="h-5 w-5 text-gray-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const getDeadlineBadge = (deadlineAt?: string) => {
    if (!deadlineAt) return null;

    const deadline = new Date(deadlineAt);
    const now = new Date();
    const hoursRemaining = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (hoursRemaining < 0) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
          Overdue
        </span>
      );
    } else if (hoursRemaining < 24) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
          {hoursRemaining}h left
        </span>
      );
    } else if (hoursRemaining < 48) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
          {Math.floor(hoursRemaining / 24)}d left
        </span>
      );
    }

    return null;
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notification Center</h1>
        <p className="text-muted-foreground">
          Stay updated with tasks, approvals, and deadlines
        </p>
      </div>

      {/* AI Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  AI Summary
                </CardTitle>
                <CardDescription>
                  Get a quick overview of your pending notifications
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {aiSummary && (
                <Button
                  onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
                  variant="ghost"
                  size="icon"
                >
                  {isSummaryCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                onClick={fetchAISummary}
                disabled={loadingSummary}
                variant="outline"
              >
                {loadingSummary ? 'Generating...' : 'Generate Summary'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {aiSummary && !isSummaryCollapsed && (
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-line">{aiSummary}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button onClick={markAllAsRead} variant="outline" size="sm">
          <CheckCheck className="h-4 w-4 mr-2" />
          Mark all as read
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                <p className="text-muted-foreground">
                  You're all caught up! Check back later for updates.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="font-semibold text-base mb-1">
                              {notification.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="h-3 w-3 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          {getDeadlineBadge(notification.deadlineAt)}
                          <span className="text-xs px-2 py-1 rounded-full bg-muted">
                            {notification.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveNotification(notification.id);
                          }}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
