'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  projectStats: ProjectSyncStats[];
  duration: number;
  syncBatchId: string;
}

type SyncPhase = 'idle' | 'validating' | 'review' | 'syncing-parts' | 'syncing-logs' | 'complete';

interface LiveSyncItem {
  type: 'part' | 'log';
  designation: string;
  action: 'created' | 'updated' | 'error';
  timestamp: Date;
}

export default function PTSSyncSimplePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<SyncPhase>('idle');
  const [validation, setValidation] = useState<SyncValidation | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [showUnmatchedDialog, setShowUnmatchedDialog] = useState(false);
  
  // Selection state
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [selectedBuildings, setSelectedBuildings] = useState<Set<string>>(new Set());
  const [syncRawData, setSyncRawData] = useState(true);
  const [syncLogs, setSyncLogs] = useState(true);
  
  // Stop sync and live items
  const [isStopping, setIsStopping] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [liveItems, setLiveItems] = useState<LiveSyncItem[]>([]);
  const [partsProgress, setPartsProgress] = useState({ created: 0, updated: 0, errors: 0 });
  const [logsProgress, setLogsProgress] = useState({ created: 0, updated: 0, errors: 0 });
  
  // Rollback and skipped items
  const [showSkippedDialog, setShowSkippedDialog] = useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [rollbackProject, setRollbackProject] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Initialize selections when validation completes
  useEffect(() => {
    if (validation) {
      // Select all matched projects by default
      setSelectedProjects(new Set(validation.projects.matched.map(m => m.pts)));
      // Select all buildings (matched + unmatched) by default
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
        // Also deselect buildings for this project
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
        // Also select all buildings for this project
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

  const toggleBuilding = (key: string) => {
    setSelectedBuildings(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
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
      setPhase('idle');
    }
  };

  const executeSyncParts = async () => {
    setPhase('syncing-parts');
    setError(null);
    setLiveItems([]);
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
      
      // If logs sync is enabled, proceed to logs phase
      if (syncLogs) {
        setPhase('review'); // Go back to review to let user start logs sync
        setSyncResult({
          ...result,
          logsCreated: 0,
          logsUpdated: 0,
        });
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
      
      // Combine with parts result
      setSyncResult(prev => prev ? {
        ...prev,
        logsCreated: result.logsCreated,
        logsUpdated: result.logsUpdated,
        errors: [...prev.errors, ...result.errors],
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
    setPhase('idle');
    setValidation(null);
    setSyncResult(null);
    setError(null);
    setProgress({ current: 0, total: 0, message: '' });
    setLiveItems([]);
    setPartsProgress({ created: 0, updated: 0, errors: 0 });
    setLogsProgress({ created: 0, updated: 0, errors: 0 });
    setIsStopping(false);
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
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                PTS Sync
              </h1>
              <p className="text-muted-foreground mt-1">
                Sync production data from Google Sheets PTS to OTS
              </p>
            </div>
          </div>

      {/* Main Sync Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync with PTS
          </CardTitle>
          <CardDescription>
            Sync raw data (assembly parts) and production logs from PTS Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phase: Idle */}
          {phase === 'idle' && (
            <div className="py-8">
              <div className="text-center mb-8">
                <FileSpreadsheet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">PTS Sync Options</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Choose what to sync from PTS Google Sheets. You can sync assembly parts and production logs separately.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {/* Assembly Parts Sync */}
                <Card className="border-2 hover:border-purple-300 transition-colors">
                  <CardHeader className="text-center pb-2">
                    <Package className="h-12 w-12 mx-auto text-purple-500 mb-2" />
                    <CardTitle className="text-lg">Assembly Parts</CardTitle>
                    <CardDescription>
                      Sync raw data from 02-Raw Data sheet
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button 
                      size="lg" 
                      onClick={() => router.push('/pts-sync-simple/map-raw-data?mode=parts')} 
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      <Package className="h-5 w-5 mr-2" />
                      Sync Assembly Parts
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Map columns → Select projects → Import parts
                    </p>
                  </CardContent>
                </Card>

                {/* Production Logs Sync */}
                <Card className="border-2 hover:border-orange-300 transition-colors">
                  <CardHeader className="text-center pb-2">
                    <ClipboardList className="h-12 w-12 mx-auto text-orange-500 mb-2" />
                    <CardTitle className="text-lg">Production Logs</CardTitle>
                    <CardDescription>
                      Sync logs from 04-Log sheet
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button 
                      size="lg" 
                      onClick={() => router.push('/pts-sync-simple/map-logs?mode=logs')} 
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      <ClipboardList className="h-5 w-5 mr-2" />
                      Sync Production Logs
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Map columns → Select projects → Import logs
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center mt-8">
                <p className="text-sm text-muted-foreground mb-3">Or sync both at once:</p>
                <Button variant="outline" size="lg" onClick={() => router.push('/pts-sync-simple/map-raw-data?mode=full')}>
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Full Sync Wizard (Parts + Logs)
                </Button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Phase: Validating */}
          {phase === 'validating' && (
            <div className="text-center py-8">
              <Loader2 className="h-16 w-16 mx-auto text-blue-500 animate-spin mb-4" />
              <h3 className="text-lg font-medium mb-2">Validating Data...</h3>
              <p className="text-muted-foreground">
                Comparing PTS data with OTS to identify matches and differences
              </p>
            </div>
          )}

          {/* Phase: Review */}
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
                    {validation.projects.unmatched.map(p => (
                      <div key={p} className="flex items-center gap-3 text-sm p-2 rounded bg-red-50/50 opacity-60">
                        <Checkbox disabled checked={false} />
                        <span className="font-medium text-red-600">{p}</span>
                        <Badge variant="outline" className="text-red-600 border-red-300">
                          Not in OTS
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {selectedProjects.size} of {validation.projects.matched.length} projects selected
                  </p>
                </CardContent>
              </Card>

              {/* Building Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Select Buildings to Sync
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setShowUnmatchedDialog(true)}>
                      View All ({validation.buildings.matched.length + validation.buildings.unmatched.length})
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {/* Show buildings for selected projects only */}
                    {validation.buildings.matched
                      .filter(m => selectedProjects.has(m.pts.projectNumber))
                      .slice(0, 10)
                      .map((m, i) => {
                        const key = `${m.pts.projectNumber}-${m.pts.designation}`;
                        return (
                          <div key={i} className="flex items-center gap-3 text-sm p-2 rounded hover:bg-muted/50">
                            <Checkbox 
                              id={`building-${key}`}
                              checked={selectedBuildings.has(key)}
                              onCheckedChange={() => toggleBuilding(key)}
                            />
                            <label 
                              htmlFor={`building-${key}`}
                              className="flex items-center gap-2 flex-1 cursor-pointer"
                            >
                              <span className="font-medium">{key}</span>
                            </label>
                            <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                              Exists
                            </Badge>
                          </div>
                        );
                      })}
                    {validation.buildings.unmatched
                      .filter(b => selectedProjects.has(b.projectNumber))
                      .slice(0, 5)
                      .map((b, i) => {
                        const key = `${b.projectNumber}-${b.designation}`;
                        return (
                          <div key={`new-${i}`} className="flex items-center gap-3 text-sm p-2 rounded hover:bg-muted/50 bg-amber-50/50">
                            <Checkbox 
                              id={`building-${key}`}
                              checked={selectedBuildings.has(key)}
                              onCheckedChange={() => toggleBuilding(key)}
                            />
                            <label 
                              htmlFor={`building-${key}`}
                              className="flex items-center gap-2 flex-1 cursor-pointer"
                            >
                              <span className="font-medium">{key}</span>
                              <span className="text-xs text-muted-foreground">({b.name})</span>
                            </label>
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                              New
                            </Badge>
                          </div>
                        );
                      })}
                    {(validation.buildings.matched.filter(m => selectedProjects.has(m.pts.projectNumber)).length > 10 ||
                      validation.buildings.unmatched.filter(b => selectedProjects.has(b.projectNumber)).length > 5) && (
                      <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setShowUnmatchedDialog(true)}>
                        View all buildings...
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {selectedBuildings.size} buildings selected for sync
                  </p>
                </CardContent>
              </Card>

              {/* Sync Options */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Sync Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        id="sync-raw-data"
                        checked={syncRawData}
                        onCheckedChange={(checked) => setSyncRawData(checked === true)}
                      />
                      <label htmlFor="sync-raw-data" className="cursor-pointer">
                        <span className="font-medium">Sync Raw Data (Assembly Parts)</span>
                        <p className="text-xs text-muted-foreground">
                          Creates/updates assembly parts with weight, area, quantity
                        </p>
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        id="sync-logs"
                        checked={syncLogs}
                        onCheckedChange={(checked) => setSyncLogs(checked === true)}
                        disabled={!syncRawData}
                      />
                      <label htmlFor="sync-logs" className={`cursor-pointer ${!syncRawData ? 'opacity-50' : ''}`}>
                        <span className="font-medium">Sync Production Logs</span>
                        <p className="text-xs text-muted-foreground">
                          Creates/updates production logs linked to assembly parts
                        </p>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* What will happen */}
              <Card className="bg-blue-50/50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">What will happen</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>✓ <strong>{validation.rawDataCount.toLocaleString()}</strong> assembly parts will be synced (create/update)</p>
                  <p>✓ <strong>{validation.logCount.toLocaleString()}</strong> production logs will be synced (create/update)</p>
                  <p>✓ <strong>{validation.buildings.unmatched.length}</strong> new buildings will be created</p>
                  <p>✓ All synced logs will be marked with <code className="bg-white px-1 rounded">source=&apos;PTS&apos;</code></p>
                </CardContent>
              </Card>

              {/* Parts Sync Progress (if completed) */}
              {partsProgress.created > 0 || partsProgress.updated > 0 ? (
                <Card className="bg-green-50/50 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Parts Sync Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="flex gap-4">
                      <span className="text-green-600">{partsProgress.created} created</span>
                      <span className="text-blue-600">{partsProgress.updated} updated</span>
                      {partsProgress.errors > 0 && <span className="text-red-600">{partsProgress.errors} errors</span>}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={reset}>
                  Cancel
                </Button>
                {syncRawData && partsProgress.created === 0 && partsProgress.updated === 0 ? (
                  <Button onClick={executeSyncParts} disabled={selectedProjects.size === 0}>
                    <Play className="h-4 w-4 mr-2" />
                    Step 1: Sync Parts
                  </Button>
                ) : syncLogs ? (
                  <Button onClick={executeSyncLogs} disabled={selectedProjects.size === 0}>
                    <Play className="h-4 w-4 mr-2" />
                    Step 2: Sync Logs
                  </Button>
                ) : (
                  <Button onClick={reset}>
                    Done
                  </Button>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Phase: Syncing Parts */}
          {phase === 'syncing-parts' && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <Loader2 className="h-16 w-16 mx-auto text-blue-500 animate-spin mb-4" />
                <h3 className="text-lg font-medium">Syncing Assembly Parts...</h3>
                <p className="text-muted-foreground">{progress.message}</p>
              </div>
              
              <Progress value={(progress.current / Math.max(progress.total, 1)) * 100} className="max-w-md mx-auto" />
              
              {/* Live Progress */}
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <Card className="bg-green-50">
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{partsProgress.created}</p>
                    <p className="text-xs text-muted-foreground">Created</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50">
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{partsProgress.updated}</p>
                    <p className="text-xs text-muted-foreground">Updated</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50">
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{partsProgress.errors}</p>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-center">
                <Button variant="destructive" onClick={stopSync} disabled={isStopping}>
                  <StopCircle className="h-4 w-4 mr-2" />
                  {isStopping ? 'Stopping...' : 'Stop Sync'}
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                This may take a few minutes for large datasets
              </p>
            </div>
          )}

          {/* Phase: Syncing Logs */}
          {phase === 'syncing-logs' && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <Loader2 className="h-16 w-16 mx-auto text-orange-500 animate-spin mb-4" />
                <h3 className="text-lg font-medium">Syncing Production Logs...</h3>
                <p className="text-muted-foreground">{progress.message}</p>
              </div>
              
              <Progress value={(progress.current / Math.max(progress.total, 1)) * 100} className="max-w-md mx-auto" />
              
              {/* Live Progress */}
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <Card className="bg-green-50">
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{logsProgress.created}</p>
                    <p className="text-xs text-muted-foreground">Created</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50">
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{logsProgress.updated}</p>
                    <p className="text-xs text-muted-foreground">Updated</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50">
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{logsProgress.errors}</p>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-center">
                <Button variant="destructive" onClick={stopSync} disabled={isStopping}>
                  <StopCircle className="h-4 w-4 mr-2" />
                  {isStopping ? 'Stopping...' : 'Stop Sync'}
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                This may take a few minutes for large datasets
              </p>
            </div>
          )}

          {/* Phase: Complete */}
          {phase === 'complete' && syncResult && (
            <div className="space-y-6">
              <div className="text-center py-4">
                {syncResult.success ? (
                  <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                ) : (
                  <AlertCircle className="h-16 w-16 mx-auto text-amber-500 mb-4" />
                )}
                <h3 className="text-lg font-medium">
                  {syncResult.success ? 'Sync Complete!' : 'Sync Completed with Errors'}
                </h3>
                <p className="text-muted-foreground">
                  Completed in {formatDuration(syncResult.duration)}
                </p>
              </div>

              {/* Results */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{syncResult.partsCreated}</p>
                    <p className="text-xs text-muted-foreground">Parts Created</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{syncResult.partsUpdated}</p>
                    <p className="text-xs text-muted-foreground">Parts Updated</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{syncResult.logsCreated}</p>
                    <p className="text-xs text-muted-foreground">Logs Created</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{syncResult.logsUpdated}</p>
                    <p className="text-xs text-muted-foreground">Logs Updated</p>
                  </CardContent>
                </Card>
              </div>

              {/* Project Completion Stats */}
              {syncResult.projectStats && syncResult.projectStats.length > 0 && (
                <Card className="border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-blue-600 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Completion by Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {syncResult.projectStats.map((stat) => (
                        <div key={stat.projectNumber} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{stat.projectNumber} - {stat.projectName}</p>
                            <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                              <span>Parts: {stat.syncedParts}/{stat.totalParts}</span>
                              <span>Logs: {stat.syncedLogs}/{stat.totalLogs}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-lg font-bold text-blue-600">{stat.completionPercent}%</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => {
                                setRollbackProject(stat.projectNumber);
                                setShowRollbackDialog(true);
                              }}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Rollback
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Skipped/Corrupted Items */}
              {syncResult.skippedItems && syncResult.skippedItems.length > 0 && (
                <Card className="border-amber-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-amber-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Skipped Items ({syncResult.skippedItems.length})
                    </CardTitle>
                    <CardDescription>
                      These items were not synced due to missing or invalid data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-40 overflow-auto text-sm space-y-1">
                      {syncResult.skippedItems.slice(0, 10).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-amber-50 rounded text-amber-700">
                          <Badge variant="outline" className="text-xs">
                            {item.type === 'part' ? 'Part' : 'Log'}
                          </Badge>
                          <span className="font-mono text-xs">{item.partDesignation || `Row ${item.rowNumber}`}</span>
                          <span className="text-xs">- {item.reason}</span>
                        </div>
                      ))}
                      {syncResult.skippedItems.length > 10 && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-amber-600"
                          onClick={() => setShowSkippedDialog(true)}
                        >
                          View all {syncResult.skippedItems.length} skipped items
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Errors */}
              {syncResult.errors.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-red-600 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Errors ({syncResult.errors.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-40 overflow-auto text-sm space-y-1">
                      {syncResult.errors.slice(0, 20).map((err, i) => (
                        <p key={i} className="text-red-600">{err}</p>
                      ))}
                      {syncResult.errors.length > 20 && (
                        <p className="text-muted-foreground">+{syncResult.errors.length - 20} more errors</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-center">
                <Button onClick={reset}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unmatched Buildings Dialog */}
      <Dialog open={showUnmatchedDialog} onOpenChange={setShowUnmatchedDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buildings to be Created</DialogTitle>
            <DialogDescription>
              These buildings from PTS don&apos;t exist in OTS and will be automatically created during sync.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validation?.buildings.unmatched.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell>{b.projectNumber}</TableCell>
                    <TableCell>{b.designation}</TableCell>
                    <TableCell>{b.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowUnmatchedDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skipped Items Dialog */}
      <Dialog open={showSkippedDialog} onOpenChange={setShowSkippedDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Skipped Items
            </DialogTitle>
            <DialogDescription>
              These items were not synced due to missing or invalid data. Review and fix in PTS before re-syncing.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Row #</TableHead>
                  <TableHead>Part Designation</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncResult?.skippedItems?.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant="outline" className={item.type === 'part' ? 'text-blue-600' : 'text-orange-600'}>
                        {item.type === 'part' ? 'Part' : 'Log'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.rowNumber}</TableCell>
                    <TableCell className="font-mono text-sm">{item.partDesignation || '-'}</TableCell>
                    <TableCell className="text-sm text-amber-700">{item.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSkippedDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <RotateCcw className="h-5 w-5" />
              Rollback Project Sync
            </DialogTitle>
            <DialogDescription>
              This will delete all PTS-synced assembly parts and production logs for project <strong>{rollbackProject}</strong>. 
              This action cannot be undone. Manually added (OTS) data will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRollbackDialog(false)} disabled={isRollingBack}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => rollbackProject && handleRollback(rollbackProject)}
              disabled={isRollingBack}
            >
              {isRollingBack ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rolling back...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Confirm Rollback
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
  );
}
