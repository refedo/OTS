'use client';
// Force recompile - v15.0.0
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn, resolveUploadUrl } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  User,
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
  GitBranch,
  CheckCircle,
  Zap,
  FileSpreadsheet,
  RefreshCw,
  Layers,
  Crown,
  Star,
  BarChart3,
  BarChart2,
  Info,
  Database,
  Package,
  Truck,
  CalendarClock,
  Plug,
  Cloud,
  MessageCircle,
  UserCog,
  UserCheck,
  Briefcase,
  CalendarDays,
  GitMerge,
  Banknote,
  Megaphone,
  Car,
  Wrench,
  AlertOctagon,
  PackageSearch,
  Receipt,
  Radar,
  GraduationCap,
  UserPlus,
  UserCircle2,
  Handshake,
  Gift,
  ShieldCheck,
  ShieldAlert,
  FileBarChart2,
  GitPullRequest,
  Grid3X3,
  CalendarRange,
  AlertCircle,
  TrendingDown,
  Brain,
  HeartCrack,
  Scale,
  ClipboardList,
  Gauge,
  TableProperties,
  SearchCheck,
  Siren,
  HardHat,
  Workflow,
  Award,
  PieChart,
  IdCard,
  LayoutList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useLayoutEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { UserMenu } from '@/components/user-menu';
import { hasAccessToRoute, hasAccessToSection, NAVIGATION_PERMISSIONS } from '@/lib/navigation-permissions';
import { useVersion } from '@/hooks/use-version';

type NavigationItem = {
  name: string;
  href: string;
  icon: any;
  newSince?: string; // ISO date string — star shown for 7 days after this date, until user visits the page
};

type NavigationSection = {
  name: string;
  icon: any;
  items: NavigationItem[];
  badge?: string;
};

const singleNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Ops Agent', href: '/ops-agent', icon: Radar, newSince: '2026-04-16' },
  { name: 'Early Warning', href: '/risk-dashboard', icon: Zap },
  { name: 'Project Status Tracker', href: '/project-tracker', icon: BarChart3 },
];

const navigationSections: NavigationSection[] = [
  {
    name: 'CEO Arena',
    icon: Crown,
    items: [
      { name: 'CEO Dashboard', href: '/executive', icon: BarChart3 },
      { name: 'Brainstorm Board', href: '/ceo-arena/brainstorm', icon: Brain, newSince: '2026-04-29' },
    ],
  },
  {
    name: 'Tasks',
    icon: ListChecks,
    items: [
      { name: 'All Tasks', href: '/tasks', icon: ListChecks },
      { name: 'My Tasks', href: '/tasks?filter=my-tasks', icon: User },
      { name: 'Requested by Me', href: '/tasks?filter=requested-by-me', icon: FileCheck },
      { name: 'Tasks Dashboard', href: '/tasks/dashboard', icon: BarChart3 },
      { name: 'Conversations', href: '/conversations', icon: MessageCircle },
      { name: 'Create Task', href: '/tasks/new', icon: Plus },
    ],
  },
  {
    name: 'Meetings',
    icon: Calendar,
    items: [
      { name: 'All Meetings', href: '/meetings', icon: Calendar, newSince: '2026-04-28' },
      { name: 'Calendar View', href: '/meetings/calendar', icon: CalendarDays, newSince: '2026-04-29' },
      { name: 'Schedule Meeting', href: '/meetings/new', icon: Plus, newSince: '2026-04-28' },
    ],
  },
  {
    name: 'Operations Control',
    icon: AlertTriangle,
    items: [
      { name: 'Risk Dashboard', href: '/operations-control', icon: AlertTriangle },
      { name: 'Intelligence', href: '/operations-control/intelligence', icon: Activity },
      { name: 'Work Units', href: '/operations-control/work-units', icon: ListChecks },
      { name: 'Dependencies', href: '/operations-control/dependencies', icon: Network },
      { name: 'Capacity', href: '/operations-control/capacity', icon: Activity },
      { name: 'AI Risk Digest', href: '/operations-control/ai-digest', icon: Bot },
      { name: 'Quick Guide', href: '/operations-control/guide', icon: BookOpen },
    ],
  },
  {
    name: 'Notifications',
    icon: Bell,
    items: [
      { name: 'All Notifications', href: '/notifications', icon: Bell },
      { name: 'Delayed Tasks', href: '/notifications?tab=delayed-tasks', icon: AlertTriangle },
      { name: 'Approvals', href: '/notifications?tab=approvals', icon: CheckCircle },
      { name: 'Deadlines', href: '/notifications?tab=deadlines', icon: Clock },
      { name: 'Announcements', href: '/notifications?tab=announcements', icon: Megaphone, newSince: '2026-04-15' },
    ],
  },
  {
    name: 'Projects',
    icon: FolderKanban,
    items: [
      { name: 'Projects Dashboard', href: '/projects-dashboard', icon: LayoutDashboard },
      { name: 'Project Card', href: '/project-card', icon: IdCard },
      { name: 'List Projects', href: '/projects', icon: FolderKanban },
      { name: 'List Buildings', href: '/buildings', icon: Building2 },
      { name: 'Create Project', href: '/projects/wizard', icon: Plus },
      { name: 'Kickoff Checklists', href: '/projects/kickoff', icon: ClipboardCheck, newSince: '2026-05-02' },
      { name: 'Project Planning', href: '/planning', icon: Calendar },
      { name: 'Engineering Timeline', href: '/document-timeline', icon: FileText },
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
      { name: 'PTS Sync', href: '/pts-sync-simple', icon: FileSpreadsheet },
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
      { name: 'Create New RFI', href: '/qc/rfi/new', icon: Plus },
      { name: 'NCR List', href: '/qc/ncr', icon: FileText },
      { name: 'Create New NCR', href: '/qc/ncr/new', icon: Plus },
      { name: 'ITP List', href: '/itp', icon: FileCheck },
      { name: 'Create ITP', href: '/itp/new', icon: Plus },
      { name: 'WPS List', href: '/wps', icon: FileCheck },
      { name: 'Create WPS', href: '/wps/new', icon: Plus },
      { name: 'Welder Qualification', href: '/qc/welder-qualification', icon: Award, newSince: '2026-05-02' },
      { name: 'Coating Inspection', href: '/qc/coating', icon: Layers, newSince: '2026-05-02' },
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
      { name: 'Strategic Objectives', href: '/business-planning/strategic-objectives', icon: Star },
      { name: 'SWOT Analysis', href: '/business-planning/swot', icon: Activity },
      { name: 'Objectives (OKRs)', href: '/business-planning/objectives', icon: Target },
      { name: 'KPIs', href: '/business-planning/kpis', icon: TrendingUp },
      { name: 'Initiatives', href: '/business-planning/initiatives', icon: Lightbulb },
      { name: 'Department Plans', href: '/business-planning/departments', icon: Network },
      { name: 'Weekly Issues', href: '/business-planning/issues', icon: AlertTriangle },
    ],
  },
  {
    name: 'Business Development',
    icon: Handshake,
    items: [
      { name: 'Overview', href: '/business-development', icon: Handshake, newSince: '2026-04-24' },
    ],
  },
  {
    name: 'IMS',
    icon: ShieldCheck,
    items: [
      { name: 'IMS Dashboard', href: '/ims', icon: LayoutDashboard, newSince: '2026-04-27' },
      { name: 'Forms Directory', href: '/forms', icon: FileText, newSince: '2026-05-02' },
      { name: 'ISP Register', href: '/ims/isp-register', icon: BookOpen, newSince: '2026-05-03' },
      { name: 'Document Registry', href: '/ims/documents', icon: FileText, newSince: '2026-04-27' },
      { name: 'Change Requests', href: '/ims/change-requests', icon: GitPullRequest, newSince: '2026-04-27' },
      { name: 'Clause Matrix', href: '/ims/clause-matrix', icon: Grid3X3, newSince: '2026-04-27' },
      { name: 'Review Calendar', href: '/ims/review-calendar', icon: CalendarRange, newSince: '2026-04-27' },
      { name: 'Risk Register', href: '/ims/risks', icon: AlertCircle, newSince: '2026-04-27' },
      { name: 'Risk Matrix', href: '/ims/risks/matrix', icon: TrendingDown, newSince: '2026-04-27' },
      { name: 'Treatments Tracker', href: '/ims/risks/treatments', icon: FileBarChart2, newSince: '2026-04-27' },
      { name: 'Legal Register', href: '/ims/legal-register', icon: Scale, newSince: '2026-05-01' },
      { name: 'Management Review', href: '/ims/management-review', icon: ClipboardList, newSince: '2026-05-01' },
      { name: 'Audit Plans', href: '/ims/audit-plans', icon: SearchCheck, newSince: '2026-05-01' },
      { name: 'QA NCR Register', href: '/ims/ncr', icon: ShieldAlert, newSince: '2026-05-09' },
      { name: 'Corrective Actions', href: '/ims/car', icon: ClipboardCheck, newSince: '2026-05-10' },
      { name: 'OFI Register', href: '/ims/ofi-register', icon: Lightbulb, newSince: '2026-05-10' },
      { name: 'Checklist Library', href: '/ims/checklist-library', icon: BookOpen, newSince: '2026-05-10' },
      { name: 'Programme Dashboard', href: '/ims/programme-dashboard', icon: BarChart2, newSince: '2026-05-10' },
      { name: 'Calibration Register', href: '/ims/calibration', icon: Gauge, newSince: '2026-05-03' },
      { name: 'Competence Matrix', href: '/ims/competence-matrix', icon: TableProperties, newSince: '2026-05-01' },
      { name: 'QMS Process List', href: '/ims/processes', icon: Workflow, newSince: '2026-05-02' },
      { name: 'Incidents / Near-Miss', href: '/ims/safety/incidents', icon: AlertOctagon, newSince: '2026-05-02' },
      { name: 'Emergency Drills', href: '/ims/safety/drills', icon: Siren, newSince: '2026-05-02' },
      { name: 'Toolbox Talks', href: '/ims/safety/toolbox-talks', icon: HardHat, newSince: '2026-05-02' },
      { name: 'Quick Guide', href: '/ims/guide', icon: BookOpen, newSince: '2026-04-28' },
    ],
  },
  {
    name: 'Knowledge Center',
    icon: BookOpen,
    items: [
      { name: 'Knowledge Center', href: '/knowledge-center', icon: BookOpen },
      { name: 'New Entry', href: '/knowledge-center/new', icon: Plus },
    ],
  },
  {
    name: 'Supply Chain',
    icon: Package,
    items: [
      { name: 'LCR', href: '/supply-chain/lcr', icon: FileSpreadsheet },
      { name: 'Reports', href: '/supply-chain/lcr/reports', icon: BarChart3 },
      { name: 'Alias Management', href: '/supply-chain/lcr/aliases', icon: GitBranch },
      { name: 'Supplier Portal', href: '/supply-chain/suppliers', icon: Factory, newSince: '2026-05-08' },
      { name: 'Approved Suppliers', href: '/supply-chain/approved-suppliers', icon: ShieldCheck, newSince: '2026-05-02' },
      { name: 'Purchase Orders', href: '/supply-chain/purchase-orders', icon: Truck },
      { name: 'SC Contracts', href: '/supply-chain/subcontractors', icon: Handshake, newSince: '2026-05-07' },
      { name: 'New SC Contract', href: '/supply-chain/subcontractors/new', icon: Plus, newSince: '2026-05-07' },
      { name: 'AP Aging Report', href: '/financial/reports/aging?type=payable', icon: Clock },
      { name: 'Statement of Account', href: '/financial/reports/soa', icon: FileText },
      { name: 'COGS Supplier Map', href: '/financial/reports/cogs-supplier-map', icon: Layers },
    ],
  },
  {
    name: 'Product Backlog',
    icon: Layers,
    items: [
      { name: 'Backlog Dashboard', href: '/backlog/dashboard', icon: LayoutDashboard },
      { name: 'Create Backlog', href: '/backlog/new', icon: Plus },
      { name: 'CEO Control Center', href: '/ceo-control-center', icon: Crown },
    ],
  },
  {
    name: 'HR',
    icon: UserCog,
    items: [
      { name: 'My Profile', href: '/hr/employees/me', icon: UserCircle2, newSince: '2026-04-21' },
      { name: 'HR Dashboard', href: '/hr/dashboard', icon: BarChart3, newSince: '2026-04-12' },
      { name: 'HR Monthly Reports', href: '/hr/reports', icon: FileBarChart2, newSince: '2026-05-08' },
      { name: 'Absence Analytics', href: '/hr/analytics', icon: TrendingUp, newSince: '2026-04-18' },
      { name: 'Employees', href: '/hr/employees', icon: Users, newSince: '2026-04-12' },
      { name: 'Organization Chart', href: '/hr/organization-chart', icon: Network, newSince: '2026-05-08' },
      { name: 'Organization Setup', href: '/hr/organization-setup', icon: GitBranch, newSince: '2026-05-08' },
      { name: 'Attendance', href: '/hr/attendance', icon: Calendar, newSince: '2026-04-12' },
      { name: 'Agencies', href: '/hr/agencies', icon: Briefcase, newSince: '2026-04-12' },
      { name: 'Leaves', href: '/hr/leaves', icon: CalendarClock, newSince: '2026-04-12' },
      { name: 'Loans', href: '/hr/loans', icon: Banknote, newSince: '2026-04-16' },
      { name: 'Custodies', href: '/hr/custodies', icon: PackageSearch, newSince: '2026-04-16' },
      { name: 'Payroll', href: '/hr/payroll', icon: Banknote, newSince: '2026-04-12' },
      { name: 'Compensations', href: '/hr/compensations', icon: Gift, newSince: '2026-04-25' },
      { name: 'Assets', href: '/hr/assets', icon: PackageSearch, newSince: '2026-04-15' },
      { name: 'Traffic Violations', href: '/hr/traffic-violations', icon: AlertOctagon, newSince: '2026-04-15' },
      { name: 'Car Maintenance', href: '/hr/car-maintenance', icon: Wrench, newSince: '2026-04-15' },
      { name: 'Manpower Invoices', href: '/hr/manpower-invoices', icon: Receipt, newSince: '2026-04-15' },
      { name: 'Contracts & Docs', href: '/hr/contracts', icon: FileText, newSince: '2026-04-15' },
      { name: 'Letters & Correspondence', href: '/hr/letters', icon: FileText, newSince: '2026-04-16' },
      { name: 'Announcements', href: '/hr/letters?tab=announcements', icon: Megaphone, newSince: '2026-04-21' },
      { name: 'Company Policies', href: '/hr/policies', icon: BookOpen, newSince: '2026-04-19' },
      { name: 'Onboarding', href: '/hr/onboarding', icon: UserPlus, newSince: '2026-04-19' },
      { name: 'Training', href: '/hr/training', icon: GraduationCap, newSince: '2026-04-19' },
      { name: 'HR Setup', href: '/hr/setup', icon: UserCog, newSince: '2026-04-12' },
    ],
  },
  {
    name: 'Organization',
    icon: Network,
    items: [
      { name: 'Users', href: '/users', icon: Users },
      { name: 'Roles', href: '/roles', icon: Shield },
    ],
  },
  {
    name: 'Financial Reports',
    icon: TrendingUp,
    items: [
      { name: 'Financial Dashboard', href: '/financial', icon: TrendingUp },
      { name: 'Customer Portal', href: '/financial/customers', icon: Users, newSince: '2026-05-08' },
      { name: 'Monthly Report', href: '/financial/reports/monthly-report', icon: CalendarClock, newSince: '2026-04-29' },
      { name: 'Chart of Accounts', href: '/financial/chart-of-accounts', icon: FileText },
      { name: 'Trial Balance', href: '/financial/reports/trial-balance', icon: FileSpreadsheet },
      { name: 'Income Statement', href: '/financial/reports/income-statement', icon: TrendingUp },
      { name: 'Balance Sheet', href: '/financial/reports/balance-sheet', icon: Building2 },
      { name: 'VAT Report', href: '/financial/reports/vat', icon: FileText },
      { name: 'Aging Report', href: '/financial/reports/aging', icon: Clock },
      { name: 'Statement of Account', href: '/financial/reports/soa', icon: FileText },
      { name: 'Cash In/Out', href: '/financial/reports/cash-flow', icon: TrendingUp },
      { name: 'Cash Flow Forecast', href: '/financial/reports/cash-flow-forecast', icon: TrendingUp },
      { name: 'Payment Schedule', href: '/financial/reports/payment-schedule', icon: CalendarClock },
      { name: 'Project Analysis', href: '/financial/reports/project-analysis', icon: FileSpreadsheet },
      { name: 'WIP Report', href: '/financial/reports/wip', icon: Clock },
      { name: 'Projects Financial', href: '/financial/reports/projects-dashboard', icon: Building2 },
      { name: 'Cost Structure', href: '/financial/reports/project-cost-structure', icon: Package },
      { name: 'Supplier Invoice Report', href: '/financial/reports/supplier-invoice-report', icon: Truck, newSince: '2026-04-29' },
      { name: 'PO–Invoice Linkage', href: '/financial/reports/po-invoice-linkage', icon: GitMerge, newSince: '2026-04-29' },
      { name: 'COA Credit Balance', href: '/financial/reports/coa-credit-balance', icon: BarChart3, newSince: '2026-04-29' },
      { name: 'Account Invoice Report', href: '/financial/reports/account-invoice-report', icon: FileBarChart2, newSince: '2026-04-29' },
      { name: 'Expenses Analysis', href: '/financial/reports/expenses-analysis', icon: Truck },
      { name: 'Expenses by Account', href: '/financial/reports/expenses-by-account', icon: FileSpreadsheet },
      { name: 'OTS Journal Entries', href: '/financial/reports/ots-journal-entries', icon: BookOpen },
      { name: 'Journal Entries', href: '/financial/journal-entries', icon: List },
      { name: 'Manual Entries', href: '/financial/manual-journal-entries', icon: BookOpen },
      { name: 'Cost Classification', href: '/financial/product-coa-mapping', icon: Layers },

      { name: 'Settings', href: '/financial/settings', icon: Settings },
    ],
  },
  {
    name: 'Dolibarr ERP',
    icon: Database,
    items: [
      { name: 'Integration Dashboard', href: '/dolibarr', icon: Database },
    ],
  },
  {
    name: 'Workflow',
    icon: GitBranch,
    items: [
      { name: 'Definitions', href: '/workflow/definitions', icon: GitBranch, newSince: '2026-04-26' },
      { name: 'My Approvals', href: '/workflow/my-approvals', icon: CheckCircle, newSince: '2026-04-26' },
      { name: 'Approval Tracking', href: '/workflow/approvals', icon: LayoutList, newSince: '2026-05-08' },
      { name: 'Integration Guide', href: '/workflow/guide', icon: BookOpen, newSince: '2026-04-26' },
    ],
  },
  {
    name: 'Settings',
    icon: Settings,
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Integrations', href: '/settings/integrations', icon: Plug },
      { name: 'Libre MES', href: '/settings/integrations#libre-mes', icon: Factory },
      { name: 'Nextcloud Files', href: '/settings/integrations#nextcloud', icon: Cloud },
      { name: 'Event Bus', href: '/settings/integrations#event-bus', icon: Zap },
      { name: 'System Events', href: '/events', icon: Activity },
      { name: 'Governance Center', href: '/governance', icon: Shield },
      { name: 'Sidebar Order', href: '/settings/sidebar', icon: Settings },
      { name: 'Backup Management', href: '/settings/backups', icon: Database },
      { name: 'Cron Jobs', href: '/settings/cron-jobs', icon: Clock },
      { name: 'About OTS™', href: '/settings/about', icon: Info },
      { name: 'Version Management', href: '/settings/version', icon: GitBranch },
      { name: 'Changelog', href: '/changelog', icon: FileCode },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { collapsed, setCollapsed } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const { permissions: userPermissions, navPermissions, role: userRole, isLoading: isLoadingPermissions } = usePermissions();
  const [riskCount, setRiskCount] = useState(0);
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [singleOrder, setSingleOrder] = useState<string[]>([]);

  // Restore cached order from localStorage before first paint to prevent reorder flash
  useLayoutEffect(() => {
    try {
      const cachedSection = localStorage.getItem('sidebar-section-order');
      if (cachedSection) setSectionOrder(JSON.parse(cachedSection));
      const cachedSingle = localStorage.getItem('sidebar-single-order');
      if (cachedSingle) setSingleOrder(JSON.parse(cachedSingle));
    } catch { /* ignore */ }
  }, []);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [visitedPages, setVisitedPages] = useState<Set<string>>(new Set());
  const { unreadCount, totalAlertCount, delayedTasksCount, deadlinesCount, taskMessageCount } = useNotifications();
  const { version } = useVersion();
  
  // Check if a nav item is active, respecting query-param-based hrefs
  const isNavItemActive = (href: string): boolean => {
    if (href.includes('?')) {
      const [hrefPath, hrefQuery] = href.split('?');
      if (pathname !== hrefPath) return false;
      const hrefParams = new URLSearchParams(hrefQuery);
      for (const [key, value] of hrefParams.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }
    if (href === '/qc' || href === '/production' || href === '/financial') return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Find which section contains the active route
  const getActiveSections = () => {
    const activeSections: string[] = [];
    navigationSections.forEach(section => {
      const hasActiveItem = section.items.some(item => isNavItemActive(item.href));
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
    // Load visited pages from localStorage
    try {
      const stored = localStorage.getItem('ots_visited_pages');
      if (stored) setVisitedPages(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
    // Fetch company logo from settings
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.companyLogo) { setCompanyLogo(data.companyLogo); setLogoLoadError(false); } })
      .catch(() => { /* non-critical */ });
  }, []);

  // Fetch sidebar order preference
  useEffect(() => {
    async function fetchSidebarOrder() {
      try {
        const res = await fetch('/api/settings/sidebar-order');
        if (res.ok) {
          const { order, singleOrder: so } = await res.json();
          if (Array.isArray(order) && order.length > 0) {
            setSectionOrder(order);
            try { localStorage.setItem('sidebar-section-order', JSON.stringify(order)); } catch { /* ignore */ }
          }
          if (Array.isArray(so) && so.length > 0) {
            setSingleOrder(so);
            try { localStorage.setItem('sidebar-single-order', JSON.stringify(so)); } catch { /* ignore */ }
          }
        }
      } catch {
        // ignore — use default order
      }
    }

    fetchSidebarOrder();
  }, []);

  // Fetch risk count from leading indicators (same as risk dashboard)
  useEffect(() => {
    async function fetchRiskCount() {
      try {
        const response = await fetch('/api/leading-indicators');
        if (response.ok) {
          const data = await response.json();
          setRiskCount(data.totalRisks || 0);
        }
      } catch {
        // Silently ignore — non-critical background fetch
      }
    }

    fetchRiskCount();
    // Poll every 5 minutes to reduce server load
    const interval = setInterval(fetchRiskCount, 300000);
    return () => clearInterval(interval);
  }, []);

  // Track page visits to dismiss "new" stars once user visits the page
  useEffect(() => {
    if (!pathname) return;
    setVisitedPages(prev => {
      if (prev.has(pathname)) return prev;
      const next = new Set(prev);
      next.add(pathname);
      try { localStorage.setItem('ots_visited_pages', JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, [pathname]);

  const isNewItem = (item: NavigationItem): boolean => {
    if (!item.newSince) return false;
    if (visitedPages.has(item.href)) return false;
    const since = new Date(item.newSince);
    const expiry = new Date(since.getTime() + 7 * 24 * 60 * 60 * 1000);
    return new Date() < expiry;
  };

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
      <div className="lg:hidden fixed top-4 left-4 z-50 print:hidden">
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
          'fixed left-0 top-0 z-40 h-screen bg-sidebar border-sidebar-border border-r transition-all duration-300 print:hidden',
          collapsed ? 'w-0 overflow-hidden lg:w-16 lg:overflow-visible' : 'w-64',
          'max-lg:shadow-lg'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
            {!collapsed && (
              <div className="flex items-center gap-2">
                {isMounted && companyLogo && !logoLoadError ? (
                  <img
                    src={resolveUploadUrl(companyLogo)}
                    alt="Company Logo"
                    className="h-8 max-w-[120px] object-contain"
                    onError={() => setLogoLoadError(true)}
                  />
                ) : (
                  <>
                    <div className="size-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                      <span className="text-sidebar-primary-foreground font-bold text-sm">HS</span>
                    </div>
                    <span className="font-semibold text-sidebar-foreground">Hexa Steel</span>
                  </>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <ChevronLeft className={cn('size-4 transition-transform', collapsed && 'rotate-180')} />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* Single navigation items */}
            {(singleOrder.length > 0
              ? [
                  ...singleOrder
                    .map(name => singleNavigation.find(s => s.name === name))
                    .filter((s): s is typeof singleNavigation[number] => s !== undefined),
                  ...singleNavigation.filter(s => !singleOrder.includes(s.name)),
                ]
              : singleNavigation
            ).filter(item =>
              isLoadingPermissions ? item.href === '/dashboard' : hasAccessToRoute(navPermissions, item.href)
            ).map((item) => {
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
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    collapsed && 'justify-center'
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className="size-5 shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                  {isMounted && isNotifications && totalAlertCount > 0 && (
                    <span className={cn(
                      'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold',
                      isActive ? 'bg-sidebar-primary-foreground text-sidebar-primary' : 'bg-red-500 text-white'
                    )}>
                      {totalAlertCount > 99 ? '99+' : totalAlertCount}
                    </span>
                  )}
                  {isMounted && item.href === '/risk-dashboard' && riskCount > 0 && !collapsed && (
                    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                      {riskCount > 99 ? '99+' : riskCount}
                    </span>
                  )}
                  {isMounted && collapsed && isNotifications && totalAlertCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      {totalAlertCount > 9 ? '9+' : totalAlertCount}
                    </span>
                  )}
                  {isMounted && collapsed && item.href === '/risk-dashboard' && riskCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      {riskCount > 9 ? '9+' : riskCount}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Collapsible sections */}
            {(sectionOrder.length > 0
              ? [
                  ...sectionOrder
                    .map(name => navigationSections.find(s => s.name === name))
                    .filter((s): s is typeof navigationSections[number] => s !== undefined),
                  ...navigationSections.filter(s => !sectionOrder.includes(s.name)),
                ]
              : navigationSections
            ).filter(section =>
              isLoadingPermissions 
                ? section.name === 'Settings' 
                : hasAccessToSection(navPermissions, section.items.map(item => item.href))
            ).map((section) => {
              const SectionIcon = section.icon;
              const isExpanded = expandedSections.includes(section.name);
              const hasActiveItem = section.items.some(item => isNavItemActive(item.href));
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
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
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
                        ? 'text-sidebar-foreground font-semibold'
                        : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <SectionIcon className="size-5 shrink-0" />
                      <span>{section.name}</span>
                      {section.badge && (
                        <span className="flex h-5 items-center justify-center rounded-full bg-green-500 px-1.5 text-xs font-bold text-white">
                          {section.badge}
                        </span>
                      )}
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
                    <div className="ml-4 space-y-1 border-l-2 border-sidebar-border/40 pl-2">
                      {section.items.filter(item => 
                        isLoadingPermissions 
                          ? NAVIGATION_PERMISSIONS[item.href] === null 
                          : hasAccessToRoute(navPermissions, item.href)
                      ).map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = isNavItemActive(item.href);

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
                        } else if (item.href === '/conversations') {
                          badgeCount = taskMessageCount;
                        }

                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                              'flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                              isActive
                                ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <ItemIcon className="size-4 shrink-0" />
                              <span>{item.name}</span>
                              {isMounted && isNewItem(item) && (
                                <Star className="size-3 fill-yellow-400 text-yellow-400 animate-pulse" />
                              )}
                            </div>
                            {isMounted && badgeCount > 0 && (
                              <span className={cn(
                                'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold',
                                isActive
                                  ? 'bg-sidebar-primary-foreground text-sidebar-primary'
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
          <div className="border-t border-sidebar-border p-2">
            {/* User Menu */}
            {!collapsed && (
              <div className="mb-2">
                <UserMenu />
              </div>
            )}
            
            {/* Collapsed: Show logout button only */}
            {collapsed && (
              <Button
                onClick={async () => {
                  try {
                    // Stop session activity tracker
                    const tracker = (window as any).__sessionActivityTracker;
                    if (tracker) {
                      tracker.stop();
                      delete (window as any).__sessionActivityTracker;
                    }
                    
                    // Clear all timeouts/intervals
                    const highestTimeoutId = setTimeout(() => {}) as unknown as number;
                    for (let i = 0; i < highestTimeoutId; i++) {
                      clearTimeout(i);
                      clearInterval(i);
                    }
                    
                    // Clear storage first
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
                    
                    const loginUrl = process.env.NODE_ENV === 'production' 
                      ? 'https://ots.hexasteel.sa/login?t=' + Date.now()
                      : '/login?t=' + Date.now();
                    window.location.href = loginUrl;
                  } catch (error) {
                    const loginUrl = process.env.NODE_ENV === 'production' 
                      ? 'https://ots.hexasteel.sa/login?t=' + Date.now()
                      : '/login?t=' + Date.now();
                    window.location.href = loginUrl;
                  }
                }}
                variant="ghost"
                className="w-full justify-center px-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                title="Logout"
              >
                <LogOut className="size-5 shrink-0" />
              </Button>
            )}
            
            {!collapsed && (
              <div className="mt-auto p-4 border-t border-sidebar-border">
                <p className="text-xs text-sidebar-foreground/40 text-center">
                  Hexa Steel® OTS v{version}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {!collapsed && (
        <div
          className="lg:hidden print:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}
