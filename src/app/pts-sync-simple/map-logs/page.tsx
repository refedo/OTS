'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  ArrowLeft,
  Loader2, 
  ClipboardList,
  Database,
  Check,
  AlertCircle,
  Play
} from 'lucide-react';
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

interface ColumnHeader {
  index: number;
  column: string;
  name: string;
  sample: string;
}

interface FieldMapping {
  dbField: string;
  label: string;
  required: boolean;
  description: string;
  mappedColumn: string | null;
}

// Only these fields are fetched from Google Sheets
// Other fields (project #, building name, weight, name) are read from existing assembly parts
const DB_FIELDS: FieldMapping[] = [
  { dbField: 'partNumber', label: 'Part Number', required: true, description: 'Part designation to link log to (e.g., "253-103-CO11") - must match existing assembly part', mappedColumn: null },
  { dbField: 'process', label: 'Process Type', required: true, description: 'Process name (e.g., "Fit-up", "Welding")', mappedColumn: null },
  { dbField: 'processedQty', label: 'Processed Quantity', required: false, description: 'Number of pieces processed', mappedColumn: null },
  { dbField: 'processDate', label: 'Process Date', required: false, description: 'Date when process was done', mappedColumn: null },
  { dbField: 'processLocation', label: 'Process Location', required: false, description: 'Where the process was performed', mappedColumn: null },
  { dbField: 'processedBy', label: 'Processed By', required: false, description: 'Team or person who did the work', mappedColumn: null },
  { dbField: 'reportNo', label: 'Report Number', required: false, description: 'Report or dispatch number', mappedColumn: null },
];

const DEFAULT_MAPPINGS: Record<string, string> = {
  partNumber: 'B',
  process: 'C',
  processedQty: 'D',
  processDate: 'E',
  processLocation: 'F',
  processedBy: 'G',
  reportNo: 'H',
};

export default function MapLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'full'; // 'logs' or 'full'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnHeader[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>(DB_FIELDS);
  const [hasRawDataMapping, setHasRawDataMapping] = useState(false);

  useEffect(() => {
    // For logs-only mode, skip raw data mapping check
    if (mode === 'logs') {
      setHasRawDataMapping(true);
      fetchColumns();
      return;
    }
    
    // Check if raw data mapping exists for full mode
    const rawDataMapping = localStorage.getItem('pts-raw-data-mapping');
    if (!rawDataMapping) {
      router.push('/pts-sync-simple/map-raw-data?mode=' + mode);
      return;
    }
    setHasRawDataMapping(true);
    fetchColumns();
  }, [router, mode]);

  const fetchColumns = async () => {
    try {
      const res = await fetch('/api/pts-sync/columns');
      if (!res.ok) throw new Error('Failed to fetch columns');
      const data = await res.json();
      setColumns(data.logs.headers);
      
      // Apply default mappings
      setMappings(prev => prev.map(m => ({
        ...m,
        mappedColumn: DEFAULT_MAPPINGS[m.dbField] || null,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load columns');
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = (dbField: string, column: string | null) => {
    setMappings(prev => prev.map(m => 
      m.dbField === dbField ? { ...m, mappedColumn: column } : m
    ));
  };

  const getColumnInfo = (column: string) => {
    return columns.find(c => c.column === column);
  };

  const validateMappings = () => {
    const required = mappings.filter(m => m.required);
    return required.every(m => m.mappedColumn !== null);
  };

  const saveMappingsAndStartSync = async () => {
    if (!validateMappings()) {
      setError('Please map all required fields');
      return;
    }

    setSaving(true);
    try {
      // Save mappings to localStorage
      const mappingConfig = mappings.reduce((acc, m) => {
        if (m.mappedColumn) {
          acc[m.dbField] = m.mappedColumn;
        }
        return acc;
      }, {} as Record<string, string>);
      
      localStorage.setItem('pts-logs-mapping', JSON.stringify(mappingConfig));
      localStorage.setItem('pts-sync-mode', mode);
      
      // Navigate to sync execution page with mode
      router.push('/pts-sync-simple/execute?mode=' + mode);
    } catch (err) {
      setError('Failed to save mappings');
    } finally {
      setSaving(false);
    }
  };

  if (!hasRawDataMapping || loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2">Loading column headers from PTS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-orange-600" />
            Map Production Logs Columns
          </h1>
          <p className="text-muted-foreground mt-1">
            Step 2: Map Google Sheets columns to OTS database fields for Production Logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-3 py-1">
            Step 2 of 2
          </Badge>
        </div>
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
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">2</div>
          <span className="font-medium">Production Logs Mapping</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">3</div>
          <span className="text-muted-foreground">Sync</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-4 w-4 inline mr-2" />
          {error}
        </div>
      )}

      {/* Important Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">How Production Logs Sync Works</p>
            <ul className="mt-2 text-sm space-y-1 list-disc list-inside">
              <li><strong>Only logs with matching assembly parts</strong> in OTS will be imported</li>
              <li>Project, building, weight, and part name are read from the <strong>existing assembly part</strong>, not from Google Sheets</li>
              <li>Logs without a matching Part# will be shown in a <strong>skipped items list</strong> after sync</li>
              <li>Make sure to sync Assembly Parts first if you haven&apos;t already</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mapping Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Field Mapping - Production Logs (04-Log sheet)
          </CardTitle>
          <CardDescription>
            Map each OTS database field to the corresponding Google Sheets column. Required fields are marked with *.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">OTS Field</TableHead>
                <TableHead className="w-[300px]">Description</TableHead>
                <TableHead className="w-[200px]">Google Sheets Column</TableHead>
                <TableHead>Sample Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map(mapping => {
                const columnInfo = mapping.mappedColumn ? getColumnInfo(mapping.mappedColumn) : null;
                return (
                  <TableRow key={mapping.dbField}>
                    <TableCell className="font-medium">
                      {mapping.label}
                      {mapping.required && <span className="text-red-500 ml-1">*</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {mapping.description}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping.mappedColumn || 'none'}
                        onValueChange={(value) => updateMapping(mapping.dbField, value === 'none' ? null : value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Not Mapped --</SelectItem>
                          {columns.map(col => (
                            <SelectItem key={col.column} value={col.column}>
                              {col.column}: {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm">
                      {columnInfo ? (
                        <Badge variant="secondary" className="font-mono">
                          {columnInfo.sample || '(empty)'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Available Columns Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Columns from Google Sheets</CardTitle>
          <CardDescription>
            These are the column headers found in the 04-Log sheet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {columns.map(col => (
              <Badge key={col.column} variant="outline" className="font-mono">
                {col.column}: {col.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push('/pts-sync-simple/map-raw-data')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Raw Data Mapping
        </Button>
        <Button 
          onClick={saveMappingsAndStartSync} 
          disabled={saving || !validateMappings()}
          className="bg-green-600 hover:bg-green-700"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Save & Start Sync
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
