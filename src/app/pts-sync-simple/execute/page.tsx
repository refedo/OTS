'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Building2,
  FolderOpen,
  Package,
  ClipboardList,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckSquare,
  Square,
  StopCircle,
  Play,
  RotateCcw,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SyncValidation {
  projects: {
    ptsProjects: string[];
    otsProjects: { id: string; projectNumber: string; name: string }[];
    matched: { pts: string; ots: { id: string; projectNumber: string } }[];
    unmatched: string[];
  };
  buildings: {
    ptsBuildings: { projectNumber: string; designation: string; name: string }[];
    matched: { pts: { projectNumber: string; designation: string }; otsId: string }[];
    unmatched: { projectNumber: string; designation: string; name: string }[];
  };
  rawDataCount: number;
  logCount: number;
  newPartsCount: number;
  existingPartsCount: number;
  newLogsCount: number;
  existingLogsCount: number;
}

interface SkippedItem {
  rowNumber: number;
  partDesignation: string;
  projectNumber: string;
  reason: string;
  type: 'part' | 'log';
}

interface SyncedItem {
  partDesignation: string;
  projectNumber: string;
  buildingName: string | null;
  processType?: string;
  action: 'created' | 'updated';
  type: 'part' | 'log';
}

interface ProjectSyncStats {
  projectNumber: string;
  projectName: string;
  totalParts: number;
  syncedParts: number;
  totalLogs: number;
  syncedLogs: number;
  completionPercent: number;
}

interface SyncResult {
  success: boolean;
  partsCreated: number;
  partsUpdated: number;
  logsCreated: number;
  logsUpdated: number;
  errors: string[];
  skippedItems: SkippedItem[];
  syncedItems: SyncedItem[];
  projectStats: ProjectSyncStats[];
  duration: number;
  syncBatchId: string;
}

type SyncPhase = 'loading' | 'validating' | 'review' | 'syncing-parts' | 'syncing-logs' | 'complete';

export default function ExecuteSyncPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'full'; // 'parts', 'logs', or 'full'
  const [phase, setPhase] = useState<SyncPhase>('loading');
  const [validation, setValidation] = useState<SyncValidation | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  
  // Selection state
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [selectedBuildings, setSelectedBuildings] = useState<Set<string>>(new Set());
  // Set sync options based on mode
  const [syncRawData, setSyncRawData] = useState(mode === 'parts' || mode === 'full');
  const [syncLogs, setSyncLogs] = useState(mode === 'logs' || mode === 'full');
  
  // Stop sync
  const [isStopping, setIsStopping] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [partsProgress, setPartsProgress] = useState({ created: 0, updated: 0, errors: 0 });
  const [logsProgress, setLogsProgress] = useState({ created: 0, updated: 0, errors: 0 });
  
  // Dialogs
  const [showSkippedDialog, setShowSkippedDialog] = useState(false);
  const [showSyncedDialog, setShowSyncedDialog] = useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [rollbackProject, setRollbackProject] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Data Preview
  const [previewData, setPreviewData] = useState<Record<string, string>[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Check for mappings and start validation
  useEffect(() => {
    const rawDataMapping = localStorage.getItem('pts-raw-data-mapping');
    const logsMapping = localStorage.getItem('pts-logs-mapping');
    
    // For parts-only mode, only need raw data mapping
    if (mode === 'parts' && !rawDataMapping) {
      router.push('/pts-sync-simple/map-raw-data?mode=parts');
      return;
    }
    
    // For logs-only mode, only need logs mapping
    if (mode === 'logs' && !logsMapping) {
      router.push('/pts-sync-simple/map-logs?mode=logs');
      return;
    }
    
    // For full mode, need both mappings
    if (mode === 'full' && (!rawDataMapping || !logsMapping)) {
      router.push('/pts-sync-simple/map-raw-data?mode=full');
      return;
    }
    
    startValidation();
  }, [router, mode]);

  // Initialize selections when validation completes
  useEffect(() => {
    if (validation) {
      setSelectedProjects(new Set(validation.projects.matched.map(m => m.pts)));
      const allBuildings = [
        ...validation.buildings.matched.map(m => `${m.pts.projectNumber}-${m.pts.designation}`),
        ...validation.buildings.unmatched.map(b => `${b.projectNumber}-${b.designation}`),
      ];
      setSelectedBuildings(new Set(allBuildings));
    }
  }, [validation]);

  const toggleProject = (projectNumber: string) => {
    setSelectedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectNumber)) {
        next.delete(projectNumber);
        setSelectedBuildings(prevBuildings => {
          const nextBuildings = new Set(prevBuildings);
          for (const key of nextBuildings) {
            if (key.startsWith(`${projectNumber}-`)) {
              nextBuildings.delete(key);
            }
          }
          return nextBuildings;
        });
      } else {
        next.add(projectNumber);
        if (validation) {
          setSelectedBuildings(prevBuildings => {
            const nextBuildings = new Set(prevBuildings);
            validation.buildings.matched
              .filter(m => m.pts.projectNumber === projectNumber)
              .forEach(m => nextBuildings.add(`${m.pts.projectNumber}-${m.pts.designation}`));
            validation.buildings.unmatched
              .filter(b => b.projectNumber === projectNumber)
              .forEach(b => nextBuildings.add(`${b.projectNumber}-${b.designation}`));
            return nextBuildings;
          });
        }
      }
      return next;
    });
  };

  const selectAllProjects = () => {
    if (validation) {
      setSelectedProjects(new Set(validation.projects.matched.map(m => m.pts)));
      const allBuildings = [
        ...validation.buildings.matched.map(m => `${m.pts.projectNumber}-${m.pts.designation}`),
        ...validation.buildings.unmatched.map(b => `${b.projectNumber}-${b.designation}`),
      ];
      setSelectedBuildings(new Set(allBuildings));
    }
  };

  const deselectAllProjects = () => {
    setSelectedProjects(new Set());
    setSelectedBuildings(new Set());
  };

  const startValidation = async () => {
    setPhase('validating');
    setError(null);
    setValidation(null);

    try {
      const res = await fetch('/api/pts-sync/validate');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Validation failed');
      }
      const data = await res.json();
      setValidation(data);
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
      setPhase('loading');
    }
  };

  const fetchPreview = async (sheet: 'rawData' | 'logs' = 'rawData') => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const mappingKey = sheet === 'logs' ? 'pts-logs-mapping' : 'pts-raw-data-mapping';
      const savedMapping = localStorage.getItem(mappingKey);
      const mapping = savedMapping ? JSON.parse(savedMapping) : undefined;
      
      const res = await fetch('/api/pts-sync/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useDefault: true,
          sheet,
          columnMapping: mapping,
          limit: 20,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.details || 'Failed to fetch preview');
      }

      const result = await res.json();
      setPreviewData(result.data);
      setShowPreview(true);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Failed to fetch preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Start sync based on what's enabled
  const startSync = async () => {
    if (syncRawData) {
      executeSyncParts();
    } else if (syncLogs) {
      executeSyncLogs();
    }
  };

  const executeSyncParts = async () => {
    setPhase('syncing-parts');
    setError(null);
    setPartsProgress({ created: 0, updated: 0, errors: 0 });
    setProgress({ current: 0, total: 100, message: 'Syncing assembly parts...' });
    
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/pts-sync/full-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          autoCreateBuildings: true,
          selectedProjects: Array.from(selectedProjects),
          selectedBuildings: Array.from(selectedBuildings),
          syncRawData: true,
          syncLogs: false,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Parts sync failed');
      }

      const result = await res.json();
      setPartsProgress({ created: result.partsCreated, updated: result.partsUpdated, errors: result.errors.length });
      
      if (syncLogs) {
        setSyncResult({
          ...result,
          logsCreated: 0,
          logsUpdated: 0,
          syncedItems: result.syncedItems || [],
        });
        // Auto-continue to logs sync
        executeSyncLogs();
      } else {
        setSyncResult(result);
        setPhase('complete');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Sync was stopped by user');
      } else {
        setError(err instanceof Error ? err.message : 'Parts sync failed');
      }
      setPhase('review');
    } finally {
      setIsStopping(false);
      abortControllerRef.current = null;
    }
  };

  const executeSyncLogs = async () => {
    setPhase('syncing-logs');
    setError(null);
    setLogsProgress({ created: 0, updated: 0, errors: 0 });
    setProgress({ current: 0, total: 100, message: 'Syncing production logs...' });
    
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/pts-sync/full-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          autoCreateBuildings: false,
          selectedProjects: Array.from(selectedProjects),
          selectedBuildings: Array.from(selectedBuildings),
          syncRawData: false,
          syncLogs: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Logs sync failed');
      }

      const result = await res.json();
      setLogsProgress({ created: result.logsCreated, updated: result.logsUpdated, errors: result.errors.length });
      
      setSyncResult(prev => prev ? {
        ...prev,
        logsCreated: result.logsCreated,
        logsUpdated: result.logsUpdated,
        errors: [...prev.errors, ...result.errors],
        skippedItems: [...(prev.skippedItems || []), ...(result.skippedItems || [])],
        syncedItems: [...(prev.syncedItems || []), ...(result.syncedItems || [])],
        projectStats: result.projectStats || prev.projectStats,
        duration: prev.duration + result.duration,
        success: prev.success && result.success,
      } : result);
      setPhase('complete');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Sync was stopped by user');
      } else {
        setError(err instanceof Error ? err.message : 'Logs sync failed');
      }
      setPhase('review');
    } finally {
      setIsStopping(false);
      abortControllerRef.current = null;
    }
  };

  const stopSync = () => {
    setIsStopping(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const reset = () => {
    setPhase('loading');
    setValidation(null);
    setSyncResult(null);
    setError(null);
    setProgress({ current: 0, total: 0, message: '' });
    setPartsProgress({ created: 0, updated: 0, errors: 0 });
    setLogsProgress({ created: 0, updated: 0, errors: 0 });
    setIsStopping(false);
    startValidation();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const handleRollback = async (projectNumber: string) => {
    setIsRollingBack(true);
    try {
      const response = await fetch('/api/pts-sync/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectNumber }),
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Rollback complete: ${result.partsDeleted} parts and ${result.logsDeleted} logs deleted`);
        setShowRollbackDialog(false);
        setRollbackProject(null);
      } else {
        const err = await response.json();
        alert(`Rollback failed: ${err.error}`);
      }
    } catch (error) {
      alert('Rollback failed: Network error');
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <RefreshCw className="h-8 w-8 text-blue-600" />
            Execute PTS Sync
          </h1>
          <p className="text-muted-foreground mt-1">
            Step 3: Select projects and execute sync
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          Step 3 of 3
        </Badge>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
            <Check className="h-4 w-4" />
          </div>
          <span className="text-green-600 font-medium">Raw Data Mapping</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
            <Check className="h-4 w-4" />
          </div>
          <span className="text-green-600 font-medium">Production Logs Mapping</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</div>
          <span className="font-medium">Sync</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-4 w-4 inline mr-2" />
          {error}
        </div>
      )}

      {/* Loading/Validating */}
      {(phase === 'loading' || phase === 'validating') && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="h-16 w-16 mx-auto text-blue-500 animate-spin mb-4" />
              <h3 className="text-lg font-medium mb-2">Validating Data...</h3>
              <p className="text-muted-foreground">
                Comparing PTS data with OTS to identify matches and differences
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Phase */}
      {phase === 'review' && validation && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{validation.projects.matched.length}</p>
                    <p className="text-xs text-muted-foreground">Projects Matched</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{validation.buildings.matched.length}</p>
                    <p className="text-xs text-muted-foreground">Buildings Matched</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{validation.rawDataCount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Assembly Parts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{validation.logCount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Production Logs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Select Projects to Sync
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllProjects}>
                    <CheckSquare className="h-4 w-4 mr-1" />
                    All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllProjects}>
                    <Square className="h-4 w-4 mr-1" />
                    None
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-auto">
                {validation.projects.matched.map(m => (
                  <div key={m.pts} className="flex items-center gap-3 text-sm p-2 rounded hover:bg-muted/50">
                    <Checkbox 
                      id={`project-${m.pts}`}
                      checked={selectedProjects.has(m.pts)}
                      onCheckedChange={() => toggleProject(m.pts)}
                    />
                    <label 
                      htmlFor={`project-${m.pts}`}
                      className="flex items-center gap-2 flex-1 cursor-pointer"
                    >
                      <span className="font-medium">{m.pts}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {validation.projects.otsProjects.find(p => p.id === m.ots.id)?.name}
                      </span>
                    </label>
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      Matched
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sync Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sync Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="sync-raw-data"
                    checked={syncRawData}
                    onCheckedChange={(checked) => setSyncRawData(checked === true)}
                  />
                  <label htmlFor="sync-raw-data" className="flex items-center gap-2 cursor-pointer">
                    <Package className="h-4 w-4 text-purple-500" />
                    Sync Assembly Parts
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="sync-logs"
                    checked={syncLogs}
                    onCheckedChange={(checked) => setSyncLogs(checked === true)}
                  />
                  <label htmlFor="sync-logs" className="flex items-center gap-2 cursor-pointer">
                    <ClipboardList className="h-4 w-4 text-orange-500" />
                    Sync Production Logs
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Data Preview
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (showPreview && previewData) {
                      setShowPreview(false);
                    } else {
                      fetchPreview();
                    }
                  }}
                  disabled={previewLoading}
                >
                  {previewLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Loading...
                    </>
                  ) : showPreview ? (
                    'Hide Preview'
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4 mr-1" />
                      Preview Data (first 20 rows)
                    </>
                  )}
                </Button>
              </CardTitle>
              <CardDescription>
                Preview the data that will be imported before starting the sync
              </CardDescription>
            </CardHeader>
            {previewError && (
              <CardContent className="pt-0">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  {previewError}
                </div>
              </CardContent>
            )}
            {showPreview && previewData && previewData.length > 0 && (
              <CardContent className="pt-0">
                <div className="border rounded-lg overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-10">#</TableHead>
                        {Object.keys(previewData[0]).map(key => (
                          <TableHead key={key} className="text-xs whitespace-nowrap">{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          {Object.values(row).map((val, colIdx) => (
                            <TableCell key={colIdx} className="text-xs whitespace-nowrap max-w-[200px] truncate" title={String(val || '')}>
                              {val || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Showing first {previewData.length} rows. Review the data above to ensure column mappings are correct before importing.
                </p>
              </CardContent>
            )}
            {showPreview && previewData && previewData.length === 0 && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">No data found to preview. Check your column mappings.</p>
              </CardContent>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => router.push('/pts-sync-simple/map-logs')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Logs Mapping
            </Button>
            <Button 
              onClick={startSync}
              disabled={selectedProjects.size === 0 || (!syncRawData && !syncLogs)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Sync ({selectedProjects.size} projects)
            </Button>
          </div>
        </div>
      )}

      {/* Syncing Parts */}
      {phase === 'syncing-parts' && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Loader2 className="h-16 w-16 mx-auto text-purple-500 animate-spin mb-4" />
              <h3 className="text-lg font-medium mb-2">Syncing Assembly Parts...</h3>
              <p className="text-muted-foreground mb-4">{progress.message}</p>
              <div className="max-w-md mx-auto space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Created: {partsProgress.created}</span>
                  <span>Updated: {partsProgress.updated}</span>
                  <span className="text-red-500">Errors: {partsProgress.errors}</span>
                </div>
              </div>
              <Button variant="destructive" onClick={stopSync} disabled={isStopping} className="mt-4">
                <StopCircle className="h-4 w-4 mr-2" />
                {isStopping ? 'Stopping...' : 'Stop Sync'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Syncing Logs */}
      {phase === 'syncing-logs' && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Loader2 className="h-16 w-16 mx-auto text-orange-500 animate-spin mb-4" />
              <h3 className="text-lg font-medium mb-2">Syncing Production Logs...</h3>
              <p className="text-muted-foreground mb-4">{progress.message}</p>
              <div className="max-w-md mx-auto space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Created: {logsProgress.created}</span>
                  <span>Updated: {logsProgress.updated}</span>
                  <span className="text-red-500">Errors: {logsProgress.errors}</span>
                </div>
              </div>
              <Button variant="destructive" onClick={stopSync} disabled={isStopping} className="mt-4">
                <StopCircle className="h-4 w-4 mr-2" />
                {isStopping ? 'Stopping...' : 'Stop Sync'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete */}
      {phase === 'complete' && syncResult && (
        <div className="space-y-6">
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="py-8">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">Sync Complete!</h3>
                <p className="text-muted-foreground">
                  Completed in {formatDuration(syncResult.duration)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Results Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{syncResult.partsCreated}</p>
                  <p className="text-xs text-muted-foreground">Parts Created</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{syncResult.partsUpdated}</p>
                  <p className="text-xs text-muted-foreground">Parts Updated</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{syncResult.logsCreated}</p>
                  <p className="text-xs text-muted-foreground">Logs Created</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{syncResult.logsUpdated}</p>
                  <p className="text-xs text-muted-foreground">Logs Updated</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Successfully Synced Items */}
          {syncResult.syncedItems && syncResult.syncedItems.length > 0 && (
            <Card className="border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  Successfully Synced ({syncResult.syncedItems.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" onClick={() => setShowSyncedDialog(true)} className="text-green-700 border-green-300 hover:bg-green-50">
                  View Synced Items
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Skipped Items */}
          {syncResult.skippedItems && syncResult.skippedItems.length > 0 && (
            <Card className="border-yellow-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
                  <AlertTriangle className="h-4 w-4" />
                  Skipped Items ({syncResult.skippedItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" onClick={() => setShowSkippedDialog(true)}>
                  View Skipped Items
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Project Stats */}
          {syncResult.projectStats && syncResult.projectStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Project Completion Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Parts</TableHead>
                      <TableHead>Logs</TableHead>
                      <TableHead>Completion</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncResult.projectStats.map(stat => (
                      <TableRow key={stat.projectNumber}>
                        <TableCell className="font-medium">
                          {stat.projectNumber} - {stat.projectName}
                        </TableCell>
                        <TableCell>{stat.syncedParts} / {stat.totalParts}</TableCell>
                        <TableCell>{stat.syncedLogs} / {stat.totalLogs}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={stat.completionPercent} className="w-20 h-2" />
                            <span className="text-sm">{stat.completionPercent}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              setRollbackProject(stat.projectNumber);
                              setShowRollbackDialog(true);
                            }}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Rollback
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => router.push('/pts-sync-simple')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to PTS Sync
            </Button>
            <Button onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Again
            </Button>
          </div>
        </div>
      )}

      {/* Successfully Synced Items Dialog */}
      <Dialog open={showSyncedDialog} onOpenChange={setShowSyncedDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Successfully Synced Items
            </DialogTitle>
            <DialogDescription>
              These production logs were successfully synced from PTS
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part#</TableHead>
                <TableHead>Process</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncResult?.syncedItems?.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-sm">{item.partDesignation}</TableCell>
                  <TableCell>{item.processType || '-'}</TableCell>
                  <TableCell>{item.projectNumber}</TableCell>
                  <TableCell>{item.buildingName || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={item.action === 'created' ? 'default' : 'secondary'} className={item.action === 'created' ? 'bg-green-600' : ''}>
                      {item.action}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Skipped Items Dialog */}
      <Dialog open={showSkippedDialog} onOpenChange={setShowSkippedDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Skipped Items
            </DialogTitle>
            <DialogDescription>
              These items were skipped during sync due to missing or invalid data
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Part</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncResult?.skippedItems?.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.rowNumber}</TableCell>
                  <TableCell>
                    <Badge variant={item.type === 'part' ? 'secondary' : 'outline'}>
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.partDesignation}</TableCell>
                  <TableCell>{item.projectNumber}</TableCell>
                  <TableCell className="text-red-600 text-sm">{item.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Rollback
            </DialogTitle>
            <DialogDescription>
              This will delete ALL assembly parts and production logs for project <strong>{rollbackProject}</strong> that were imported from PTS.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRollbackDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => rollbackProject && handleRollback(rollbackProject)}
              disabled={isRollingBack}
            >
              {isRollingBack ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Confirm Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
