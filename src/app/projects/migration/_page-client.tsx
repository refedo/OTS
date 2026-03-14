'use client';

/**
 * Project Migration & Excel Upload Page
 * Allows Admin and PMO users to import/export projects
 */

import { useState } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, FileDown, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FieldMapper } from '@/components/project-migration/field-mapper';

interface ValidationError {
  row: number;
  field?: string;
  message: string;
  severity: 'critical' | 'warning';
}

interface ImportResult {
  success: boolean;
  message?: string;
  projectsCreated?: number;
  projectsUpdated?: number;
  buildingsCreated?: number;
  buildingsUpdated?: number;
  errors?: ValidationError[];
  warnings?: ValidationError[];
  error?: string;
  rateLimitRemaining?: number;
}

export default function ProjectMigrationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showFieldMapper, setShowFieldMapper] = useState(false);
  const [currentMappingSheet, setCurrentMappingSheet] = useState<'projects' | 'buildings'>('projects');
  const [excelColumns, setExcelColumns] = useState<{ projects: string[]; buildings: string[] } | null>(null);
  const [fieldMappings, setFieldMappings] = useState<{ projects?: Record<string, string>; buildings?: Record<string, string> }>({});
  const { toast } = useToast();

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || droppedFile.name.endsWith('.xlsx'))) {
      setFile(droppedFile);
      setImportResult(null);
    } else {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an Excel file (.xlsx)',
        variant: 'destructive',
      });
    }
  };

  // Extract columns for field mapping
  const handleExtractColumns = async () => {
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/projects/extract-columns', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      console.log('Extract columns result:', result);

      if (result.success) {
        console.log('Setting excel columns:', result.columns);
        setExcelColumns(result.columns);
        setCurrentMappingSheet('projects'); // Start with projects sheet
        setFieldMappings({}); // Reset mappings
        setShowFieldMapper(true);
      } else {
        toast({
          title: 'Failed to extract columns',
          description: result.message || 'Could not read Excel file',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle field mapping completion
  const handleMappingComplete = (mappings: Record<string, string>) => {
    const updatedMappings = {
      ...fieldMappings,
      [currentMappingSheet]: mappings,
    };
    setFieldMappings(updatedMappings);
    
    // Move to buildings sheet if we just finished projects AND buildings sheet exists
    if (currentMappingSheet === 'projects') {
      // Check if buildings sheet has columns (i.e., sheet exists)
      if (excelColumns?.buildings && excelColumns.buildings.length > 0) {
        setCurrentMappingSheet('buildings');
        // Keep mapper open for buildings
      } else {
        // No buildings sheet, proceed directly to import
        setShowFieldMapper(false);
        handleImportWithMappings(updatedMappings);
      }
    } else {
      // Both sheets mapped, proceed to import
      setShowFieldMapper(false);
      handleImportWithMappings(updatedMappings);
    }
  };

  // Handle file upload and import with field mappings
  const handleImportWithMappings = async (mappingsToUse?: typeof fieldMappings) => {
    if (!file) return;

    setUploading(true);
    setValidating(true);
    setImportResult(null);
    setShowFieldMapper(false);

    // Use provided mappings or fall back to state
    const mappings = mappingsToUse || fieldMappings;

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add field mappings if they exist
      if (mappings.projects) {
        formData.append('projectMappings', JSON.stringify(mappings.projects));
      }
      if (mappings.buildings) {
        formData.append('buildingMappings', JSON.stringify(mappings.buildings));
      }

      const response = await fetch('/api/projects/import', {
        method: 'POST',
        body: formData,
      });

      const result: ImportResult = await response.json();

      setImportResult(result);

      if (result.success) {
        toast({
          title: 'Import Successful',
          description: result.message || 'Projects imported successfully',
        });
        // Reset state
        setFile(null);
        setFieldMappings({});
      } else {
        toast({
          title: 'Import Failed',
          description: result.error || 'Failed to import projects',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setValidating(false);
    }
  };

  // Handle direct import (without field mapping)
  const handleDirectImport = async () => {
    if (!file) return;

    setUploading(true);
    setValidating(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/projects/import', {
        method: 'POST',
        body: formData,
      });

      const result: ImportResult = await response.json();

      setImportResult(result);

      if (result.success) {
        toast({
          title: 'Import Successful',
          description: result.message || 'Projects imported successfully',
        });
        setFile(null);
      } else {
        toast({
          title: 'Import Failed',
          description: result.error || 'Failed to import projects',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setValidating(false);
    }
  };

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/projects/template');
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'OTS_Project_Import_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Template Downloaded',
        description: 'Excel template downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download template',
        variant: 'destructive',
      });
    }
  };

  // Export all projects
  const handleExportAll = async () => {
    try {
      const response = await fetch('/api/projects/export');
      
      if (!response.ok) {
        throw new Error('Failed to export projects');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `OTS_Projects_Export_${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Export Successful',
        description: 'All projects exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export projects',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Project Migration & Excel Upload</h1>
        <p className="text-muted-foreground">
          Import projects from Excel or export existing projects to Excel format
        </p>
      </div>

      {/* Field Mapper Modal */}
      {showFieldMapper && excelColumns && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <FieldMapper
                excelColumns={currentMappingSheet === 'projects' ? excelColumns.projects : excelColumns.buildings}
                sheetType={currentMappingSheet}
                onMappingComplete={handleMappingComplete}
                onCancel={() => {
                  setShowFieldMapper(false);
                  setExcelColumns(null);
                  setCurrentMappingSheet('projects');
                  setFieldMappings({});
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Section */}
        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Projects
            </h2>

            {/* Download Template Button */}
            <button
              onClick={handleDownloadTemplate}
              className="w-full mb-4 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
            >
              <FileDown className="h-4 w-4" />
              Download Empty Template
            </button>

            {/* Dropzone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your Excel file here, or
              </p>
              <label className="inline-block">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 cursor-pointer inline-block">
                  Browse Files
                </span>
              </label>
              {file && (
                <p className="mt-4 text-sm font-medium">
                  Selected: {file.name}
                </p>
              )}
            </div>

            {/* Import Buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleExtractColumns}
                disabled={!file || uploading}
                className="flex-1 px-4 py-3 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Map Fields
              </button>
              <button
                onClick={handleDirectImport}
                disabled={!file || uploading}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                    {validating ? 'Validating...' : 'Importing...'}
                  </span>
                ) : (
                  'Direct Import'
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Use "Map Fields" if your columns don't match the template exactly
            </p>
          </div>

          {/* Import Results */}
          {importResult && (
            <div className={`border rounded-lg p-6 ${importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-3">
                {importResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">
                    {importResult.success ? 'Import Successful' : 'Import Failed'}
                  </h3>
                  {importResult.message && (
                    <p className="text-sm mb-3">{importResult.message}</p>
                  )}

                  {importResult.success && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Projects Created: <strong>{importResult.projectsCreated}</strong></div>
                      <div>Projects Updated: <strong>{importResult.projectsUpdated}</strong></div>
                      <div>Buildings Created: <strong>{importResult.buildingsCreated}</strong></div>
                      <div>Buildings Updated: <strong>{importResult.buildingsUpdated}</strong></div>
                    </div>
                  )}

                  {/* Errors */}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {importResult.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                            Row {error.row}{error.field && ` (${error.field})`}: {error.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {importResult.warnings && importResult.warnings.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-yellow-800 mb-2">Warnings:</h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {importResult.warnings.map((warning, index) => (
                          <div key={index} className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
                            Row {warning.row}{warning.field && ` (${warning.field})`}: {warning.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export Section */}
        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Projects
            </h2>

            <p className="text-sm text-muted-foreground mb-6">
              Download all existing projects and buildings as an Excel file. This file can be modified and re-imported.
            </p>

            <button
              onClick={handleExportAll}
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download All Projects (Excel)
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-3">Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Download the empty template or export existing projects</li>
              <li>Fill in the Projects and Buildings sheets with your data</li>
              <li>Ensure all required fields are filled (marked in red if missing)</li>
              <li>Upload the completed Excel file using the dropzone above</li>
              <li>Review validation results and fix any errors</li>
              <li>Confirm import to add projects to the system</li>
            </ol>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold mb-3 text-yellow-900">Important Notes</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-yellow-800">
              <li>Upload limit: 10 files per hour</li>
              <li>Maximum file size: 10MB</li>
              <li>Only .xlsx format is supported</li>
              <li>Duplicate project codes will update existing projects</li>
              <li>Buildings must reference existing project codes</li>
              <li>Invalid data will be rejected with detailed error messages</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
