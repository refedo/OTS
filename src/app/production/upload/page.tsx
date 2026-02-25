'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react';
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
  { value: 'partMark', label: 'Part Mark *', required: true },
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

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
      console.error('Error fetching projects:', error);
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
      console.error('Error fetching buildings:', error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      if (!validTypes.includes(selectedFile.type)) {
        toast({ title: 'Invalid File', description: 'Please upload an Excel file (.xls or .xlsx)', variant: 'destructive' });
        return;
      }
      setFile(selectedFile);
      setUploadResult(null);
      
      // Parse file to extract columns
      try {
        const parsedData = await parseExcelFile(selectedFile);
        if (parsedData.length > 0) {
          const columns = Object.keys(parsedData[0]);
          setExcelColumns(columns);
          setPreviewData(parsedData.slice(0, 5)); // First 5 rows for preview
          
          // Auto-map columns based on common names
          const autoMapping: Record<string, string> = {};
          columns.forEach(col => {
            const lowerCol = col.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (lowerCol.includes('assembly') && lowerCol.includes('mark')) autoMapping[col] = 'assemblyMark';
            else if (lowerCol.includes('subassembly') || (lowerCol.includes('sub') && lowerCol.includes('assembly'))) autoMapping[col] = 'subAssemblyMark';
            else if (lowerCol.includes('part') && lowerCol.includes('mark')) autoMapping[col] = 'partMark';
            else if (lowerCol === 'quantity' || lowerCol === 'qty') autoMapping[col] = 'quantity';
            else if (lowerCol === 'name' || lowerCol === 'description') autoMapping[col] = 'name';
            else if (lowerCol === 'profile') autoMapping[col] = 'profile';
            else if (lowerCol === 'grade' || lowerCol === 'material') autoMapping[col] = 'grade';
            else if (lowerCol.includes('length')) autoMapping[col] = 'lengthMm';
            else if (lowerCol.includes('area') && lowerCol.includes('unit')) autoMapping[col] = 'netAreaPerUnit';
            else if (lowerCol.includes('area') && lowerCol.includes('total')) autoMapping[col] = 'netAreaTotal';
            else if (lowerCol.includes('single') && lowerCol.includes('weight')) autoMapping[col] = 'singlePartWeight';
            else if (lowerCol.includes('weight') && lowerCol.includes('total')) autoMapping[col] = 'netWeightTotal';
          });
          setColumnMapping(autoMapping);
        }
      } catch (error) {
        console.error('Error parsing file:', error);
      }
    }
  };

  const parseExcelFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          
          // Dynamically import xlsx library
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            raw: false,
            defval: null 
          });
          
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const proceedToMapping = () => {
    if (!file || !selectedProject) {
      toast({ title: 'Missing Selection', description: 'Please select a project and file', variant: 'destructive' });
      return;
    }
    setStep('mapping');
  };

  const handleUpload = async () => {
    if (!file || !selectedProject) {
      toast({ title: 'Missing Selection', description: 'Please select a project and file', variant: 'destructive' });
      return;
    }

    // Validate required mappings
    const requiredFields = ['assemblyMark', 'partMark', 'quantity', 'name'];
    const mappedFields = Object.values(columnMapping);
    const missingFields = requiredFields.filter(field => !mappedFields.includes(field));
    
    if (missingFields.length > 0) {
      toast({ title: 'Missing Fields', description: `Please map the following required fields: ${missingFields.join(', ')}`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    setUploadResult(null);

    try {
      // Parse Excel file
      const parsedData = await parseExcelFile(file);

      // Map columns according to user selection
      const dataToUpload = parsedData.map((row) => {
        const mappedRow: any = {
          projectId: selectedProject,
          buildingId: selectedBuilding || null,
        };
        
        Object.entries(columnMapping).forEach(([excelCol, dbField]) => {
          if (dbField && row[excelCol] !== undefined && row[excelCol] !== null && row[excelCol] !== '') {
            let value = row[excelCol];
            
            // Convert numeric fields from string to number
            const numericFields = [
              'quantity',
              'lengthMm',
              'netAreaPerUnit',
              'netAreaTotal',
              'singlePartWeight',
              'netWeightTotal',
            ];
            
            if (numericFields.includes(dbField)) {
              // Remove any commas and convert to number
              value = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : Number(value);
              if (isNaN(value)) {
                value = null;
              }
            }
            
            mappedRow[dbField] = value;
          }
        });
        
        return mappedRow;
      });

      // Upload to API
      const response = await fetch('/api/production/assembly-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToUpload),
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResult(result);
        toast({ title: 'Upload Complete', description: `${result.success} parts uploaded successfully` });
        
        if (result.failed === 0) {
          setTimeout(() => {
            router.push('/production/assembly-parts');
          }, 2000);
        }
      } else {
        const error = await response.json();
        toast({ title: 'Upload Failed', description: error.error || 'Upload failed', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({ title: 'Error', description: 'An error occurred during upload', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // In production, generate and download an Excel template
    toast({ title: 'Coming Soon', description: 'Template download feature will be available soon' });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-6 lg:p-8 max-w-4xl max-lg:pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Upload Assembly Parts</h1>
          <p className="text-muted-foreground mt-1">
            Import assembly parts from Excel file
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
                2. Required columns: Assembly Mark, Part Mark, Quantity, Name
              </p>
              <p className="text-sm text-muted-foreground">
                3. Optional columns: Sub-Assembly Mark, Profile, Grade, Length, Weight, Area
              </p>
              <p className="text-sm text-muted-foreground">
                4. Select project and building, then upload your completed file
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
              <CardTitle>Upload Excel File</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload Excel file (.xls or .xlsx)
                  </p>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                      <Upload className="mr-2 h-4 w-4" />
                      Choose File
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".xls,.xlsx"
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
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFile(null)}
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

                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="font-medium mb-2">Errors:</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {uploadResult.errors.map((error: any, idx: number) => (
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
                <CardTitle>Map Excel Columns to Database Fields</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Map your Excel columns to the corresponding database fields. Required fields are marked with *.
                </p>

                <div className="space-y-3">
                  {excelColumns.map((excelCol) => (
                    <div key={excelCol} className="grid grid-cols-3 gap-4 items-center border-b pb-3">
                      <div>
                        <p className="font-medium text-sm">{excelCol}</p>
                        <p className="text-xs text-muted-foreground">
                          Sample: {previewData[0]?.[excelCol] || 'N/A'}
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
                      .filter(([_, dbField]) => dbField)
                      .map(([excelCol, dbField]) => (
                        <div key={excelCol} className="flex justify-between">
                          <span className="font-medium">{dbField}:</span>
                          <span>{previewData[0]?.[excelCol]}</span>
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
