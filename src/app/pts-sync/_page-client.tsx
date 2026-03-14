'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Plus, 
  Settings, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileSpreadsheet,
  Link2,
  AlertCircle,
  Loader2,
  Trash2,
  Eye,
  History
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

interface Project {
  id: string;
  name: string;
  projectNumber: string;
}

interface SyncConfig {
  id: string;
  name: string;
  spreadsheetId: string;
  sheetName: string;
  projectId: string;
  columnMapping: {
    partNumber: string;
    process: string;
    processedQty: string;
    processDate: string;
    processLocation: string;
    processedBy: string;
    reportNo: string;
  };
  headerRow: number;
  dataStartRow: number;
  syncInterval: number;
  lastSyncAt: string | null;
  isActive: boolean;
  project?: Project;
  lastSync?: {
    status: string;
    totalRows: number;
    syncedRows: number;
    skippedRows: number;
    duration: number;
    syncedAt: string;
  };
}

interface SyncLog {
  id: string;
  status: string;
  totalRows: number;
  syncedRows: number;
  skippedRows: number;
  errors: string[];
  duration: number;
  syncedAt: string;
}

interface PreviewRow {
  rowNumber: number;
  partNumber: string;
  process: string;
  processedQty: number;
  processDate: string | null;
  processLocation: string;
  processedBy: string;
  reportNo: string;
  projectCode?: string;
  buildingName?: string;
  partQuantity?: number;
}

const DEFAULT_COLUMN_MAPPING = {
  partNumber: 'B',
  process: 'C',
  processedQty: 'D',
  processDate: 'E',
  processLocation: 'F',
  processedBy: 'G',
  reportNo: 'H',
  // Optional columns for auto-creating assembly parts
  projectCode: '',
  buildingName: '',
  quantity: '',
};

export default function PTSSyncPage() {
  const [configs, setConfigs] = useState<SyncConfig[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<SyncConfig | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncLog[]>([]);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // New config form state
  const [newConfig, setNewConfig] = useState({
    name: '',
    spreadsheetId: '',
    sheetName: '',
    projectId: '',
    columnMapping: DEFAULT_COLUMN_MAPPING,
    headerRow: 1,
    dataStartRow: 2,
    syncInterval: 0,
    autoCreateParts: true, // Auto-create assembly parts if not found
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    title?: string;
    sheets?: string[];
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetchConfigs();
    fetchProjects();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/pts-sync');
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
      }
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const testConnection = async () => {
    if (!newConfig.spreadsheetId) return;
    
    setTestingConnection(true);
    setConnectionResult(null);
    
    try {
      const res = await fetch('/api/pts-sync/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: newConfig.spreadsheetId }),
      });
      const data = await res.json();
      setConnectionResult(data);
      
      // Auto-select first sheet if available
      if (data.success && data.sheets?.length > 0 && !newConfig.sheetName) {
        setNewConfig(prev => ({ ...prev, sheetName: data.sheets[0] }));
      }
    } catch (error) {
      setConnectionResult({ success: false, error: 'Connection failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const createConfig = async () => {
    try {
      const res = await fetch('/api/pts-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      
      if (res.ok) {
        setShowNewDialog(false);
        setNewConfig({
          name: '',
          spreadsheetId: '',
          sheetName: '',
          projectId: '',
          columnMapping: DEFAULT_COLUMN_MAPPING,
          headerRow: 1,
          dataStartRow: 2,
          syncInterval: 0,
        });
        setConnectionResult(null);
        fetchConfigs();
      }
    } catch (error) {
      console.error('Failed to create config:', error);
    }
  };

  const executeSync = async (configId: string) => {
    setSyncing(configId);
    try {
      const res = await fetch(`/api/pts-sync/${configId}/execute`, {
        method: 'POST',
      });
      const result = await res.json();
      
      if (result.success) {
        fetchConfigs();
      } else {
        console.error('Sync failed:', result.errors);
      }
    } catch (error) {
      console.error('Failed to execute sync:', error);
    } finally {
      setSyncing(null);
    }
  };

  const deleteConfig = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this sync configuration?')) return;
    
    try {
      const res = await fetch(`/api/pts-sync/${configId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchConfigs();
      }
    } catch (error) {
      console.error('Failed to delete config:', error);
    }
  };

  const viewHistory = async (config: SyncConfig) => {
    setSelectedConfig(config);
    setShowHistoryDialog(true);
    
    try {
      const res = await fetch(`/api/pts-sync/${config.id}`);
      if (res.ok) {
        const data = await res.json();
        setSyncHistory(data.syncLogs || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const previewSheetData = async () => {
    if (!newConfig.spreadsheetId || !newConfig.sheetName) return;
    
    setPreviewLoading(true);
    setShowPreviewDialog(true);
    
    try {
      const res = await fetch('/api/pts-sync/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: newConfig.spreadsheetId,
          sheetName: newConfig.sheetName,
          columnMapping: newConfig.columnMapping,
          dataStartRow: newConfig.dataStartRow,
          limit: 10,
        }),
      });
      const data = await res.json();
      setPreviewData(data.data || []);
    } catch (error) {
      console.error('Failed to preview data:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const extractSpreadsheetId = (url: string) => {
    // Extract ID from Google Sheets URL
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
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
            Sync production tracking data from Google Sheets to OTS
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Sync Connection
        </Button>
      </div>

      {/* Setup Instructions */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Setup Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>1. Google Service Account:</strong> Create a service account in Google Cloud Console and download the JSON key.</p>
          <p><strong>2. Environment Variable:</strong> Add <code className="bg-gray-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_KEY</code> to your .env file with the JSON key content.</p>
          <p><strong>3. Share Sheet:</strong> Share your Google Sheet with the service account email (found in the JSON key).</p>
        </CardContent>
      </Card>

      {/* Sync Configurations */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Sync Connections</h3>
            <p className="text-muted-foreground text-center mt-1">
              Create a new connection to start syncing data from Google Sheets
            </p>
            <Button className="mt-4" onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configs.map(config => (
            <Card key={config.id} className={!config.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {config.name}
                      {config.isActive ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">Disabled</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Project: {config.project?.name || 'Unknown'} ({config.project?.projectNumber})
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewHistory(config)}
                    >
                      <History className="h-4 w-4 mr-1" />
                      History
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => executeSync(config.id)}
                      disabled={syncing === config.id || !config.isActive}
                    >
                      {syncing === config.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      Sync Now
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteConfig(config.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sheet:</span>
                    <p className="font-medium">{config.sheetName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Sync:</span>
                    <p className="font-medium">{formatDate(config.lastSyncAt)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Result:</span>
                    {config.lastSync ? (
                      <p className="font-medium flex items-center gap-1">
                        {config.lastSync.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : config.lastSync.status === 'partial' ? (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        {config.lastSync.syncedRows}/{config.lastSync.totalRows} rows
                      </p>
                    ) : (
                      <p className="text-muted-foreground">No syncs yet</p>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Auto Sync:</span>
                    <p className="font-medium">
                      {config.syncInterval > 0 ? `Every ${config.syncInterval} min` : 'Manual only'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Connection Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New PTS Sync Connection</DialogTitle>
            <DialogDescription>
              Connect a Google Sheet to sync production tracking data
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="connection" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="connection">Connection</TabsTrigger>
              <TabsTrigger value="mapping">Column Mapping</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="connection" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Connection Name</Label>
                <Input
                  placeholder="e.g., Main PTS Sheet"
                  value={newConfig.name}
                  onChange={e => setNewConfig(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Google Sheet URL or ID</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste Google Sheets URL or ID"
                    value={newConfig.spreadsheetId}
                    onChange={e => setNewConfig(prev => ({ 
                      ...prev, 
                      spreadsheetId: extractSpreadsheetId(e.target.value) 
                    }))}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    onClick={testConnection}
                    disabled={testingConnection || !newConfig.spreadsheetId}
                  >
                    {testingConnection ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {connectionResult && (
                  <div className={`p-3 rounded-md text-sm ${
                    connectionResult.success 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {connectionResult.success ? (
                      <>
                        <p className="font-medium flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Connected: {connectionResult.title}
                        </p>
                        <p className="mt-1">Available sheets: {connectionResult.sheets?.join(', ')}</p>
                      </>
                    ) : (
                      <p className="flex items-center gap-1">
                        <XCircle className="h-4 w-4" />
                        {connectionResult.error}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Sheet Name (Tab)</Label>
                {connectionResult?.success && connectionResult.sheets ? (
                  <Select
                    value={newConfig.sheetName}
                    onValueChange={value => setNewConfig(prev => ({ ...prev, sheetName: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sheet" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectionResult.sheets.map(sheet => (
                        <SelectItem key={sheet} value={sheet}>{sheet}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="e.g., Sheet1"
                    value={newConfig.sheetName}
                    onChange={e => setNewConfig(prev => ({ ...prev, sheetName: e.target.value }))}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Target Project</Label>
                <Select
                  value={newConfig.projectId}
                  onValueChange={value => setNewConfig(prev => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.projectNumber} - {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="mapping" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Map your PTS sheet columns to OTS fields. Enter the column letter (A, B, C, etc.)
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Part# Column</Label>
                  <Input
                    value={newConfig.columnMapping.partNumber}
                    onChange={e => setNewConfig(prev => ({
                      ...prev,
                      columnMapping: { ...prev.columnMapping, partNumber: e.target.value.toUpperCase() }
                    }))}
                    maxLength={2}
                    className="w-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Process Column</Label>
                  <Input
                    value={newConfig.columnMapping.process}
                    onChange={e => setNewConfig(prev => ({
                      ...prev,
                      columnMapping: { ...prev.columnMapping, process: e.target.value.toUpperCase() }
                    }))}
                    maxLength={2}
                    className="w-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Processed Qty Column</Label>
                  <Input
                    value={newConfig.columnMapping.processedQty}
                    onChange={e => setNewConfig(prev => ({
                      ...prev,
                      columnMapping: { ...prev.columnMapping, processedQty: e.target.value.toUpperCase() }
                    }))}
                    maxLength={2}
                    className="w-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Process Date Column</Label>
                  <Input
                    value={newConfig.columnMapping.processDate}
                    onChange={e => setNewConfig(prev => ({
                      ...prev,
                      columnMapping: { ...prev.columnMapping, processDate: e.target.value.toUpperCase() }
                    }))}
                    maxLength={2}
                    className="w-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Process Location Column</Label>
                  <Input
                    value={newConfig.columnMapping.processLocation}
                    onChange={e => setNewConfig(prev => ({
                      ...prev,
                      columnMapping: { ...prev.columnMapping, processLocation: e.target.value.toUpperCase() }
                    }))}
                    maxLength={2}
                    className="w-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Processed By Column</Label>
                  <Input
                    value={newConfig.columnMapping.processedBy}
                    onChange={e => setNewConfig(prev => ({
                      ...prev,
                      columnMapping: { ...prev.columnMapping, processedBy: e.target.value.toUpperCase() }
                    }))}
                    maxLength={2}
                    className="w-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Report No. Column</Label>
                  <Input
                    value={newConfig.columnMapping.reportNo}
                    onChange={e => setNewConfig(prev => ({
                      ...prev,
                      columnMapping: { ...prev.columnMapping, reportNo: e.target.value.toUpperCase() }
                    }))}
                    maxLength={2}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Optional columns for auto-creating assembly parts */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-2">Optional: Auto-Create Assembly Parts</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  If assembly parts don&apos;t exist in OTS, they can be auto-created. Map these columns if your sheet has project/building info.
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Project Code Column</Label>
                    <Input
                      value={newConfig.columnMapping.projectCode || ''}
                      onChange={e => setNewConfig(prev => ({
                        ...prev,
                        columnMapping: { ...prev.columnMapping, projectCode: e.target.value.toUpperCase() }
                      }))}
                      placeholder="Optional"
                      maxLength={2}
                      className="w-20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Building Name Column</Label>
                    <Input
                      value={newConfig.columnMapping.buildingName || ''}
                      onChange={e => setNewConfig(prev => ({
                        ...prev,
                        columnMapping: { ...prev.columnMapping, buildingName: e.target.value.toUpperCase() }
                      }))}
                      placeholder="Optional"
                      maxLength={2}
                      className="w-20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Part Quantity Column</Label>
                    <Input
                      value={newConfig.columnMapping.quantity || ''}
                      onChange={e => setNewConfig(prev => ({
                        ...prev,
                        columnMapping: { ...prev.columnMapping, quantity: e.target.value.toUpperCase() }
                      }))}
                      placeholder="Optional"
                      maxLength={2}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              {newConfig.spreadsheetId && newConfig.sheetName && (
                <Button variant="outline" onClick={previewSheetData}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Data
                </Button>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Header Row</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newConfig.headerRow}
                    onChange={e => setNewConfig(prev => ({ ...prev, headerRow: parseInt(e.target.value) || 1 }))}
                  />
                  <p className="text-xs text-muted-foreground">Row number containing column headers</p>
                </div>
                <div className="space-y-2">
                  <Label>Data Start Row</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newConfig.dataStartRow}
                    onChange={e => setNewConfig(prev => ({ ...prev, dataStartRow: parseInt(e.target.value) || 2 }))}
                  />
                  <p className="text-xs text-muted-foreground">First row containing actual data</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Auto Sync Interval</Label>
                <Select
                  value={newConfig.syncInterval.toString()}
                  onValueChange={value => setNewConfig(prev => ({ ...prev, syncInterval: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Manual only</SelectItem>
                    <SelectItem value="5">Every 5 minutes</SelectItem>
                    <SelectItem value="15">Every 15 minutes</SelectItem>
                    <SelectItem value="30">Every 30 minutes</SelectItem>
                    <SelectItem value="60">Every hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Create Assembly Parts</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically create assembly parts if they don&apos;t exist in OTS
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newConfig.autoCreateParts}
                    onChange={e => setNewConfig(prev => ({ ...prev, autoCreateParts: e.target.checked }))}
                    className="h-5 w-5 rounded border-gray-300"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createConfig}
              disabled={!newConfig.name || !newConfig.spreadsheetId || !newConfig.sheetName || !newConfig.projectId}
            >
              Create Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sync History - {selectedConfig?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No sync history yet
                    </TableCell>
                  </TableRow>
                ) : (
                  syncHistory.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.syncedAt)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          log.status === 'success' ? 'default' :
                          log.status === 'partial' ? 'secondary' : 'destructive'
                        }>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.syncedRows}/{log.totalRows}
                        {log.skippedRows > 0 && (
                          <span className="text-muted-foreground"> ({log.skippedRows} skipped)</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDuration(log.duration)}</TableCell>
                      <TableCell>
                        {log.errors?.length > 0 ? (
                          <span className="text-red-500">{log.errors.length} errors</span>
                        ) : (
                          <span className="text-green-500">None</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Data Preview</DialogTitle>
            <DialogDescription>
              First 10 rows from the sheet with current column mapping
            </DialogDescription>
          </DialogHeader>
          
          {previewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Part#</TableHead>
                    <TableHead>Process</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Report</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No data found
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewData.map(row => (
                      <TableRow key={row.rowNumber}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell className="font-mono">{row.partNumber}</TableCell>
                        <TableCell>{row.process}</TableCell>
                        <TableCell>{row.processedQty}</TableCell>
                        <TableCell>{row.processDate || '-'}</TableCell>
                        <TableCell>{row.processLocation}</TableCell>
                        <TableCell>{row.processedBy}</TableCell>
                        <TableCell>{row.reportNo || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
