'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Shield,
  ListChecks,
  Building2,
  Settings,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Home,
  Network,
  FolderKanban,
  Plus,
  ClipboardCheck,
  FileCheck,
  List,
  FileText,
  Menu,
  LogOut,
  Factory,
  Upload,
  Activity,
  Calendar,
  AlertTriangle,
  BookOpen,
  Target,
  TrendingUp,
  Wand2,
  Clock,
  Lightbulb,
  Bot,
  Sparkles,
  Bell,
  FileCode,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { UserMenu } from '@/components/user-menu';

type NavigationItem = {
  name: string;
  href: string;
  icon: any;
};

type NavigationSection = {
  name: string;
  icon: any;
  items: NavigationItem[];
};

const singleNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/tasks', icon: ListChecks },
  { name: 'AI Assistant', href: '/ai-assistant', icon: Bot },
];

const navigationSections: NavigationSection[] = [
  {
    name: 'Notifications',
    icon: Bell,
    items: [
      { name: 'All Notifications', href: '/notifications', icon: Bell },
      { name: 'Delayed Tasks', href: '/notifications?tab=delayed-tasks', icon: AlertTriangle },
      { name: 'Approvals', href: '/notifications?tab=approvals', icon: CheckCircle },
      { name: 'Deadlines', href: '/notifications?tab=deadlines', icon: Clock },
    ],
  },
  {
    name: 'Projects',
    icon: FolderKanban,
    items: [
      { name: 'Projects Dashboard', href: '/projects-dashboard', icon: LayoutDashboard },
      { name: 'List Projects', href: '/projects', icon: FolderKanban },
      { name: 'Create Project', href: '/projects/wizard', icon: Plus },
      { name: 'Project Planning', href: '/planning', icon: Calendar },
      { name: 'Timeline', href: '/timeline', icon: Calendar },
      { name: 'Operations Timeline (New)', href: '/operations/dashboard', icon: Clock },
      { name: 'Event Management', href: '/operations/events', icon: Calendar },
      { name: 'Engineering Timeline', href: '/document-timeline', icon: FileText },
      { name: 'List Buildings', href: '/buildings', icon: Building2 },
    ],
  },
  {
    name: 'Production',
    icon: Factory,
    items: [
      { name: 'Dashboard', href: '/production', icon: Activity },
      { name: 'Reports', href: '/reports', icon: FileText },
      { name: 'Work Orders', href: '/production/work-orders', icon: ClipboardCheck },
      { name: 'Production Status', href: '/production/status', icon: Activity },
      { name: 'Raw Data', href: '/production/assembly-parts', icon: List },
      { name: 'Production Logs', href: '/production/logs', icon: Activity },
      { name: 'Dispatch Reports', href: '/production/dispatch-reports', icon: FileText },
      { name: 'Daily Report (PDR)', href: '/production/reports/daily', icon: Calendar },
      { name: 'Period Report', href: '/production/reports/period', icon: TrendingUp },
      { name: 'Production Plan', href: '/production/reports/production-plan', icon: Calendar },
      { name: 'Status by Name', href: '/production/reports/status-by-name', icon: TrendingUp },
      { name: 'Mass Log', href: '/production/mass-log', icon: List },
      { name: 'Production Settings', href: '/settings/production', icon: Settings },
    ],
  },
  {
    name: 'Quality Control',
    icon: ClipboardCheck,
    items: [
      { name: 'QC Dashboard', href: '/qc', icon: Activity },
      { name: 'Material Inspection', href: '/qc/material', icon: FileCheck },
      { name: 'Welding QC', href: '/qc/welding', icon: FileCheck },
      { name: 'Dimensional QC', href: '/qc/dimensional', icon: FileCheck },
      { name: 'NDT Inspection', href: '/qc/ndt', icon: FileCheck },
      { name: 'RFI List', href: '/qc/rfi', icon: FileCheck },
      { name: 'NCR List', href: '/qc/ncr', icon: FileText },
      { name: 'ITP List', href: '/itp', icon: FileCheck },
      { name: 'Create ITP', href: '/itp/new', icon: Plus },
      { name: 'WPS List', href: '/wps', icon: FileCheck },
      { name: 'Create WPS', href: '/wps/new', icon: Plus },
    ],
  },
  {
    name: 'Documentation',
    icon: FileText,
    items: [
      { name: 'Document Library', href: '/documents', icon: FileText },
      { name: 'Upload Document', href: '/documents/upload', icon: Plus },
      { name: 'Categories', href: '/documents/categories', icon: List },
    ],
  },
  {
    name: 'Business Planning',
    icon: Lightbulb,
    items: [
      { name: 'Dashboard', href: '/business-planning/dashboard', icon: TrendingUp },
      { name: '📖 Quick Guide', href: '/business-planning/guide', icon: BookOpen },
      { name: 'Strategic Foundation', href: '/business-planning/foundation', icon: Target },
      { name: 'SWOT Analysis', href: '/business-planning/swot', icon: Activity },
      { name: 'Objectives (OKRs)', href: '/business-planning/objectives', icon: Target },
      { name: 'KPIs', href: '/business-planning/kpis', icon: TrendingUp },
      { name: 'Initiatives', href: '/business-planning/initiatives', icon: Lightbulb },
      { name: 'Department Plans', href: '/business-planning/departments', icon: Network },
      { name: 'Weekly Issues', href: '/business-planning/issues', icon: AlertTriangle },
    ],
  },
  {
    name: 'Organization',
    icon: Network,
    items: [
      { name: 'Users', href: '/users', icon: Users },
      { name: 'Roles', href: '/roles', icon: Shield },
      { name: 'Organization Chart', href: '/organization', icon: Network },
    ],
  },
  {
    name: 'Settings',
    icon: Settings,
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Changelog', href: '/changelog', icon: FileCode },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { unreadCount, totalAlertCount, delayedTasksCount, deadlinesCount } = useNotifications();
  
  // Find which section contains the active route
  const getActiveSections = () => {
    const activeSections: string[] = [];
    navigationSections.forEach(section => {
      const hasActiveItem = section.items.some(
        item => pathname === item.href || pathname.startsWith(item.href + '/')
      );
      if (hasActiveItem) {
        activeSections.push(section.name);
      }
    });
    return activeSections;
  };
  
  const [expandedSections, setExpandedSections] = useState<string[]>(getActiveSections());


  // Update expanded sections when pathname changes
  useEffect(() => {
    const activeSections = getActiveSections();
    if (activeSections.length > 0) {
      setExpandedSections(prev => {
        // Add active sections if not already expanded
        const newSections = [...prev];
        activeSections.forEach(section => {
          if (!newSections.includes(section)) {
            newSections.push(section);
          }
        });
        return newSections;
      });
    }
  }, [pathname]);

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionName)
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu className="size-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300',
          collapsed ? 'w-0 lg:w-16' : 'w-64',
          'max-lg:shadow-lg'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">HS</span>
                </div>
                <span className="font-semibold">Hexa Steel</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto"
            >
              <ChevronLeft className={cn('size-4 transition-transform', collapsed && 'rotate-180')} />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* Single navigation items */}
            {singleNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const isNotifications = item.href === '/notifications';
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    collapsed && 'justify-center'
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className="size-5 shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                  {isMounted && isNotifications && totalAlertCount > 0 && (
                    <span className={cn(
                      'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold',
                      isActive ? 'bg-primary-foreground text-primary' : 'bg-red-500 text-white'
                    )}>
                      {totalAlertCount > 99 ? '99+' : totalAlertCount}
                    </span>
                  )}
                  {isMounted && collapsed && isNotifications && totalAlertCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      {totalAlertCount > 9 ? '9+' : totalAlertCount}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Collapsible sections */}
            {navigationSections.map((section) => {
              const SectionIcon = section.icon;
              const isExpanded = expandedSections.includes(section.name);
              const hasActiveItem = section.items.some(
                item => pathname === item.href || pathname.startsWith(item.href.split('?')[0] + '/')
              );
              const isNotificationSection = section.name === 'Notifications';

              // When collapsed, show only section icons as links to first item
              if (collapsed) {
                const firstItem = section.items[0];
                return (
                  <Link
                    key={section.name}
                    href={firstItem.href}
                    className={cn(
                      'flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors relative',
                      hasActiveItem
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    title={section.name}
                  >
                    <SectionIcon className="size-5 shrink-0" />
                    {isMounted && isNotificationSection && totalAlertCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                        {totalAlertCount > 9 ? '9+' : totalAlertCount}
                      </span>
                    )}
                  </Link>
                );
              }

              return (
                <div key={section.name} className="space-y-1">
                  <button
                    onClick={() => toggleSection(section.name)}
                    className={cn(
                      'flex items-center justify-between w-full gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      hasActiveItem
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <SectionIcon className="size-5 shrink-0" />
                      <span>{section.name}</span>
                      {isMounted && isNotificationSection && totalAlertCount > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                          {totalAlertCount > 99 ? '99+' : totalAlertCount}
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="size-4 shrink-0" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="ml-4 space-y-1 border-l-2 border-muted pl-2">
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;
                        // Special handling for dashboards - only exact match
                        const isActive = (item.href === '/qc' || item.href === '/production')
                          ? pathname === item.href
                          : pathname === item.href || pathname.startsWith(item.href.split('?')[0] + '/');

                        // Determine badge count for notification sub-items
                        let badgeCount = 0;
                        if (isNotificationSection) {
                          if (item.name === 'Delayed Tasks') {
                            badgeCount = delayedTasksCount;
                          } else if (item.name === 'Deadlines') {
                            badgeCount = deadlinesCount;
                          } else if (item.name === 'All Notifications') {
                            badgeCount = unreadCount;
                          }
                        }

                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                              'flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                              isActive
                                ? 'bg-primary text-primary-foreground font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <ItemIcon className="size-4 shrink-0" />
                              <span>{item.name}</span>
                            </div>
                            {isMounted && badgeCount > 0 && (
                              <span className={cn(
                                'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold',
                                isActive 
                                  ? 'bg-primary-foreground text-primary' 
                                  : item.name === 'Delayed Tasks' 
                                    ? 'bg-orange-500 text-white'
                                    : item.name === 'Deadlines'
                                      ? 'bg-red-500 text-white'
                                      : 'bg-blue-500 text-white'
                              )}>
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t p-2">
            {/* User Menu */}
            {!collapsed && (
              <div className="mb-2">
                <UserMenu />
              </div>
            )}
            
            {/* Collapsed: Show logout button only */}
            {collapsed && (
              <form action="/api/auth/logout" method="POST">
                <Button
                  type="submit"
                  variant="ghost"
                  className="w-full justify-center px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Logout"
                >
                  <LogOut className="size-5 shrink-0" />
                </Button>
              </form>
            )}
            
            {!collapsed && (
              <div className="mt-2 px-3 text-xs text-muted-foreground">
                <p className="font-medium">Hexa Steel OTS</p>
                <p>v1.2.2</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {!collapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}
