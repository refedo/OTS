'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Upload,
  X,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface FieldMapping {
  [key: string]: string;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: { key: string; label: string; required?: boolean }[];
  onImport: (data: any[], mapping: FieldMapping) => Promise<{ imported: number; skipped: number; errors: string[] }>;
  sampleData?: string;
}

export function ImportModal({
  isOpen,
  onClose,
  title,
  fields,
  onImport,
  sampleData,
}: ImportModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'results'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [results, setResults] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setParsedData([]);
    setColumns([]);
    setMapping({});
    setResults(null);
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const parseCSV = (text: string): { data: any[]; columns: string[] } => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { data: [], columns: [] };

    // Parse header
    const headers = parseCSVLine(lines[0]);
    
    // Parse data rows
    const data = lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    return { data, columns: headers };
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    try {
      const text = await selectedFile.text();
      const { data, columns: cols } = parseCSV(text);

      if (data.length === 0) {
        setError('No data found in file');
        return;
      }

      setParsedData(data);
      setColumns(cols);

      // Auto-map columns based on similar names
      const autoMapping: FieldMapping = {};
      fields.forEach(field => {
        const matchingColumn = cols.find(col => 
          col.toLowerCase().includes(field.key.toLowerCase()) ||
          field.label.toLowerCase().includes(col.toLowerCase()) ||
          col.toLowerCase().includes(field.label.toLowerCase())
        );
        if (matchingColumn) {
          autoMapping[field.key] = matchingColumn;
        }
      });
      setMapping(autoMapping);

      setStep('mapping');
    } catch (err) {
      setError('Failed to parse file. Please ensure it is a valid CSV file.');
    }
  };

  const handleMappingChange = (fieldKey: string, column: string) => {
    setMapping(prev => ({
      ...prev,
      [fieldKey]: column,
    }));
  };

  const handleImport = async () => {
    // Validate required fields
    const missingRequired = fields
      .filter(f => f.required && !mapping[f.key])
      .map(f => f.label);

    if (missingRequired.length > 0) {
      setError(`Missing required mappings: ${missingRequired.join(', ')}`);
      return;
    }

    setStep('importing');
    setError(null);

    try {
      const result = await onImport(parsedData, mapping);
      setResults(result);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('mapping');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {title}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Step indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className={`flex items-center ${step === 'upload' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                1
              </div>
              <span className="ml-2 text-sm">Upload</span>
            </div>
            <ArrowRight className="w-4 h-4 mx-4 text-gray-300" />
            <div className={`flex items-center ${step === 'mapping' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'mapping' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                2
              </div>
              <span className="ml-2 text-sm">Map Fields</span>
            </div>
            <ArrowRight className="w-4 h-4 mx-4 text-gray-300" />
            <div className={`flex items-center ${step === 'results' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'results' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                3
              </div>
              <span className="ml-2 text-sm">Results</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">
                  Upload a CSV file to import data
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="max-w-xs mx-auto"
                />
              </div>

              {sampleData && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Expected columns:</p>
                  <code className="text-xs bg-gray-100 p-2 rounded block overflow-x-auto">
                    {sampleData}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Mapping Step */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700 mb-4">
                Found {parsedData.length} rows with {columns.length} columns. Map your file columns to the required fields below.
              </div>

              <div className="space-y-3">
                {fields.map(field => (
                  <div key={field.key} className="flex items-center gap-4">
                    <Label className="w-40 text-right">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <select
                      value={mapping[field.key] || ''}
                      onChange={(e) => handleMappingChange(field.key, e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    >
                      <option value="">-- Select column --</option>
                      {columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-2">Preview (first 3 rows)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-50">
                      <tr>
                        {fields.filter(f => mapping[f.key]).map(field => (
                          <th key={field.key} className="px-3 py-2 text-left border-b">
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 3).map((row, i) => (
                        <tr key={i}>
                          {fields.filter(f => mapping[f.key]).map(field => (
                            <td key={field.key} className="px-3 py-2 border-b">
                              {row[mapping[field.key]] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600">Importing data...</p>
            </div>
          )}

          {/* Results Step */}
          {step === 'results' && results && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900">Import Complete</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600">{results.imported}</div>
                  <div className="text-sm text-green-700">Imported</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-yellow-600">{results.skipped}</div>
                  <div className="text-sm text-yellow-700">Skipped</div>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Errors ({results.errors.length})</h4>
                  <div className="max-h-40 overflow-y-auto bg-red-50 p-3 rounded-lg">
                    {results.errors.slice(0, 10).map((err, i) => (
                      <p key={i} className="text-sm text-red-700">{err}</p>
                    ))}
                    {results.errors.length > 10 && (
                      <p className="text-sm text-red-500 mt-2">
                        ... and {results.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          )}
          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={handleImport}>
                Import {parsedData.length} rows
              </Button>
            </>
          )}
          {step === 'results' && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </div>
      </div>
    </div>
  );
}
