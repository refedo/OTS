'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, AlertTriangle, Download, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Project = {
  id: string;
  name: string;
  projectNumber: string;
};

type Building = {
  id: string;
  name: string;
  designation: string;
};

const DB_FIELDS = [
  { value: '', label: '-- Do Not Import --' },
  { value: 'assemblyMark', label: 'Assembly Mark *', required: true },
  { value: 'subAssemblyMark', label: 'Sub-Assembly Mark' },
  { value: 'partMark', label: 'Part Mark' },
  { value: 'quantity', label: 'Quantity *', required: true },
  { value: 'name', label: 'Name *', required: true },
  { value: 'profile', label: 'Profile' },
  { value: 'grade', label: 'Grade' },
  { value: 'lengthMm', label: 'Length (mm)' },
  { value: 'netAreaPerUnit', label: 'Net Area Per Unit (m²)' },
  { value: 'netAreaTotal', label: 'Net Area Total (m²)' },
  { value: 'singlePartWeight', label: 'Single Part Weight (kg)' },
  { value: 'netWeightTotal', label: 'Net Weight Total (kg)' },
];

export default function UploadPartsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    failed: number;
    hasDuplicates?: boolean;
    results: { id: string; projectId: string }[];
    errors: { item: unknown; error: unknown }[];
  } | null>(null);
  const [uploadedPartIds, setUploadedPartIds] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [headerRow, setHeaderRow] = useState(1);
  const [dbConflicts, setDbConflicts] = useState<string[]>([]);
  const [pendingUploadData, setPendingUploadData] = useState<Record<string, unknown>[] | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchBuildings(selectedProject);
    } else {
      setBuildings([]);
      setSelectedBuilding('');
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      // network error — toast shown elsewhere
    }
  };

  const fetchBuildings = async (projectId: string) => {
    try {
      const response = await fetch(`/api/buildings?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setBuildings(data);
      }
    } catch (error) {
      // network error — toast shown elsewhere
    }
  };

  const isCsvFile = (f: File) => f.name.toLowerCase().endsWith('.csv');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain', // some browsers report CSV as text/plain
      'application/csv',
    ];
    const isValidType = validTypes.includes(selectedFile.type) || isCsvFile(selectedFile);
    if (!isValidType) {
      toast({ title: 'Invalid File', description: 'Please upload an Excel (.xls, .xlsx) or CSV (.csv) file', variant: 'destructive' });
      return;
    }

    setFile(selectedFile);
    setUploadResult(null);
    setUploadedPartIds([]);

    try {
      const parsedData = await parseFile(selectedFile, headerRow - 1);
      if (parsedData.length > 0) {
        const columns = Object.keys(parsedData[0]);
        setExcelColumns(columns);
        setPreviewData(parsedData.slice(0, 5));
        setColumnMapping(autoMap(columns));
      }
    } catch (error) {
      toast({ title: 'Parse Error', description: 'Could not read the file. Please check the format.', variant: 'destructive' });
    }
  };

  const handleHeaderRowChange = async (value: number) => {
    setHeaderRow(value);
    if (!file) return;
    try {
      const parsedData = await parseFile(file, value - 1);
      if (parsedData.length > 0) {
        const columns = Object.keys(parsedData[0]);
        setExcelColumns(columns);
        setPreviewData(parsedData.slice(0, 5));
        setColumnMapping(autoMap(columns));
      }
    } catch {
      // ignore re-parse errors silently
    }
  };

  const autoMap = (columns: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};
    columns.forEach(col => {
      const lc = col.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lc.includes('assembly') && lc.includes('mark') && !lc.includes('sub')) mapping[col] = 'assemblyMark';
      else if (lc.includes('subassembly') || (lc.includes('sub') && lc.includes('assembly'))) mapping[col] = 'subAssemblyMark';
      else if (lc.includes('part') && lc.includes('mark')) mapping[col] = 'partMark';
      else if (lc === 'quantity' || lc === 'qty' || lc === 'no') mapping[col] = 'quantity';
      else if (lc === 'name' || lc === 'description') mapping[col] = 'name';
      else if (lc === 'profile') mapping[col] = 'profile';
      else if (lc === 'grade' || lc === 'material') mapping[col] = 'grade';
      else if (lc.includes('length')) mapping[col] = 'lengthMm';
      else if (lc.includes('area') && (lc.includes('unit') || lc.includes('forone'))) mapping[col] = 'netAreaPerUnit';
      else if (lc.includes('area') && (lc.includes('total') || lc.includes('forall'))) mapping[col] = 'netAreaTotal';
      else if (lc.includes('weight') && (lc.includes('single') || lc.includes('forone'))) mapping[col] = 'singlePartWeight';
      else if (lc.includes('weight') && (lc.includes('total') || lc.includes('forall'))) mapping[col] = 'netWeightTotal';
    });
    return mapping;
  };

  const parseFile = async (f: File, headerRowIndex: number): Promise<Record<string, unknown>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const csv = isCsvFile(f);

      reader.onload = async (e) => {
        try {
          const XLSX = await import('xlsx');
          let workbook;

          if (csv) {
            workbook = XLSX.read(e.target?.result as string, { type: 'string' });
          } else {
            workbook = XLSX.read(e.target?.result as ArrayBuffer, { type: 'array' });
          }

          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: null });

          if (rawRows.length <= headerRowIndex) {
            resolve([]);
            return;
          }

          const headers = (rawRows[headerRowIndex] as unknown[]).map(h =>
            h !== null && h !== undefined ? String(h).trim() : ''
          );
          const dataRows = rawRows.slice(headerRowIndex + 1);

          const result = dataRows
            .filter(row => (row as unknown[]).some(cell => cell !== null && cell !== ''))
            .map(row => {
              const obj: Record<string, unknown> = {};
              headers.forEach((h, i) => {
                if (h) obj[h] = (row as unknown[])[i] ?? null;
              });
              return obj;
            });

          resolve(result);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = reject;
      if (csv) {
        reader.readAsText(f);
      } else {
        reader.readAsArrayBuffer(f);
      }
    });
  };

  const proceedToMapping = () => {
    if (!file || !selectedProject) {
      toast({ title: 'Missing Selection', description: 'Please select a project and file', variant: 'destructive' });
      return;
    }
    setStep('mapping');
  };

  const buildUploadData = async (): Promise<Record<string, unknown>[]> => {
    const parsedData = await parseFile(file!, headerRow - 1);
    const numericFields = ['quantity', 'lengthMm', 'netAreaPerUnit', 'netAreaTotal', 'singlePartWeight', 'netWeightTotal'];

    return parsedData.map((row) => {
      const mappedRow: Record<string, unknown> = {
        projectId: selectedProject,
        buildingId: selectedBuilding || null,
      };
      Object.entries(columnMapping).forEach(([excelCol, dbField]) => {
        if (dbField && row[excelCol] !== undefined && row[excelCol] !== null && row[excelCol] !== '') {
          let value: unknown = row[excelCol];
          if (numericFields.includes(dbField)) {
            const num = typeof value === 'string'
              ? parseFloat((value as string).replace(/,/g, ''))
              : Number(value);
            value = isNaN(num) ? null : num;
          }
          mappedRow[dbField] = value;
        }
      });
      return mappedRow;
    });
  };

  const executeUpload = async (dataToUpload: Record<string, unknown>[]) => {
    setLoading(true);
    setDbConflicts([]);
    setPendingUploadData(null);
    try {
      const response = await fetch('/api/production/assembly-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToUpload),
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResult(result);
        const ids = result.results.map((p: { id: string }) => p.id);
        setUploadedPartIds(ids);
        toast({ title: 'Upload Complete', description: `${result.success} parts uploaded successfully` });
      } else {
        const errorBody = await response.json().catch(() => ({}));
        const description = response.status === 403
          ? 'You do not have permission to upload parts. Contact your administrator.'
          : (errorBody as { error?: string }).error || `Upload failed (${response.status})`;
        toast({ title: 'Upload Failed', description, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'An error occurred during upload', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedProject) {
      toast({ title: 'Missing Selection', description: 'Please select a project and file', variant: 'destructive' });
      return;
    }

    const requiredFields = ['assemblyMark', 'quantity', 'name'];
    const mappedFields = Object.values(columnMapping);
    const missingFields = requiredFields.filter(field => !mappedFields.includes(field));

    if (missingFields.length > 0) {
      toast({ title: 'Missing Fields', description: `Please map the following required fields: ${missingFields.join(', ')}`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    setUploadResult(null);
    setUploadedPartIds([]);
    setDbConflicts([]);
    setPendingUploadData(null);

    try {
      const dataToUpload = await buildUploadData();

      // Check for existing parts in the DB before uploading
      const uniqueMarks = [...new Set(
        dataToUpload.map(r => r.assemblyMark as string).filter(Boolean)
      )];

      const params = new URLSearchParams({ projectId: selectedProject, limit: '9999' });
      if (selectedBuilding) params.set('buildingId', selectedBuilding);
      const existingRes = await fetch(`/api/production/assembly-parts?${params}`);

      if (existingRes.ok) {
        const existingData = await existingRes.json();
        const existingMarks = new Set<string>(
          (existingData.data as { assemblyMark: string }[]).map(p => p.assemblyMark)
        );
        const conflicts = uniqueMarks.filter(m => existingMarks.has(m));

        if (conflicts.length > 0) {
          setDbConflicts(conflicts);
          setPendingUploadData(dataToUpload);
          setLoading(false);
          return;
        }
      }

      await executeUpload(dataToUpload);
    } catch {
      toast({ title: 'Error', description: 'An error occurred during upload', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    if (uploadedPartIds.length === 0) return;

    setRollbackLoading(true);
    try {
      const response = await fetch('/api/production/assembly-parts/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partIds: uploadedPartIds,
          projectId: selectedProject || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({ title: 'Rollback Complete', description: `${result.rolledBack} parts have been removed. They can be restored from Governance if needed.` });
        setUploadedPartIds([]);
        setUploadResult(null);
        setStep('upload');
        setFile(null);
      } else {
        const errorBody = await response.json().catch(() => ({}));
        const description = response.status === 403
          ? 'You do not have permission to delete parts.'
          : (errorBody as { error?: string }).error || 'Rollback failed';
        toast({ title: 'Rollback Failed', description, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'An error occurred during rollback', variant: 'destructive' });
    } finally {
      setRollbackLoading(false);
    }
  };

  const downloadTemplate = () => {
    toast({ title: 'Coming Soon', description: 'Template download feature will be available soon' });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-6 lg:p-8 max-w-4xl max-lg:pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Upload Assembly Parts</h1>
          <p className="text-muted-foreground mt-1">
            Import assembly parts from Excel or CSV file
          </p>
        </div>

        <div className="space-y-6">
          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                1. Download the Excel template and fill in your assembly parts data
              </p>
              <p className="text-sm text-muted-foreground">
                2. Required columns: Assembly Mark, Quantity, Name
              </p>
              <p className="text-sm text-muted-foreground">
                3. Optional columns: Part Mark, Sub-Assembly Mark, Profile, Grade, Length, Weight, Area
              </p>
              <p className="text-sm text-muted-foreground">
                4. Supported formats: Excel (.xls, .xlsx) and CSV (.csv)
              </p>
              <p className="text-sm text-muted-foreground">
                5. Select project and building, then upload your completed file
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="mt-4">
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </CardContent>
          </Card>

          {/* Project and Building Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Project & Building</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project *</Label>
                <select
                  id="project"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  disabled={loading}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">Select Project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectNumber} - {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="building">Building (Optional)</Label>
                <select
                  id="building"
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  disabled={loading || !selectedProject}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">Select Building (Optional)</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.designation} - {building.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Header row selector */}
                <div className="flex items-center gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="header-row">Header Row</Label>
                    <p className="text-xs text-muted-foreground">Row number that contains column names</p>
                  </div>
                  <Input
                    id="header-row"
                    type="number"
                    min={1}
                    max={20}
                    value={headerRow}
                    onChange={(e) => handleHeaderRowChange(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={loading}
                    className="w-24"
                  />
                </div>

                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload Excel (.xls, .xlsx) or CSV (.csv) file
                  </p>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                      <Upload className="mr-2 h-4 w-4" />
                      Choose File
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".xls,.xlsx,.csv"
                      onChange={handleFileChange}
                      disabled={loading}
                      className="hidden"
                    />
                  </label>
                </div>

                {file && (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(2)} KB &mdash; Header on row {headerRow}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFile(null);
                          setExcelColumns([]);
                          setPreviewData([]);
                          setColumnMapping({});
                        }}
                        disabled={loading}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* DB Conflict Warning */}
          {dbConflicts.length > 0 && pendingUploadData && (
            <Card className="border-orange-400 dark:border-orange-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <AlertTriangle className="h-5 w-5" />
                  Existing Parts Detected
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  The following assembly marks from this file already exist in the database for the selected project. Uploading will create duplicate entries.
                </p>
                <div className="rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-3 max-h-40 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {dbConflicts.map(mark => (
                      <span key={mark} className="inline-block rounded bg-orange-200 dark:bg-orange-800 px-2 py-0.5 text-xs font-mono font-medium text-orange-900 dark:text-orange-100">
                        {mark}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setDbConflicts([]); setPendingUploadData(null); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => executeUpload(pendingUploadData)}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Upload Anyway
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-semibold">
                        {uploadResult.success} parts uploaded successfully
                      </p>
                      {uploadResult.failed > 0 && (
                        <p className="text-sm text-destructive">
                          {uploadResult.failed} parts failed to upload
                        </p>
                      )}
                    </div>
                  </div>

                  {uploadResult.hasDuplicates && (
                    <div className="flex items-start gap-3 rounded-lg border border-yellow-400 bg-yellow-50 p-4 dark:border-yellow-600 dark:bg-yellow-950/30">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                      <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-300">Duplicate part numbers detected</p>
                        <p className="mt-0.5 text-sm text-yellow-700 dark:text-yellow-400">
                          This file contained duplicate assembly part numbers. Their quantities have been summed and uploaded as a single entry per part number.
                        </p>
                      </div>
                    </div>
                  )}

                  {uploadedPartIds.length > 0 && (
                    <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
                      <p className="text-sm font-medium">Changed your mind?</p>
                      <p className="text-xs text-muted-foreground">
                        Rolling back will soft-delete all {uploadedPartIds.length} uploaded parts.
                        They can be restored later from the Governance page.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRollback}
                        disabled={rollbackLoading}
                        className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        {rollbackLoading
                          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          : <RotateCcw className="mr-2 h-4 w-4" />
                        }
                        Rollback Upload
                      </Button>
                    </div>
                  )}

                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="font-medium mb-2">Errors:</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {uploadResult.errors.map((error, idx) => (
                          <div key={idx} className="text-sm text-destructive">
                            <AlertCircle className="inline h-4 w-4 mr-2" />
                            {JSON.stringify(error.error)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Column Mapping Step */}
          {step === 'mapping' && excelColumns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Map Columns to Database Fields</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Map your file columns to the corresponding database fields. Required fields are marked with *.
                </p>

                <div className="space-y-3">
                  {excelColumns.map((excelCol) => (
                    <div key={excelCol} className="grid grid-cols-3 gap-4 items-center border-b pb-3">
                      <div>
                        <p className="font-medium text-sm">{excelCol}</p>
                        <p className="text-xs text-muted-foreground">
                          Sample: {String(previewData[0]?.[excelCol] ?? 'N/A')}
                        </p>
                      </div>
                      <div className="text-center text-muted-foreground">→</div>
                      <div>
                        <select
                          value={columnMapping[excelCol] || ''}
                          onChange={(e) =>
                            setColumnMapping({ ...columnMapping, [excelCol]: e.target.value })
                          }
                          className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                        >
                          {DB_FIELDS.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preview Mapped Data */}
                <div className="mt-6">
                  <p className="font-medium mb-2">Preview (First Row)</p>
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm max-h-60 overflow-y-auto">
                    {Object.entries(columnMapping)
                      .filter(([, dbField]) => dbField)
                      .map(([excelCol, dbField]) => (
                        <div key={excelCol} className="flex justify-between">
                          <span className="font-medium">{dbField}:</span>
                          <span>{String(previewData[0]?.[excelCol] ?? '')}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => {
                if (step === 'mapping') {
                  setStep('upload');
                } else {
                  router.back();
                }
              }}
              disabled={loading}
            >
              {step === 'mapping' ? 'Back' : 'Cancel'}
            </Button>
            {step === 'upload' ? (
              <Button
                onClick={proceedToMapping}
                disabled={loading || !file || !selectedProject}
              >
                Next: Map Columns
              </Button>
            ) : (
              <Button
                onClick={handleUpload}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Upload className="mr-2 h-4 w-4" />
                Upload Parts
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
