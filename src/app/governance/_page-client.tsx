'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  History,
  Trash2,
  RefreshCw,
  Search,
  Eye,
  RotateCcw,
  Activity,
  FileText,
  Clock,
  User,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Bot,
  MonitorCheck,
  GitBranch,
  ArrowLeftRight,
  Undo2,
  Database,
  Filter,
  CalendarRange,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  metadata: { batchSize?: number; entityIds?: string[] } | null;
  performedBy: { id: string; name: string };
  performedAt: string;
  reason: string | null;
  sourceModule: string | null;
}

interface EntityLookupResult {
  id: string;
  label: string;
  sub?: string;
}

interface DeletedItem {
  id: string;
  name: string;
  deletedAt: string;
  deletedBy: { id: string; name: string } | null;
  deleteReason: string | null;
}

interface GovernanceStats {
  auditLogs: {
    total: number;
    today: number;
    byAction: Record<string, number>;
  };
  versions: {
    total: number;
  };
  deleted: {
    projects: number;
    buildings: number;
    assemblyParts: number;
    total: number;
  };
  recentActivity: AuditLog[];
}

interface EntityVersion {
  versionNumber: number;
  createdAt: string;
  createdBy: { id: string; name: string };
  changeReason: string | null;
}

interface VersionDetail {
  snapshot: Record<string, unknown>;
  createdAt: string;
  createdBy: { id: string; name: string };
  changeReason: string | null;
}

interface VersionDiff {
  added: string[];
  removed: string[];
  changed: Record<string, { old: unknown; new: unknown }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  RESTORE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  APPROVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  REJECT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  SYNC: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
};

const SYSTEM_SOURCES = new Set(['SYNC', 'AI', 'SYSTEM', 'CRON']);

const ENTITY_TYPES = [
  'Project', 'Building', 'AssemblyPart', 'ProductionLog',
  'QCInspection', 'WPS', 'ITP', 'Document', 'RFIRequest', 'NCRReport',
  'Task', 'WorkOrder', 'User',
];

const VERSIONED_ENTITIES = ['Project', 'Building', 'QCInspection', 'WPS', 'ITP'];

const SOFT_DELETE_ENTITIES = ['Project', 'Building', 'AssemblyPart'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSystemEvent(sourceModule: string | null): boolean {
  return sourceModule !== null && SYSTEM_SOURCES.has(sourceModule);
}

function getSourceLabel(sourceModule: string | null): string {
  if (!sourceModule || sourceModule === 'UI') return 'User';
  if (sourceModule === 'API') return 'API';
  if (sourceModule === 'SYNC') return 'Sync';
  if (sourceModule === 'AI') return 'AI';
  if (sourceModule === 'CRON') return 'Scheduled';
  if (sourceModule === 'SYSTEM') return 'System';
  return sourceModule;
}

function formatSnapshotValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SourceBadge({ sourceModule }: { sourceModule: string | null }) {
  const isSystem = isSystemEvent(sourceModule);
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${
        isSystem
          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          : 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
      }`}
    >
      {isSystem ? <Bot className="size-3" /> : <MonitorCheck className="size-3" />}
      {getSourceLabel(sourceModule)}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  return (
    <Badge className={`text-xs font-semibold ${ACTION_COLORS[action] || 'bg-gray-100 text-gray-700'}`}>
      {action}
    </Badge>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GovernancePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Audit Trail state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [auditPage, setAuditPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 20;

  // Version History state
  const [versionEntityType, setVersionEntityType] = useState('Project');
  const [versionEntityId, setVersionEntityId] = useState('');
  const [selectedEntityLabel, setSelectedEntityLabel] = useState('');
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [entitySearchResults, setEntitySearchResults] = useState<EntityLookupResult[]>([]);
  const [loadingEntitySearch, setLoadingEntitySearch] = useState(false);
  const [versions, setVersions] = useState<EntityVersion[]>([]);
  const [versionTotal, setVersionTotal] = useState(0);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersionA, setSelectedVersionA] = useState<number | null>(null);
  const [selectedVersionB, setSelectedVersionB] = useState<number | null>(null);
  const [versionDetail, setVersionDetail] = useState<VersionDetail | null>(null);
  const [versionDiff, setVersionDiff] = useState<VersionDiff | null>(null);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [rollbackReason, setRollbackReason] = useState('');
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackTargetVersion, setRollbackTargetVersion] = useState<number | null>(null);

  // Undo state
  const [undoTarget, setUndoTarget] = useState<AuditLog | null>(null);
  const [showUndoDialog, setShowUndoDialog] = useState(false);
  const [undoing, setUndoing] = useState(false);

  // Deleted Items state
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [deletedEntityType, setDeletedEntityType] = useState('Project');
  const [restoreTarget, setRestoreTarget] = useState<DeletedItem | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // ── Fetch functions ────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/governance/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (auditPage * pageSize).toString(),
      });
      if (entityTypeFilter !== 'all') params.set('entityType', entityTypeFilter);
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (sourceTypeFilter !== 'all') params.set('sourceType', sourceTypeFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/governance/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        setAuditTotal(data.total || 0);
      }
    } finally {
      setLoadingLogs(false);
    }
  }, [auditPage, entityTypeFilter, actionFilter, sourceTypeFilter, dateFrom, dateTo]);

  const fetchVersions = useCallback(async () => {
    if (!versionEntityId.trim()) return;
    setLoadingVersions(true);
    setVersions([]);
    setVersionTotal(0);
    try {
      const res = await fetch(
        `/api/governance/versions?entityType=${versionEntityType}&entityId=${versionEntityId.trim()}`
      );
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
        setVersionTotal(data.total || 0);
      } else {
        toast({ title: 'Entity not found', description: 'No versions found for this ID.', variant: 'destructive' });
      }
    } finally {
      setLoadingVersions(false);
    }
  }, [versionEntityType, versionEntityId, toast]);

  const fetchEntityLookup = useCallback(async (query: string) => {
    if (!query.trim()) { setEntitySearchResults([]); return; }
    setLoadingEntitySearch(true);
    try {
      const res = await fetch(
        `/api/governance/entity-lookup?entityType=${versionEntityType}&q=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const data = await res.json();
        setEntitySearchResults(data.results || []);
      }
    } finally {
      setLoadingEntitySearch(false);
    }
  }, [versionEntityType]);

  const fetchVersionDetail = async (versionNum: number) => {
    setVersionDetail(null);
    setVersionDiff(null);
    const params = new URLSearchParams({
      entityType: versionEntityType,
      entityId: versionEntityId,
      version: String(versionNum),
    });
    if (selectedVersionB && selectedVersionB !== versionNum) {
      params.set('compareWith', String(selectedVersionB));
    }
    const res = await fetch(`/api/governance/versions?${params}`);
    if (res.ok) {
      const data = await res.json();
      setVersionDetail(data.version);
      if (data.diff) setVersionDiff(data.diff);
    }
    setShowVersionDialog(true);
  };

  const fetchDeletedItems = useCallback(async () => {
    setLoadingDeleted(true);
    try {
      const res = await fetch(`/api/governance/deleted?entityType=${deletedEntityType}`);
      if (res.ok) {
        const data = await res.json();
        setDeletedItems(data.items || []);
      }
    } finally {
      setLoadingDeleted(false);
    }
  }, [deletedEntityType]);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (activeTab === 'audit') fetchAuditLogs(); }, [activeTab, fetchAuditLogs]);
  useEffect(() => { if (activeTab === 'deleted') fetchDeletedItems(); }, [activeTab, fetchDeletedItems]);
  // Auto-load versions when an entity is selected from search
  useEffect(() => { if (versionEntityId) fetchVersions(); }, [versionEntityId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Clear search results when entity type changes
  useEffect(() => { setVersionEntityId(''); setSelectedEntityLabel(''); setVersions([]); setEntitySearchResults([]); setEntitySearchQuery(''); }, [versionEntityType]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const res = await fetch('/api/governance/deleted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: deletedEntityType, entityId: restoreTarget.id }),
      });
      if (res.ok) {
        toast({ title: 'Restored', description: `${restoreTarget.name} has been restored successfully.` });
        fetchDeletedItems();
        fetchStats();
      } else {
        const err = await res.json();
        toast({ title: 'Restore failed', description: err.error || 'Unknown error', variant: 'destructive' });
      }
    } finally {
      setRestoring(false);
      setRestoreTarget(null);
      setShowRestoreDialog(false);
    }
  };

  const handleRollback = async () => {
    if (!rollbackTargetVersion || !versionEntityId || !rollbackReason.trim()) return;
    setRollingBack(true);
    try {
      const res = await fetch('/api/governance/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: versionEntityType,
          entityId: versionEntityId,
          versionNumber: rollbackTargetVersion,
          reason: rollbackReason,
        }),
      });
      if (res.ok) {
        toast({
          title: 'Rollback applied',
          description: `${versionEntityType} rolled back to version ${rollbackTargetVersion}.`,
        });
        setShowRollbackDialog(false);
        setRollbackReason('');
        fetchVersions();
      } else {
        const err = await res.json();
        toast({ title: 'Rollback failed', description: err.error || 'Unknown error', variant: 'destructive' });
      }
    } finally {
      setRollingBack(false);
    }
  };

  const handleUndo = async () => {
    if (!undoTarget) return;
    setUndoing(true);
    try {
      const res = await fetch('/api/governance/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditLogId: undoTarget.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Action undone', description: data.message });
        fetchAuditLogs();
        fetchStats();
      } else {
        toast({ title: 'Undo failed', description: data.error || 'Unknown error', variant: 'destructive' });
      }
    } finally {
      setUndoing(false);
      setUndoTarget(null);
      setShowUndoDialog(false);
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const filteredLogs = searchQuery
    ? auditLogs.filter((log) => {
        const q = searchQuery.toLowerCase();
        return (
          log.entityType.toLowerCase().includes(q) ||
          log.entityId.toLowerCase().includes(q) ||
          log.performedBy.name.toLowerCase().includes(q) ||
          log.reason?.toLowerCase().includes(q) ||
          log.sourceModule?.toLowerCase().includes(q)
        );
      })
    : auditLogs;

  const userEventCount = stats?.auditLogs.byAction
    ? Object.values(stats.auditLogs.byAction).reduce((a: number, b: number) => a + b, 0)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="size-8 text-primary" />
            Governance Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Audit trail, version history, data recovery, and compliance controls
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            fetchStats();
            if (activeTab === 'audit') fetchAuditLogs();
            if (activeTab === 'deleted') fetchDeletedItems();
          }}
        >
          <RefreshCw className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Activity className="size-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="size-3.5" />
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="versions" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <GitBranch className="size-3.5" />
            Versions
          </TabsTrigger>
          <TabsTrigger value="deleted" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Trash2 className="size-3.5" />
            Deleted
          </TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ───────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <FileText className="size-4" /> Audit Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.auditLogs.total.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">{stats?.auditLogs.today || 0} today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Database className="size-4" /> Versions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.versions.total.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">snapshots stored</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Trash2 className="size-4" /> Deleted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.deleted.total || 0}</div>
                <p className="text-xs text-muted-foreground">recoverable items</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Activity className="size-4" /> Actions (30d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {stats?.auditLogs.byAction && Object.entries(stats.auditLogs.byAction).map(([action, count]) => (
                    <Badge key={action} variant="secondary" className="text-xs">
                      {action}: {count}
                    </Badge>
                  ))}
                  {userEventCount === 0 && (
                    <span className="text-muted-foreground text-sm">No activity</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Event Source Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-violet-200 dark:border-violet-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-violet-700 dark:text-violet-300">
                  <MonitorCheck className="size-4" />
                  User-Initiated Actions
                </CardTitle>
                <CardDescription>Changes made directly by team members via the UI or API</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveTab('audit')}
                >
                  View User Actions
                </Button>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Bot className="size-4" />
                  System-Generated Events
                </CardTitle>
                <CardDescription>Automated changes from sync, AI, scheduled jobs, and integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => { setSourceTypeFilter('system'); setActiveTab('audit'); setAuditPage(0); }}
                >
                  View System Events
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest changes across all entities — hover a row for details</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {stats.recentActivity.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ActionBadge action={log.action} />
                        <SourceBadge sourceModule={log.sourceModule ?? null} />
                        <div className="min-w-0">
                          <span className="font-medium">{log.entityType}</span>
                          <span className="text-muted-foreground mx-1">·</span>
                          <span className="text-sm text-muted-foreground font-mono">
                            {log.entityId.slice(0, 8)}…
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0 ml-2">
                        <span className="flex items-center gap-1 hidden sm:flex">
                          <User className="size-3" />
                          {log.performedBy.name}
                        </span>
                        <span className="text-xs">{formatDistanceToNow(new Date(log.performedAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="size-12 mx-auto mb-2 opacity-50" />
                  <p>No audit activity yet</p>
                  <p className="text-sm">Changes will appear here as they happen</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recoverable Items */}
          {stats?.deleted && stats.deleted.total > 0 && (
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <Trash2 className="size-5" />
                  Recoverable Items
                </CardTitle>
                <CardDescription>These items have been soft-deleted and can be fully restored</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {[
                    { label: 'Projects', count: stats.deleted.projects },
                    { label: 'Buildings', count: stats.deleted.buildings },
                    { label: 'Assembly Parts', count: stats.deleted.assemblyParts },
                  ].map(({ label, count }) => (
                    <div key={label} className="text-center p-4 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab('deleted')}>
                  View & Restore Deleted Items
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Audit Trail Tab ────────────────────────────────────────────── */}
        <TabsContent value="audit" className="space-y-4">
          {/* Source Legend */}
          <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <MonitorCheck className="size-3.5 text-violet-600" />
              <span className="text-violet-700 font-medium">User action</span>
              — change made by a team member
            </span>
            <span className="flex items-center gap-1.5">
              <Bot className="size-3.5 text-slate-500" />
              <span className="text-slate-600 font-medium">System event</span>
              — automated by sync, AI, or scheduler
            </span>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by entity, user, or reason…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={entityTypeFilter} onValueChange={(v) => { setEntityTypeFilter(v); setAuditPage(0); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {ENTITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setAuditPage(0); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'APPROVE', 'REJECT', 'SYNC'].map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sourceTypeFilter} onValueChange={(v) => { setSourceTypeFilter(v); setAuditPage(0); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="user">User Actions</SelectItem>
                    <SelectItem value="system">System Events</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? 'border-primary' : ''}
                >
                  <CalendarRange className="size-4 mr-1.5" />
                  Date Range
                  {(dateFrom || dateTo) && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
                </Button>
              </div>

              {showFilters && (
                <div className="flex flex-wrap gap-3 pt-1 border-t">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs shrink-0">From</Label>
                    <Input
                      type="datetime-local"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setAuditPage(0); }}
                      className="w-auto text-sm h-8"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs shrink-0">To</Label>
                    <Input
                      type="datetime-local"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setAuditPage(0); }}
                      className="w-auto text-sm h-8"
                    />
                  </div>
                  {(dateFrom || dateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      className="h-8 text-xs text-muted-foreground"
                    >
                      Clear dates
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : filteredLogs.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => {
                        const system = isSystemEvent(log.sourceModule);
                        return (
                          <TableRow
                            key={log.id}
                            className={system ? 'opacity-75 bg-slate-50/50 dark:bg-slate-900/20' : ''}
                          >
                            <TableCell>
                              <ActionBadge action={log.action} />
                            </TableCell>
                            <TableCell>
                              <SourceBadge sourceModule={log.sourceModule ?? null} />
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium text-sm">{log.entityType}</span>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {log.entityId === 'BATCH' ? 'BATCH' : `${log.entityId.slice(0, 10)}…`}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{log.performedBy.name}</TableCell>
                            <TableCell>
                              <div className="text-sm">{format(new Date(log.performedAt), 'MMM d, HH:mm')}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(log.performedAt), { addSuffix: true })}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[180px] truncate text-sm">
                              {log.reason || '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                {/* Undo CREATE — single entity */}
                                {log.action === 'CREATE' && log.entityId !== 'BATCH' && SOFT_DELETE_ENTITIES.includes(log.entityType) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-7 px-2"
                                    onClick={() => { setUndoTarget(log); setShowUndoDialog(true); }}
                                  >
                                    <Undo2 className="size-3 mr-1" />Undo
                                  </Button>
                                )}
                                {/* Undo BATCH CREATE */}
                                {log.action === 'CREATE' && log.entityId === 'BATCH' && SOFT_DELETE_ENTITIES.includes(log.entityType) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-7 px-2"
                                    onClick={() => { setUndoTarget(log); setShowUndoDialog(true); }}
                                  >
                                    <Undo2 className="size-3 mr-1" />
                                    Undo {log.metadata?.batchSize ? `(${log.metadata.batchSize})` : 'Batch'}
                                  </Button>
                                )}
                                {/* Restore DELETE */}
                                {log.action === 'DELETE' && SOFT_DELETE_ENTITIES.includes(log.entityType) && log.entityId !== 'BATCH' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-700 hover:text-green-800 hover:bg-green-50 text-xs h-7 px-2"
                                    onClick={() => { setUndoTarget(log); setShowUndoDialog(true); }}
                                  >
                                    <RotateCcw className="size-3 mr-1" />Restore
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => setSelectedLog(log)}
                                >
                                  <Eye className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="text-sm text-muted-foreground">
                      {auditPage * pageSize + 1}–{Math.min((auditPage + 1) * pageSize, auditTotal)} of {auditTotal.toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditPage((p) => Math.max(0, p - 1))}
                        disabled={auditPage === 0}
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditPage((p) => p + 1)}
                        disabled={(auditPage + 1) * pageSize >= auditTotal}
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="size-12 mx-auto mb-2 opacity-50" />
                  <p>No audit logs match the current filters</p>
                  <p className="text-sm">Try adjusting your filters or date range</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Version History Tab ────────────────────────────────────────── */}
        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="size-5" />
                Version History
              </CardTitle>
              <CardDescription>
                Browse full snapshots of versioned entities (Projects, Buildings, QC Inspections, WPS, ITP).
                Compare any two versions or roll back to a previous state.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3 items-start">
                <Select value={versionEntityType} onValueChange={setVersionEntityType}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VERSIONED_ENTITIES.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Entity search — name-based lookup */}
                {!versionEntityId ? (
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder={`Search ${versionEntityType} by name or number…`}
                      value={entitySearchQuery}
                      onChange={(e) => {
                        setEntitySearchQuery(e.target.value);
                        fetchEntityLookup(e.target.value);
                      }}
                      className="pl-9"
                    />
                    {(entitySearchResults.length > 0 || loadingEntitySearch) && (
                      <div className="absolute z-20 w-full bg-background border rounded-lg shadow-lg mt-1 max-h-[200px] overflow-auto">
                        {loadingEntitySearch && (
                          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" /> Searching…
                          </div>
                        )}
                        {entitySearchResults.map((r) => (
                          <button
                            key={r.id}
                            className="w-full text-left px-3 py-2.5 hover:bg-muted flex flex-col border-b last:border-0"
                            onClick={() => {
                              setVersionEntityId(r.id);
                              setSelectedEntityLabel(r.label);
                              setEntitySearchQuery('');
                              setEntitySearchResults([]);
                            }}
                          >
                            <span className="font-medium text-sm">{r.label}</span>
                            {r.sub && <span className="text-xs text-muted-foreground">{r.sub}</span>}
                          </button>
                        ))}
                        {!loadingEntitySearch && entitySearchResults.length === 0 && entitySearchQuery && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No results found</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Selected entity chip */
                  <div className="flex items-center gap-2 flex-1 min-w-[240px] px-3 py-2 rounded-lg border bg-muted/50">
                    <GitBranch className="size-4 text-primary shrink-0" />
                    <span className="font-medium text-sm flex-1 truncate">{selectedEntityLabel || versionEntityId}</span>
                    <button
                      className="text-muted-foreground hover:text-foreground ml-1"
                      onClick={() => { setVersionEntityId(''); setSelectedEntityLabel(''); setVersions([]); }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Compare mode hint */}
              {versions.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                  <Info className="size-3.5 shrink-0" />
                  <span>
                    Click <strong>View</strong> to inspect a version's snapshot. To compare two versions, select a
                    base version from the <em>Compare with</em> dropdown and then click <strong>View</strong> on another.
                  </span>
                </div>
              )}

              {versions.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{versionTotal} versions for this entity</p>
                    {selectedVersionB && (
                      <Badge variant="outline" className="text-xs">
                        Comparing with v{selectedVersionB}
                        <button className="ml-1.5 opacity-60 hover:opacity-100" onClick={() => setSelectedVersionB(null)}>×</button>
                      </Badge>
                    )}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Version</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Compare with</TableHead>
                        <TableHead className="w-[160px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {versions.map((v) => (
                        <TableRow key={v.versionNumber}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">v{v.versionNumber}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{format(new Date(v.createdAt), 'MMM d, yyyy HH:mm')}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{v.createdBy.name}</TableCell>
                          <TableCell className="max-w-[180px] truncate text-sm">
                            {v.changeReason || '—'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={selectedVersionB === v.versionNumber ? 'border border-primary' : ''}
                              onClick={() =>
                                setSelectedVersionB(
                                  selectedVersionB === v.versionNumber ? null : v.versionNumber
                                )
                              }
                            >
                              <ArrowLeftRight className="size-3.5 mr-1" />
                              {selectedVersionB === v.versionNumber ? 'Selected' : 'Select'}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedVersionA(v.versionNumber);
                                  fetchVersionDetail(v.versionNumber);
                                }}
                              >
                                <Eye className="size-3.5 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-amber-600 border-amber-300 hover:bg-amber-50"
                                onClick={() => {
                                  setRollbackTargetVersion(v.versionNumber);
                                  setShowRollbackDialog(true);
                                }}
                              >
                                <Undo2 className="size-3.5 mr-1" />
                                Restore
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : versionEntityId && !loadingVersions ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <Database className="size-10 mx-auto mb-2 opacity-40" />
                  <p>No versions found for this entity</p>
                  <p className="text-sm">Only certain entity types are versioned, and only after changes are made</p>
                </div>
              ) : !versionEntityId ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  <GitBranch className="size-10 mx-auto mb-2 opacity-40" />
                  <p>Enter an entity ID above to browse its version history</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Deleted Items Tab ──────────────────────────────────────────── */}
        <TabsContent value="deleted" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="size-5" />
                Data Recovery
              </CardTitle>
              <CardDescription>
                Soft-deleted items are retained and can be fully restored. Select an entity type to browse.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={deletedEntityType} onValueChange={setDeletedEntityType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOFT_DELETE_ENTITIES.map((e) => (
                    <SelectItem key={e} value={e}>{e === 'AssemblyPart' ? 'Assembly Parts' : `${e}s`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {loadingDeleted ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : deletedItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Deleted By</TableHead>
                      <TableHead>Deleted At</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="w-[110px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-sm">{item.deletedBy?.name || 'Unknown'}</TableCell>
                        <TableCell>
                          <div className="text-sm">{format(new Date(item.deletedAt), 'MMM d, yyyy HH:mm')}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.deletedAt), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {item.deleteReason || '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-700 border-green-300 hover:bg-green-50"
                            onClick={() => {
                              setRestoreTarget(item);
                              setShowRestoreDialog(true);
                            }}
                          >
                            <RotateCcw className="size-3.5 mr-1" />
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="size-12 mx-auto mb-2 opacity-40 text-green-500" />
                  <p>No deleted {deletedEntityType.toLowerCase()}s</p>
                  <p className="text-sm">All items are active — nothing to recover here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Audit Detail Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Audit Log Details
            </DialogTitle>
            <DialogDescription>Full context for this audit entry</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Action</label>
                  <div className="mt-1 flex items-center gap-2">
                    <ActionBadge action={selectedLog.action} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source</label>
                  <div className="mt-1">
                    <SourceBadge sourceModule={selectedLog.sourceModule ?? null} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entity Type</label>
                  <div className="mt-1 font-medium">{selectedLog.entityType}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entity ID</label>
                  <div className="mt-1 font-mono text-sm break-all">{selectedLog.entityId}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Performed By</label>
                  <div className="mt-1 flex items-center gap-1.5">
                    <User className="size-3.5" />
                    {selectedLog.performedBy.name}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Time</label>
                  <div className="mt-1 text-sm">{format(new Date(selectedLog.performedAt), 'PPpp')}</div>
                </div>
              </div>

              {selectedLog.reason && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason</label>
                  <div className="mt-1 p-3 rounded-lg bg-muted text-sm">{selectedLog.reason}</div>
                </div>
              )}

              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Field Changes ({Object.keys(selectedLog.changes).length})
                  </label>
                  <div className="mt-1 rounded-lg border overflow-auto max-h-[320px]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-xs">Field</th>
                          <th className="text-left px-3 py-2 font-medium text-xs text-red-600">Before</th>
                          <th className="text-left px-3 py-2 font-medium text-xs text-green-600">After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {Object.entries(selectedLog.changes).map(([field, change]) => (
                          <tr key={field} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-medium font-mono text-xs">{field}</td>
                            <td className="px-3 py-2 text-red-600 dark:text-red-400 font-mono text-xs max-w-[200px] truncate">
                              {formatSnapshotValue(change.old)}
                            </td>
                            <td className="px-3 py-2 text-green-600 dark:text-green-400 font-mono text-xs max-w-[200px] truncate">
                              {formatSnapshotValue(change.new)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Version Detail / Diff Dialog ───────────────────────────────── */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="size-5" />
              {versionDiff ? `Version Comparison — v${selectedVersionA} vs v${selectedVersionB}` : `Version ${selectedVersionA} Snapshot`}
            </DialogTitle>
            {versionDetail && (
              <DialogDescription>
                {format(new Date(versionDetail.createdAt), 'PPpp')} · by {versionDetail.createdBy.name}
                {versionDetail.changeReason && ` · ${versionDetail.changeReason}`}
              </DialogDescription>
            )}
          </DialogHeader>

          {versionDetail && (
            <div className="space-y-4">
              {/* Diff view */}
              {versionDiff && (
                <div className="space-y-3">
                  {versionDiff.added.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-1">Added Fields</p>
                      <div className="flex flex-wrap gap-1">
                        {versionDiff.added.map((f) => (
                          <Badge key={f} className="bg-green-100 text-green-800 text-xs font-mono">{f}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {versionDiff.removed.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-600 mb-1">Removed Fields</p>
                      <div className="flex flex-wrap gap-1">
                        {versionDiff.removed.map((f) => (
                          <Badge key={f} className="bg-red-100 text-red-800 text-xs font-mono">{f}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {Object.keys(versionDiff.changed).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-blue-600 mb-1">Changed Fields ({Object.keys(versionDiff.changed).length})</p>
                      <div className="rounded-lg border overflow-auto max-h-[300px]">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-muted">
                            <tr>
                              <th className="text-left px-3 py-2">Field</th>
                              <th className="text-left px-3 py-2 text-red-600">v{selectedVersionA}</th>
                              <th className="text-left px-3 py-2 text-green-600">v{selectedVersionB}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {Object.entries(versionDiff.changed).map(([field, change]) => (
                              <tr key={field} className="hover:bg-muted/30">
                                <td className="px-3 py-2 font-mono font-medium">{field}</td>
                                <td className="px-3 py-2 text-red-600 font-mono max-w-[200px] truncate">
                                  {formatSnapshotValue(change.old)}
                                </td>
                                <td className="px-3 py-2 text-green-600 font-mono max-w-[200px] truncate">
                                  {formatSnapshotValue(change.new)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Full snapshot */}
              {!versionDiff && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Full Snapshot</p>
                  <div className="rounded-lg border overflow-auto max-h-[400px]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Field</th>
                          <th className="text-left px-3 py-2 font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {Object.entries(versionDetail.snapshot).map(([field, value]) => (
                          <tr key={field} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-mono font-medium text-muted-foreground">{field}</td>
                            <td className="px-3 py-2 font-mono max-w-[300px]">
                              <span className="block truncate">{formatSnapshotValue(value)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="text-amber-600 border-amber-300 hover:bg-amber-50"
              onClick={() => {
                setShowVersionDialog(false);
                if (selectedVersionA) {
                  setRollbackTargetVersion(selectedVersionA);
                  setShowRollbackDialog(true);
                }
              }}
            >
              <Undo2 className="size-4 mr-1.5" />
              Restore to this version
            </Button>
            <Button variant="outline" onClick={() => setShowVersionDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Undo Action Dialog ──────────────────────────────────────────── */}
      <Dialog open={showUndoDialog} onOpenChange={setShowUndoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Undo2 className="size-5" />
              {undoTarget?.action === 'DELETE' ? 'Restore Deleted Item' : 'Undo This Action'}
            </DialogTitle>
            <DialogDescription>
              {undoTarget?.action === 'DELETE'
                ? `This will restore the deleted ${undoTarget.entityType} back to active state.`
                : undoTarget?.entityId === 'BATCH'
                  ? `This will soft-delete all ${undoTarget?.metadata?.batchSize ?? '?'} ${undoTarget?.entityType} records created in this batch operation. They can be recovered from the Deleted tab.`
                  : `This will soft-delete the ${undoTarget?.entityType} created by this action. It can be recovered from the Deleted tab.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>Only Admins and Managers can undo actions. This is logged in the audit trail.</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUndoDialog(false); setUndoTarget(null); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={undoing}
              onClick={handleUndo}
            >
              {undoing ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Undo2 className="size-4 mr-1.5" />}
              {undoing ? 'Processing…' : undoTarget?.action === 'DELETE' ? 'Restore' : 'Confirm Undo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Restore Confirmation Dialog ─────────────────────────────────── */}
      <ConfirmationDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        type="warning"
        title={`Restore ${restoreTarget?.name}?`}
        description={`This will restore the ${deletedEntityType.toLowerCase()} and make it active again. All associated data will be re-linked. This action is reversible.`}
        confirmText={restoring ? 'Restoring…' : 'Restore'}
        cancelText="Cancel"
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
      />

      {/* ── Version Rollback Dialog ─────────────────────────────────────── */}
      <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Undo2 className="size-5" />
              Restore to Version {rollbackTargetVersion}
            </DialogTitle>
            <DialogDescription>
              This will overwrite the current {versionEntityType} data with the state from version {rollbackTargetVersion}.
              The current state will be preserved in a new version. This action cannot be undone without another rollback.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>Only Admins and Managers can perform rollbacks. This action is logged in the audit trail.</span>
            </div>
            <div>
              <Label htmlFor="rollback-reason">Reason for rollback <span className="text-destructive">*</span></Label>
              <Textarea
                id="rollback-reason"
                placeholder="Explain why you are rolling back to this version…"
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowRollbackDialog(false); setRollbackReason(''); }}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!rollbackReason.trim() || rollingBack}
              onClick={handleRollback}
            >
              {rollingBack ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Undo2 className="size-4 mr-1.5" />}
              {rollingBack ? 'Applying rollback…' : `Restore to v${rollbackTargetVersion}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
