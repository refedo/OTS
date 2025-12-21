'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  performedBy: { id: string; name: string };
  performedAt: string;
  reason: string | null;
  sourceModule: string | null;
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

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  RESTORE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  APPROVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  REJECT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  SYNC: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
};

const ENTITY_TYPES = [
  'Project',
  'Building',
  'AssemblyPart',
  'ProductionLog',
  'QCInspection',
  'WPS',
  'ITP',
  'Document',
  'RFIRequest',
  'NCRReport',
];

export default function GovernancePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  
  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletedEntityType, setDeletedEntityType] = useState<string>('Project');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);
  const pageSize = 20;
  
  // Detail dialog
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch audit logs when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, entityTypeFilter, actionFilter, page]);

  // Fetch deleted items when tab changes
  useEffect(() => {
    if (activeTab === 'deleted') {
      fetchDeletedItems();
    }
  }, [activeTab, deletedEntityType]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/governance/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
      });
      if (entityTypeFilter !== 'all') params.set('entityType', entityTypeFilter);
      if (actionFilter !== 'all') params.set('action', actionFilter);

      const res = await fetch(`/api/governance/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        setTotalLogs(data.total || data.logs?.length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchDeletedItems = async () => {
    setLoadingDeleted(true);
    try {
      const res = await fetch(`/api/governance/deleted?entityType=${deletedEntityType}`);
      if (res.ok) {
        const data = await res.json();
        setDeletedItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch deleted items:', error);
    } finally {
      setLoadingDeleted(false);
    }
  };

  const handleRestore = async (entityType: string, entityId: string) => {
    try {
      const res = await fetch('/api/governance/deleted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId }),
      });
      if (res.ok) {
        fetchDeletedItems();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to restore item:', error);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.entityType.toLowerCase().includes(query) ||
      log.entityId.toLowerCase().includes(query) ||
      log.performedBy.name.toLowerCase().includes(query) ||
      log.reason?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="size-8 text-primary" />
            Governance Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Enterprise audit trail, version history, and data recovery
          </p>
        </div>
        <Button variant="outline" onClick={() => { fetchStats(); if (activeTab === 'audit') fetchAuditLogs(); }}>
          <RefreshCw className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="size-4" />
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="deleted" className="flex items-center gap-2">
            <Trash2 className="size-4" />
            Deleted
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Audit Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.auditLogs.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.auditLogs.today || 0} today
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Entity Versions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.versions.total || 0}</div>
                <p className="text-xs text-muted-foreground">snapshots stored</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Deleted Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.deleted.total || 0}</div>
                <p className="text-xs text-muted-foreground">recoverable</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Actions (30d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {stats?.auditLogs.byAction && Object.entries(stats.auditLogs.byAction).map(([action, count]) => (
                    <Badge key={action} variant="secondary" className="text-xs">
                      {action}: {count}
                    </Badge>
                  ))}
                  {(!stats?.auditLogs.byAction || Object.keys(stats.auditLogs.byAction).length === 0) && (
                    <span className="text-muted-foreground text-sm">No activity</span>
                  )}
                </div>
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
              <CardDescription>Latest changes across the system</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentActivity.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100'}>
                          {log.action}
                        </Badge>
                        <div>
                          <span className="font-medium">{log.entityType}</span>
                          <span className="text-muted-foreground mx-1">•</span>
                          <span className="text-sm text-muted-foreground font-mono">
                            {log.entityId.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
                          {log.performedBy.name}
                        </span>
                        <span>{formatDistanceToNow(new Date(log.performedAt), { addSuffix: true })}</span>
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

          {/* Deleted Items Summary */}
          {stats?.deleted && stats.deleted.total > 0 && (
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <Trash2 className="size-5" />
                  Recoverable Items
                </CardTitle>
                <CardDescription>Items that can be restored</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold">{stats.deleted.projects}</div>
                    <div className="text-sm text-muted-foreground">Projects</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold">{stats.deleted.buildings}</div>
                    <div className="text-sm text-muted-foreground">Buildings</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold">{stats.deleted.assemblyParts}</div>
                    <div className="text-sm text-muted-foreground">Assembly Parts</div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => setActiveTab('deleted')}
                >
                  View & Restore Deleted Items
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={entityTypeFilter} onValueChange={(v) => { setEntityTypeFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {ENTITY_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                    <SelectItem value="RESTORE">Restore</SelectItem>
                    <SelectItem value="APPROVE">Approve</SelectItem>
                    <SelectItem value="REJECT">Reject</SelectItem>
                    <SelectItem value="SYNC">Sync</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Table */}
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
                        <TableHead>Entity</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100'}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{log.entityType}</span>
                              <div className="text-xs text-muted-foreground font-mono">
                                {log.entityId.slice(0, 12)}...
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{log.performedBy.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(log.performedAt), 'MMM d, HH:mm')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(log.performedAt), { addSuffix: true })}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {log.reason || '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedLog(log); setShowDetailDialog(true); }}
                            >
                              <Eye className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination */}
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalLogs)} of {totalLogs}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={(page + 1) * pageSize >= totalLogs}
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="size-12 mx-auto mb-2 opacity-50" />
                  <p>No audit logs found</p>
                  <p className="text-sm">Changes will be recorded as they happen</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deleted Items Tab */}
        <TabsContent value="deleted" className="space-y-4">
          {/* Entity Type Selector */}
          <Card>
            <CardContent className="pt-4">
              <Select value={deletedEntityType} onValueChange={setDeletedEntityType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Project">Projects</SelectItem>
                  <SelectItem value="Building">Buildings</SelectItem>
                  <SelectItem value="AssemblyPart">Assembly Parts</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Deleted Items Table */}
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
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.deletedBy?.name || 'Unknown'}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(item.deletedAt), 'MMM d, yyyy HH:mm')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.deletedAt), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {item.deleteReason || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(deletedEntityType, item.id)}
                          >
                            <RotateCcw className="size-4 mr-1" />
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Trash2 className="size-12 mx-auto mb-2 opacity-50" />
                  <p>No deleted {deletedEntityType.toLowerCase()}s</p>
                  <p className="text-sm">Deleted items will appear here for recovery</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Audit Log Details
            </DialogTitle>
            <DialogDescription>
              Full details of this audit entry
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Action</label>
                  <div className="mt-1">
                    <Badge className={ACTION_COLORS[selectedLog.action] || 'bg-gray-100'}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entity Type</label>
                  <div className="mt-1 font-medium">{selectedLog.entityType}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entity ID</label>
                  <div className="mt-1 font-mono text-sm">{selectedLog.entityId}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Performed By</label>
                  <div className="mt-1">{selectedLog.performedBy.name}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Time</label>
                  <div className="mt-1">{format(new Date(selectedLog.performedAt), 'PPpp')}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Source</label>
                  <div className="mt-1">{selectedLog.sourceModule || 'Unknown'}</div>
                </div>
              </div>
              
              {selectedLog.reason && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reason</label>
                  <div className="mt-1 p-3 rounded-lg bg-muted">{selectedLog.reason}</div>
                </div>
              )}
              
              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Changes</label>
                  <div className="mt-1 p-3 rounded-lg bg-muted overflow-auto max-h-[300px]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4">Field</th>
                          <th className="text-left py-2 pr-4">Old Value</th>
                          <th className="text-left py-2">New Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(selectedLog.changes).map(([field, change]) => (
                          <tr key={field} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{field}</td>
                            <td className="py-2 pr-4 text-red-600 dark:text-red-400">
                              {JSON.stringify(change.old) || 'null'}
                            </td>
                            <td className="py-2 text-green-600 dark:text-green-400">
                              {JSON.stringify(change.new) || 'null'}
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
    </div>
  );
}
