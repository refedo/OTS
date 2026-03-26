'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Database,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  HardDrive,
  FolderOpen,
  Clock,
  FileArchive,
  Loader2,
  CheckCircle,
  AlertTriangle,
  User,
  Bot,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { BACKUP_MODULES } from '@/lib/backup-modules';

type BackupEntry = {
  dirname: string;
  sqlFile: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  source: 'manual' | 'auto';
};

type DiskInfo = {
  total: number;
  used: number;
  free: number;
  totalFormatted: string;
  freeFormatted: string;
  usedFormatted: string;
};

type BackupsResponse = {
  backups: BackupEntry[];
  backupDir: string;
  diskInfo: DiskInfo | null;
  totalBackups: number;
  totalSize: number;
  totalSizeFormatted: string;
};

type TableStats = { name: string; current: number; backup: number };
type ModulePreview = { id: string; label: string; tables: TableStats[] };
type PreviewData = { modules: ModulePreview[] };

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDirname(dirname: string): string {
  if (/^\d{8}([_-]\d{6})?$/.test(dirname)) {
    const date = `${dirname.slice(0, 4)}-${dirname.slice(4, 6)}-${dirname.slice(6, 8)}`;
    if (dirname.length > 8) {
      const t = dirname.slice(9);
      return `${date} ${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`;
    }
    return date;
  }
  return dirname;
}

function fmt(n: number): string {
  return n.toLocaleString();
}

// ─── Restore Dialog ──────────────────────────────────────────────────────────

function RestoreDialog({
  backup,
  onClose,
  onSuccess,
}: {
  backup: BackupEntry;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(BACKUP_MODULES.map(m => m.id)),
  );
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    setPreviewLoading(true);
    setPreviewError(null);
    fetch(`/api/backups/${encodeURIComponent(backup.dirname)}/restore`)
      .then(r => r.ok ? r.json() : r.json().then((e: { error?: string }) => Promise.reject(e.error || 'Failed')))
      .then((data: PreviewData) => setPreview(data))
      .catch((e: unknown) => setPreviewError(typeof e === 'string' ? e : 'Failed to load preview'))
      .finally(() => setPreviewLoading(false));
  }, [backup.dirname]);

  const allSelected = selectedModules.size === BACKUP_MODULES.length;
  const toggleAll = () => {
    if (allSelected) {
      setSelectedModules(new Set());
    } else {
      setSelectedModules(new Set(BACKUP_MODULES.map(m => m.id)));
    }
  };

  const toggleModule = (id: string) => {
    setSelectedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const isPartial = selectedModules.size < BACKUP_MODULES.length;
      const body = isPartial ? { modules: [...selectedModules] } : {};
      const res = await fetch(`/api/backups/${encodeURIComponent(backup.dirname)}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) {
        onSuccess('error:' + (data.error || 'Restore failed'));
      } else {
        onSuccess(data.message || 'Database restored successfully');
      }
      onClose();
    } catch {
      onSuccess('error:Restore failed');
      onClose();
    } finally {
      setRestoring(false);
    }
  };

  // Compute per-module totals from preview
  const moduleStats = preview
    ? preview.modules.map(m => {
        const currentTotal = m.tables.reduce((s, t) => s + t.current, 0);
        const backupTotal = m.tables.reduce((s, t) => s + t.backup, 0);
        const inBackup = m.tables.some(t => t.backup > 0);
        return { id: m.id, label: m.label, currentTotal, backupTotal, diff: backupTotal - currentTotal, inBackup };
      })
    : null;

  const selectedCount = selectedModules.size;
  const totalTables = BACKUP_MODULES
    .filter(m => selectedModules.has(m.id))
    .reduce((s, m) => s + m.tables.length, 0);

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <RotateCcw className="h-5 w-5 text-amber-500" />
            Restore Database
            <Badge variant="outline" className="ml-1 font-mono text-xs">
              {formatDirname(backup.dirname)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
          {/* Module selection + preview table */}
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Left: module checkboxes */}
            <div className="w-56 shrink-0 flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Modules to restore</p>
              <div
                className="flex items-center gap-2 cursor-pointer select-none pb-1 border-b"
                onClick={toggleAll}
              >
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  id="select-all"
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  {allSelected ? 'Deselect All' : 'Select All'}
                </label>
              </div>
              <ScrollArea className="flex-1">
                <div className="flex flex-col gap-1.5 pr-2">
                  {BACKUP_MODULES.map(m => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => toggleModule(m.id)}
                    >
                      <Checkbox
                        id={`mod-${m.id}`}
                        checked={selectedModules.has(m.id)}
                        onCheckedChange={() => toggleModule(m.id)}
                      />
                      <label htmlFor={`mod-${m.id}`} className="text-sm cursor-pointer leading-tight">
                        {m.label}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Right: preview diff */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Impact preview
                {!previewLoading && !previewError && (
                  <span className="ml-1 normal-case font-normal">(approximate row counts)</span>
                )}
              </p>

              {previewLoading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Analysing backup…</span>
                </div>
              ) : previewError ? (
                <div className="flex-1 flex items-center justify-center text-destructive gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm">{previewError}</span>
                </div>
              ) : (
                <ScrollArea className="flex-1 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Module</TableHead>
                        <TableHead className="text-xs text-right">Current</TableHead>
                        <TableHead className="text-xs text-right">Backup</TableHead>
                        <TableHead className="text-xs text-right">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {moduleStats!.map(m => {
                        const selected = selectedModules.has(m.id);
                        const diffPositive = m.diff > 0;
                        const diffNeg = m.diff < 0;
                        return (
                          <TableRow
                            key={m.id}
                            className={selected ? '' : 'opacity-35'}
                          >
                            <TableCell className="text-xs font-medium py-1.5">{m.label}</TableCell>
                            <TableCell className="text-xs text-right py-1.5 tabular-nums">
                              {fmt(m.currentTotal)}
                            </TableCell>
                            <TableCell className="text-xs text-right py-1.5 tabular-nums">
                              {m.inBackup ? fmt(m.backupTotal) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-xs text-right py-1.5 tabular-nums">
                              {!m.inBackup ? (
                                <span className="text-muted-foreground">—</span>
                              ) : m.diff === 0 ? (
                                <span className="flex items-center justify-end gap-0.5 text-muted-foreground">
                                  <Minus className="h-3 w-3" />0
                                </span>
                              ) : diffPositive ? (
                                <span className="flex items-center justify-end gap-0.5 text-green-600">
                                  <TrendingUp className="h-3 w-3" />+{fmt(m.diff)}
                                </span>
                              ) : diffNeg ? (
                                <span className="flex items-center justify-end gap-0.5 text-red-500">
                                  <TrendingDown className="h-3 w-3" />{fmt(m.diff)}
                                </span>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-amber-800 dark:text-amber-200">
              <span className="font-semibold">
                {selectedCount === BACKUP_MODULES.length ? 'Full restore' : `Partial restore — ${selectedCount} module${selectedCount !== 1 ? 's' : ''}`}
                {' '}({totalTables} table{totalTables !== 1 ? 's' : ''})
              </span>
              {' '}— selected tables will be replaced with backup data.
              Any rows not present in this backup will be permanently deleted.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={restoring}>
            Cancel
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={handleRestore}
            disabled={restoring || selectedCount === 0}
          >
            {restoring ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Restoring…</>
            ) : (
              <><RotateCcw className="h-4 w-4 mr-2" />
                {selectedCount === BACKUP_MODULES.length
                  ? 'Restore Full Database'
                  : `Restore ${selectedCount} Module${selectedCount !== 1 ? 's' : ''}`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BackupsPageClient() {
  const [data, setData] = useState<BackupsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BackupEntry | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupEntry | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/backups');
      if (!res.ok) throw new Error('Failed to fetch backups');
      setData(await res.json());
    } catch {
      showToast('error', 'Failed to load backup list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/backups', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        showToast('error', err.error || 'Failed to create backup');
        return;
      }
      showToast('success', 'Backup created successfully');
      await fetchBackups();
    } catch {
      showToast('error', 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (backup: BackupEntry) => {
    setDeletingId(backup.dirname);
    try {
      const res = await fetch(`/api/backups/${encodeURIComponent(backup.dirname)}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        showToast('error', err.error || 'Failed to delete backup');
        return;
      }
      showToast('success', `Backup ${formatDirname(backup.dirname)} deleted`);
      await fetchBackups();
    } catch {
      showToast('error', 'Failed to delete backup');
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const handleDownload = async (backup: BackupEntry) => {
    setDownloadingId(backup.dirname);
    try {
      const res = await fetch(`/api/backups/${encodeURIComponent(backup.dirname)}/download`);
      if (!res.ok) {
        showToast('error', 'Failed to download backup');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = /^\d{8}$/.test(backup.dirname)
        ? `backup_${backup.dirname}_${backup.sqlFile}`
        : backup.sqlFile;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast('error', 'Failed to download backup');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRestoreResult = (msg: string) => {
    if (msg.startsWith('error:')) {
      showToast('error', msg.slice(6));
    } else {
      showToast('success', msg);
    }
  };

  const diskUsagePercent = data?.diskInfo
    ? Math.round((data.diskInfo.used / data.diskInfo.total) * 100)
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-6 lg:p-8 max-w-7xl max-lg:pt-20">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
              toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Database className="h-8 w-8 text-primary" />
              Backup Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage database backups — create, download, restore, and remove backup files
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchBackups} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleCreate} disabled={creating || loading}>
              {creating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {creating ? 'Creating...' : 'Create Backup'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileArchive className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Backups</p>
                <p className="text-2xl font-bold">{data?.totalBackups ?? '—'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Database className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Backup Size</p>
                <p className="text-2xl font-bold">{data?.totalSizeFormatted ?? '—'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <HardDrive className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disk Free Space</p>
                <p className="text-2xl font-bold">
                  {data?.diskInfo ? data.diskInfo.freeFormatted : '—'}
                </p>
                {diskUsagePercent !== null && (
                  <p className="text-xs text-muted-foreground">
                    {diskUsagePercent}% used of {data?.diskInfo?.totalFormatted}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Directory info */}
        {data?.backupDir && (
          <Card className="mb-6">
            <CardContent className="p-4 flex items-center gap-3">
              <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-sm text-muted-foreground">Backup directory: </span>
                <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{data.backupDir}</code>
              </div>
              <Badge variant="outline" className="ml-auto shrink-0">
                Max 7 backups retained
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Backup Files</CardTitle>
            <CardDescription>
              All database backups sorted by date, newest first. Backups older than the 7 most recent are automatically removed on create.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !data?.backups.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No backups found</p>
                <p className="text-sm mt-1">Click &quot;Create Backup&quot; to create your first database backup.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Backup Date</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.backups.map((backup, index) => (
                    <TableRow key={backup.dirname}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileArchive className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <span className="font-medium">{formatDirname(backup.dirname)}</span>
                            {index === 0 && (
                              <Badge variant="secondary" className="ml-2 text-xs">Latest</Badge>
                            )}
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {formatDisplayDate(backup.createdAt)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{backup.sqlFile}</code>
                      </TableCell>
                      <TableCell>
                        {backup.source === 'manual' ? (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <User className="h-3 w-3" />
                            Manual
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Bot className="h-3 w-3" />
                            Automatic
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {relativeTime(backup.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium">{backup.sizeFormatted}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(backup)}
                            disabled={downloadingId === backup.dirname}
                            title="Download backup"
                          >
                            {downloadingId === backup.dirname ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRestoreTarget(backup)}
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            title="Restore database from this backup"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(backup)}
                            disabled={deletingId === backup.dirname}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete backup"
                          >
                            {deletingId === backup.dirname ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the backup for{' '}
              <span className="font-semibold">{confirmDelete ? formatDirname(confirmDelete.dirname) : ''}</span>?{' '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Dialog */}
      {restoreTarget && (
        <RestoreDialog
          backup={restoreTarget}
          onClose={() => setRestoreTarget(null)}
          onSuccess={handleRestoreResult}
        />
      )}
    </main>
  );
}
