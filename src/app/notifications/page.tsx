'use client';

/**
 * Notifications Page
 * Full-page notification center with filters and bulk actions
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  AlertTriangle,
  Mail,
  MessageSquare,
  Phone,
  User,
  ChevronRight,
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

interface DelayedTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate: string;
  delayDays: number;
  delayStatus: 'critical' | 'warning' | 'minor';
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  project?: {
    projectNumber: string;
    name: string;
  };
  createdBy?: {
    name: string;
  };
}

interface UnderperformingSchedule {
  id: string;
  scopeType: string;
  scopeLabel: string;
  startDate: string;
  endDate: string;
  progress: number;
  expectedProgress: number;
  progressGap: number;
  status: 'critical' | 'at-risk';
  daysOverdue: number;
  project: {
    id: string;
    projectNumber: string;
    name: string;
  };
  building: {
    id: string;
    designation: string;
    name: string;
  };
}

// Component to format AI summary with colors and structure
function FormattedAISummary({ summary }: { summary: string }) {
  // Parse the summary into sections
  const formatSummary = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const sections: { type: 'header' | 'urgent' | 'warning' | 'info' | 'text'; content: string }[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Detect headers (lines ending with : or starting with numbers like "1.")
      if (/^(\d+\.|#{1,3}|•|\*\*).+:?$/.test(trimmed) || trimmed.endsWith(':')) {
        sections.push({ type: 'header', content: trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '') });
      }
      // Detect urgent items (containing urgent, critical, overdue, immediately)
      else if (/urgent|critical|overdue|immediate|asap/i.test(trimmed)) {
        sections.push({ type: 'urgent', content: trimmed.replace(/^[-•*]\s*/, '') });
      }
      // Detect warning items (containing warning, soon, pending, deadline)
      else if (/warning|soon|pending|deadline|approaching/i.test(trimmed)) {
        sections.push({ type: 'warning', content: trimmed.replace(/^[-•*]\s*/, '') });
      }
      // Detect info items (bullet points or numbered items)
      else if (/^[-•*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
        sections.push({ type: 'info', content: trimmed.replace(/^[-•*\d.]\s*/, '') });
      }
      // Regular text
      else {
        sections.push({ type: 'text', content: trimmed });
      }
    });

    return sections;
  };

  const sections = formatSummary(summary);

  return (
    <div className="space-y-3">
      {sections.map((section, index) => {
        switch (section.type) {
          case 'header':
            return (
              <h4 key={index} className="font-semibold text-gray-900 border-b border-gray-200 pb-1 mt-3 first:mt-0">
                {section.content}
              </h4>
            );
          case 'urgent':
            return (
              <div key={index} className="flex items-start gap-2 p-2 bg-red-50 border-l-4 border-red-500 rounded-r">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <span className="text-sm text-red-800">{section.content}</span>
              </div>
            );
          case 'warning':
            return (
              <div key={index} className="flex items-start gap-2 p-2 bg-orange-50 border-l-4 border-orange-500 rounded-r">
                <Clock className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                <span className="text-sm text-orange-800">{section.content}</span>
              </div>
            );
          case 'info':
            return (
              <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 border-l-4 border-blue-400 rounded-r">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <span className="text-sm text-blue-800">{section.content}</span>
              </div>
            );
          default:
            return (
              <p key={index} className="text-sm text-gray-700 leading-relaxed">
                {section.content}
              </p>
            );
        }
      })}
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [delayedTasks, setDelayedTasks] = useState<DelayedTask[]>([]);
  const [delayedTasksStats, setDelayedTasksStats] = useState({ total: 0, critical: 0, warning: 0, minor: 0 });
  const [loadingDelayedTasks, setLoadingDelayedTasks] = useState(true);
  const [underperformingSchedules, setUnderperformingSchedules] = useState<UnderperformingSchedule[]>([]);
  const [scheduleStats, setScheduleStats] = useState({ total: 0, critical: 0, atRisk: 0 });
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [collapsedActivities, setCollapsedActivities] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(tabParam || 'all');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);

  // Handle tab parameter from URL
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
      handleTabChange(tabParam);
    }
  }, [tabParam]);

  const fetchDelayedTasks = async () => {
    try {
      setLoadingDelayedTasks(true);
      console.log('Fetching delayed tasks...');
      const response = await fetch('/api/notifications/delayed-tasks');
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Delayed tasks data:', data);
        setDelayedTasks(data.tasks || []);
        setDelayedTasksStats({
          total: data.total || 0,
          critical: data.critical || 0,
          warning: data.warning || 0,
          minor: data.minor || 0,
        });
        console.log('Delayed tasks set:', data.tasks?.length || 0);
      } else {
        console.error('Failed to fetch delayed tasks:', response.status);
      }
    } catch (error) {
      console.error('Error fetching delayed tasks:', error);
    } finally {
      setLoadingDelayedTasks(false);
    }
  };

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

  const fetchUnderperformingSchedules = async () => {
    try {
      setLoadingSchedules(true);
      const response = await fetch('/api/notifications/underperforming-schedules');
      if (response.ok) {
        const data = await response.json();
        setUnderperformingSchedules(data.schedules || []);
        setScheduleStats({
          total: data.total || 0,
          critical: data.critical || 0,
          atRisk: data.atRisk || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching underperforming schedules:', error);
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchDelayedTasks();
    fetchUnderperformingSchedules();
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
      <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-purple-900">
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
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loadingSummary ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Summary
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {aiSummary && !isSummaryCollapsed && (
          <CardContent>
            <div className="bg-white rounded-lg p-4 border border-purple-100 shadow-sm">
              <FormattedAISummary summary={aiSummary} />
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
          <TabsTrigger value="delayed-tasks" className="relative">
            Delayed Tasks
            {delayedTasksStats.total > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
                {delayedTasksStats.total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="deadlines" className="relative">
            Deadlines
            {scheduleStats.total > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
                {scheduleStats.total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        {/* All Tab Content */}
        <TabsContent value="all">
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

        {/* Delayed Tasks Tab Content */}
        <TabsContent value="delayed-tasks">
          {loadingDelayedTasks ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading delayed tasks...</p>
            </div>
          ) : (
            <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{delayedTasksStats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Delayed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{delayedTasksStats.critical}</p>
                    <p className="text-xs text-muted-foreground">Critical (&gt;7 days)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{delayedTasksStats.warning}</p>
                    <p className="text-xs text-muted-foreground">Warning (4-7 days)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-yellow-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Info className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{delayedTasksStats.minor}</p>
                    <p className="text-xs text-muted-foreground">Minor (1-3 days)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Delayed Tasks List */}
          {delayedTasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No delayed tasks</h3>
                <p className="text-muted-foreground">
                  All tasks are on track! Great job.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {delayedTasks.map((task) => (
                <Card
                  key={task.id}
                  className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                    task.delayStatus === 'critical' ? 'border-l-red-500 bg-red-50/30' :
                    task.delayStatus === 'warning' ? 'border-l-orange-500 bg-orange-50/30' :
                    'border-l-yellow-500 bg-yellow-50/30'
                  }`}
                  onClick={() => router.push(`/tasks/${task.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <AlertTriangle className={`h-5 w-5 ${
                          task.delayStatus === 'critical' ? 'text-red-500' :
                          task.delayStatus === 'warning' ? 'text-orange-500' :
                          'text-yellow-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="font-semibold text-base mb-1">{task.title}</h3>
                            {task.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            task.delayStatus === 'critical' ? 'bg-red-100 text-red-700' :
                            task.delayStatus === 'warning' ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {task.delayDays} days overdue
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-3">
                          {task.assignedTo && (
                            <div className="flex items-center gap-1 text-sm">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{task.assignedTo.name}</span>
                            </div>
                          )}
                          {task.project && (
                            <span className="text-xs px-2 py-1 rounded-full bg-muted">
                              {task.project.projectNumber}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            task.priority === 'High' ? 'bg-red-100 text-red-700' :
                            task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Contact Actions */}
                        {task.assignedTo && task.assignedTo.email && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                            <span className="text-xs text-muted-foreground mr-2">Notify:</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `mailto:${task.assignedTo!.email}?subject=Task Overdue: ${task.title}&body=Dear ${task.assignedTo!.name},%0D%0A%0D%0AThis is a reminder that the following task is ${task.delayDays} days overdue:%0D%0A%0D%0ATask: ${task.title}%0D%0ADue Date: ${new Date(task.dueDate).toLocaleDateString()}%0D%0A%0D%0APlease update the status or complete the task as soon as possible.`;
                              }}
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              Email
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
            </>
          )}
        </TabsContent>

        {/* Unread Tab Content */}
        <TabsContent value="unread">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-lg font-semibold mb-2">No unread notifications</h3>
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
                  className="cursor-pointer transition-all hover:shadow-md border-l-4 border-l-blue-500 bg-blue-50/30"
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
                          <div className="h-3 w-3 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
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

        {/* Approvals Tab Content */}
        <TabsContent value="approvals">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No pending approvals</h3>
                <p className="text-muted-foreground">
                  All approvals are up to date.
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
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          {getDeadlineBadge(notification.deadlineAt)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Deadlines Tab Content */}
        <TabsContent value="deadlines">
          {loadingSchedules ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading underperforming schedules...</p>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{scheduleStats.total}</p>
                        <p className="text-xs text-muted-foreground">Total Behind Schedule</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{scheduleStats.critical}</p>
                        <p className="text-xs text-muted-foreground">Critical (&gt;20% behind)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-amber-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Clock className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-600">{scheduleStats.atRisk}</p>
                        <p className="text-xs text-muted-foreground">At Risk (10-20% behind)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Underperforming Schedules List */}
              {underperformingSchedules.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">All schedules on track</h3>
                    <p className="text-muted-foreground">
                      No underperforming schedules at this time.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Collapse/Expand All Controls */}
                  <div className="flex justify-end gap-2 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allActivities = Object.keys(
                          underperformingSchedules.reduce((acc, schedule) => {
                            acc[schedule.scopeLabel] = true;
                            return acc;
                          }, {} as Record<string, boolean>)
                        );
                        setCollapsedActivities(new Set(allActivities));
                      }}
                    >
                      Collapse All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCollapsedActivities(new Set())}
                    >
                      Expand All
                    </Button>
                  </div>

                <div className="space-y-4">
                  {/* Group schedules by activity type */}
                  {Object.entries(
                    underperformingSchedules.reduce((acc, schedule) => {
                      const activity = schedule.scopeLabel;
                      if (!acc[activity]) acc[activity] = [];
                      acc[activity].push(schedule);
                      return acc;
                    }, {} as Record<string, UnderperformingSchedule[]>)
                  ).map(([activity, schedules]) => {
                    const isCollapsed = collapsedActivities.has(activity);
                    const criticalCount = schedules.filter(s => s.status === 'critical').length;
                    const atRiskCount = schedules.filter(s => s.status === 'at-risk').length;
                    
                    return (
                      <Card key={activity} className="overflow-hidden">
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            const newCollapsed = new Set(collapsedActivities);
                            if (isCollapsed) {
                              newCollapsed.delete(activity);
                            } else {
                              newCollapsed.add(activity);
                            }
                            setCollapsedActivities(newCollapsed);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {isCollapsed ? (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <h3 className="font-semibold text-lg">{activity}</h3>
                              <p className="text-sm text-muted-foreground">
                                {schedules.length} project{schedules.length !== 1 ? 's' : ''} behind schedule
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {criticalCount > 0 && (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                                {criticalCount} Critical
                              </span>
                            )}
                            {atRiskCount > 0 && (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                                {atRiskCount} At Risk
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {!isCollapsed && (
                          <div className="border-t">
                            <div className="p-4 space-y-3">
                              {schedules.map((schedule) => (
                                <Card
                                  key={schedule.id}
                                  className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                                    schedule.status === 'critical' ? 'border-l-red-500 bg-red-50/30' :
                                    'border-l-amber-500 bg-amber-50/30'
                                  }`}
                                  onClick={() => router.push('/planning')}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex gap-4">
                                      <div className="flex-shrink-0 mt-1">
                                        <AlertTriangle className={`h-5 w-5 ${
                                          schedule.status === 'critical' ? 'text-red-500' : 'text-amber-500'
                                        }`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                          <div>
                                            <h3 className="font-semibold text-base mb-1">
                                              {schedule.project.projectNumber} - {schedule.building.designation}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                              {schedule.project.name} • {schedule.building.name}
                                            </p>
                                          </div>
                                          <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                            schedule.status === 'critical' ? 'bg-red-100 text-red-700' :
                                            'bg-amber-100 text-amber-700'
                                          }`}>
                                            {schedule.progressGap ? schedule.progressGap.toFixed(1) : '0.0'}% behind
                                          </span>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-4 mt-3">
                                          <div className="flex items-center gap-2">
                                            <div className="w-32 bg-gray-200 rounded-full h-2">
                                              <div
                                                className={`h-2 rounded-full ${
                                                  schedule.progress >= 75 ? 'bg-blue-500' :
                                                  schedule.progress >= 50 ? 'bg-yellow-500' :
                                                  schedule.progress >= 25 ? 'bg-orange-500' :
                                                  'bg-red-500'
                                                }`}
                                                style={{ width: `${Math.min(schedule.progress || 0, 100)}%` }}
                                              />
                                            </div>
                                            <span className="text-sm font-medium">{schedule.progress ? schedule.progress.toFixed(1) : '0.0'}%</span>
                                            <span className="text-xs text-muted-foreground">
                                              (Expected: {schedule.expectedProgress ? schedule.expectedProgress.toFixed(1) : '0.0'}%)
                                            </span>
                                          </div>
                                          
                                          <span className="text-xs px-2 py-1 rounded-full bg-muted">
                                            {new Date(schedule.startDate).toLocaleDateString()} - {new Date(schedule.endDate).toLocaleDateString()}
                                          </span>
                                          
                                          {schedule.daysOverdue > 0 && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
                                              {schedule.daysOverdue} days overdue
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
                </>
              )}
            </>
          )}
        </TabsContent>

        {/* Archived Tab Content */}
        <TabsContent value="archived">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Archive className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-lg font-semibold mb-2">No archived notifications</h3>
                <p className="text-muted-foreground">
                  Archived notifications will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className="cursor-pointer transition-all hover:shadow-md opacity-75"
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
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
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
