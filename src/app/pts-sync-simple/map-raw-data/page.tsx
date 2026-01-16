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
  FileSpreadsheet,
  Database,
  Check,
  AlertCircle,
  Save
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

const DB_FIELDS: FieldMapping[] = [
  { dbField: 'projectNumber', label: 'Project Number', required: true, description: 'Project identifier (e.g., "254")', mappedColumn: null },
  { dbField: 'partDesignation', label: 'Part Designation', required: true, description: 'Unique part identifier (e.g., "254-Z8T-CO2")', mappedColumn: null },
  { dbField: 'buildingDesignation', label: 'Building Designation', required: true, description: 'Building code (e.g., "Z8T")', mappedColumn: null },
  { dbField: 'buildingName', label: 'Building Name', required: false, description: 'Building name (e.g., "Zone 8 Toilet")', mappedColumn: null },
  { dbField: 'assemblyMark', label: 'Assembly Mark', required: false, description: 'Assembly mark (e.g., "CO2")', mappedColumn: null },
  { dbField: 'subAssemblyMark', label: 'Sub-Assembly Mark', required: false, description: 'Sub-assembly mark', mappedColumn: null },
  { dbField: 'partMark', label: 'Part Mark', required: false, description: 'Part mark', mappedColumn: null },
  { dbField: 'quantity', label: 'Quantity', required: false, description: 'Number of pieces', mappedColumn: null },
  { dbField: 'name', label: 'Name', required: false, description: 'Part name (e.g., "BEAM")', mappedColumn: null },
  { dbField: 'profile', label: 'Profile', required: false, description: 'Profile type (e.g., "UC203*203*46")', mappedColumn: null },
  { dbField: 'grade', label: 'Grade', required: false, description: 'Material grade', mappedColumn: null },
  { dbField: 'lengthMm', label: 'Length (mm)', required: false, description: 'Length in millimeters', mappedColumn: null },
  { dbField: 'netAreaPerUnit', label: 'Net Area Per Unit (m²)', required: false, description: 'Surface area per piece', mappedColumn: null },
  { dbField: 'netAreaTotal', label: 'Net Area Total (m²)', required: false, description: 'Total surface area', mappedColumn: null },
  { dbField: 'singlePartWeight', label: 'Single Part Weight (kg)', required: false, description: 'Weight per piece', mappedColumn: null },
  { dbField: 'netWeightTotal', label: 'Net Weight Total (kg)', required: false, description: 'Total weight', mappedColumn: null },
];

const DEFAULT_MAPPINGS: Record<string, string> = {
  projectNumber: 'B',
  partDesignation: 'C',
  buildingDesignation: 'R',
  buildingName: 'T',
  assemblyMark: 'E',
  subAssemblyMark: 'F',
  partMark: 'G',
  quantity: 'H',
  name: 'I',
  profile: 'J',
  grade: 'K',
  lengthMm: 'L',
  netAreaPerUnit: 'M',
  netAreaTotal: 'N',
  singlePartWeight: 'O',
  netWeightTotal: 'P',
};

export default function MapRawDataPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'full'; // 'parts', 'logs', or 'full'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnHeader[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>(DB_FIELDS);

  useEffect(() => {
    fetchColumns();
  }, []);

  const fetchColumns = async () => {
    try {
      const res = await fetch('/api/pts-sync/columns');
      if (!res.ok) throw new Error('Failed to fetch columns');
      const data = await res.json();
      setColumns(data.rawData.headers);
      
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

  const saveMappingsAndContinue = async () => {
    if (!validateMappings()) {
      setError('Please map all required fields');
      return;
    }

    setSaving(true);
    try {
      // Save mappings to localStorage for now (could be saved to DB later)
      const mappingConfig = mappings.reduce((acc, m) => {
        if (m.mappedColumn) {
          acc[m.dbField] = m.mappedColumn;
        }
        return acc;
      }, {} as Record<string, string>);
      
      localStorage.setItem('pts-raw-data-mapping', JSON.stringify(mappingConfig));
      localStorage.setItem('pts-sync-mode', mode);
      
      // Navigate based on mode
      if (mode === 'parts') {
        // Parts only - go directly to execute
        router.push('/pts-sync-simple/execute?mode=parts');
      } else {
        // Full sync - continue to logs mapping
        router.push('/pts-sync-simple/map-logs?mode=' + mode);
      }
    } catch (err) {
      setError('Failed to save mappings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
            Map Raw Data Columns
          </h1>
          <p className="text-muted-foreground mt-1">
            Step 1: Map Google Sheets columns to OTS database fields for Assembly Parts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-3 py-1">
            Step 1 of 2
          </Badge>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">1</div>
          <span className="font-medium">Raw Data Mapping</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">2</div>
          <span className="text-muted-foreground">Production Logs Mapping</span>
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

      {/* Mapping Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Field Mapping - Raw Data (02-Raw Data sheet)
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
            These are the column headers found in the 02-Raw Data sheet
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
        <Button variant="outline" onClick={() => router.push('/pts-sync-simple')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to PTS Sync
        </Button>
        <Button 
          onClick={saveMappingsAndContinue} 
          disabled={saving || !validateMappings()}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Save & Continue to Logs Mapping
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
