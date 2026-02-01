'use client';

/**
 * Field Mapper Component
 * Allows users to map Excel columns to OTS fields
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, RefreshCw } from 'lucide-react';

interface FieldMapping {
  excelColumn: string;
  otsField: string;
}

interface FieldMapperProps {
  excelColumns: string[];
  sheetType: 'projects' | 'buildings';
  onMappingComplete: (mappings: Record<string, string>) => void;
  onCancel: () => void;
}

// OTS Field definitions with descriptions
const OTS_FIELDS = {
  projects: [
    { value: 'project_code', label: 'Project Number / Project # (Required)', required: true },
    { value: 'project_name', label: 'Project Name (Required)', required: true },
    { value: 'estimation_number', label: 'Estimation #' },
    { value: 'client_name', label: 'Client Name' },
    { value: 'project_manager', label: 'Project Manager' },
    { value: 'sales_engineer', label: 'Sales Engineer' },
    { value: 'contract_date', label: 'Contract Date' },
    { value: 'down_payment_date', label: 'Down Payment Date' },
    { value: 'planned_start_date', label: 'Planned Start Date' },
    { value: 'planned_end_date', label: 'Planned End Date' },
    { value: 'status', label: 'Status' },
    { value: 'contract_value', label: 'Contract Value' },
    { value: 'tonnage', label: 'Tonnage' },
    { value: 'down_payment_percentage', label: 'Down Payment %' },
    { value: 'down_payment_milestone', label: 'Down Payment Milestone' },
    { value: 'payment_2_percentage', label: 'Payment 2 %' },
    { value: 'payment_2_milestone', label: 'Payment 2 Milestone' },
    { value: 'payment_3_percentage', label: 'Payment 3 %' },
    { value: 'payment_3_milestone', label: 'Payment 3 Milestone' },
    { value: 'payment_4_percentage', label: 'Payment 4 %' },
    { value: 'payment_4_milestone', label: 'Payment 4 Milestone' },
    { value: 'payment_5_percentage', label: 'Payment 5 %' },
    { value: 'payment_5_milestone', label: 'Payment 5 Milestone' },
    { value: 'payment_6_percentage', label: 'Payment 6 %' },
    { value: 'payment_6_milestone', label: 'Payment 6 Milestone' },
    { value: 'ho_retention', label: 'H.O Retention' },
    { value: 'incoterm', label: 'Incoterm' },
    { value: 'scope_of_work', label: 'Scope of Work' },
    { value: 'structure_type', label: 'Structure Type' },
    { value: 'project_nature', label: 'Project Nature' },
    { value: 'no_of_structures', label: 'No. of Structures' },
    { value: 'erection_subcontractor', label: 'Erection Subcontractor' },
    { value: 'cranes_included', label: 'Cranes Included?' },
    { value: 'surveyor_our_scope', label: 'Surveyor Our Scope' },
    { value: 'galvanized', label: 'Galvanized' },
    { value: 'galvanization_microns', label: 'Galvanization Microns' },
    { value: 'area', label: 'Area' },
    { value: 'm2_per_ton', label: 'm2/Ton' },
    { value: 'paint_coat_1', label: 'Paint Coat 1' },
    { value: 'coat_1_microns', label: 'Coat 1 - Microns' },
    { value: 'paint_coat_2', label: 'Paint Coat 2' },
    { value: 'coat_2_microns', label: 'Coat 2 - Microns' },
    { value: 'paint_coat_3', label: 'Paint Coat 3' },
    { value: 'coat_3_microns', label: 'Coat 3 - Microns' },
    { value: 'paint_coat_4', label: 'Paint Coat 4' },
    { value: 'coat_4_microns', label: 'Coat 4 - Microns' },
    { value: 'location', label: 'Location' },
    { value: 'remarks', label: 'Remarks' },
    { value: '_skip', label: '(Skip this column)' },
  ],
  buildings: [
    { value: 'project_code', label: 'Project Number / Project # (Required)', required: true },
    { value: 'building_code', label: 'Building Code / Building # (Required)', required: true },
    { value: 'building_name', label: 'Building Name (Required)', required: true },
    { value: 'building_type', label: 'Building Type' },
    { value: 'area_m2', label: 'Area m2' },
    { value: 'weight_tons', label: 'Weight Tons' },
    { value: 'remarks', label: 'Remarks' },
    { value: '_skip', label: '(Skip this column)' },
  ],
};

export function FieldMapper({ excelColumns, sheetType, onMappingComplete, onCancel }: FieldMapperProps) {
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    // Auto-map columns with similar names
    const autoMappings: Record<string, string> = {};
    
    console.log('FieldMapper - Excel Columns:', excelColumns);
    console.log('FieldMapper - Sheet Type:', sheetType);
    
    excelColumns.forEach((col) => {
      const normalized = col.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const otsFields = OTS_FIELDS[sheetType];
      
      // Try exact match first
      const exactMatch = otsFields.find(f => f.value === normalized);
      if (exactMatch) {
        autoMappings[col] = exactMatch.value;
        return;
      }
      
      // Try partial match
      const partialMatch = otsFields.find(f => 
        f.value.includes(normalized) || normalized.includes(f.value.replace(/_/g, ''))
      );
      if (partialMatch) {
        autoMappings[col] = partialMatch.value;
      }
    });
    
    return autoMappings;
  });

  const handleMappingChange = (excelColumn: string, otsField: string) => {
    setMappings((prev) => ({
      ...prev,
      [excelColumn]: otsField,
    }));
  };

  const handleAutoMap = () => {
    const autoMappings: Record<string, string> = {};
    excelColumns.forEach((col) => {
      const normalized = col.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const otsFields = OTS_FIELDS[sheetType];
      
      // Try to find best match
      const exactMatch = otsFields.find(f => f.value === normalized);
      if (exactMatch) {
        autoMappings[col] = exactMatch.value;
        return;
      }
      
      // Common aliases
      const aliases: Record<string, string> = {
        'project': 'project_code',
        'project_number': 'project_code',
        'proj_no': 'project_code',
        'name': 'project_name',
        'client': 'client_name',
        'pm': 'project_manager',
        'manager': 'project_manager',
        'start': 'planned_start_date',
        'end': 'planned_end_date',
        'finish': 'planned_end_date',
        'building': 'building_code',
        'bldg': 'building_code',
        'notes': 'remarks',
      };
      
      const alias = aliases[normalized];
      if (alias) {
        autoMappings[col] = alias;
      }
    });
    
    setMappings(autoMappings);
  };

  const handleComplete = () => {
    // Filter out unmapped (empty string) and skipped columns
    const finalMappings = Object.entries(mappings)
      .filter(([_, otsField]) => otsField && otsField !== '' && otsField !== '_skip')
      .reduce((acc, [excelCol, otsField]) => {
        acc[excelCol] = otsField;
        return acc;
      }, {} as Record<string, string>);
    
    console.log('Final mappings:', finalMappings);
    onMappingComplete(finalMappings);
  };

  const requiredFields = OTS_FIELDS[sheetType].filter(f => f.required);
  const mappedOtsFields = Object.values(mappings);
  const missingRequired = requiredFields.filter(f => !mappedOtsFields.includes(f.value));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Map Your Columns</h3>
        <p className="text-sm text-muted-foreground">
          Match your Excel columns to OTS fields. Auto-mapping has been applied based on column names.
        </p>
      </div>

      {/* Debug Info */}
      {excelColumns.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            No columns found in Excel file. Please ensure your Excel file has a header row with column names.
          </p>
          <p className="text-xs text-yellow-700 mt-2">
            Columns received: {JSON.stringify(excelColumns)}
          </p>
        </div>
      )}

      {/* Sheet Info and Auto-Map */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Mapping: <span className="text-primary">{sheetType === 'projects' ? 'Projects' : 'Buildings'} Sheet</span>
        </div>
        <Button
          variant="outline"
          onClick={handleAutoMap}
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Auto-Map
        </Button>
      </div>

      {/* Mapping Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 grid grid-cols-2 gap-4 font-medium text-sm">
          <div>Your Excel Column</div>
          <div>Maps to OTS Field</div>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {excelColumns.map((col, index) => (
            <div key={`${col}-${index}`} className="px-4 py-3 grid grid-cols-2 gap-4 items-center hover:bg-muted/30">
              <div className="font-medium text-sm">{col}</div>
              <div>
                <select
                  value={mappings[col] || ''}
                  onChange={(e) => handleMappingChange(col, e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="">-- Select Field or Skip --</option>
                  {OTS_FIELDS[sheetType].map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> You can leave optional fields unmapped (they will be skipped). 
          Only required fields marked with "(Required)" must be mapped.
        </p>
      </div>

      {/* Validation Messages */}
      {missingRequired.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">Missing Required Fields</h4>
          <p className="text-sm text-yellow-800">
            Please map the following required fields to continue:
          </p>
          <ul className="list-disc list-inside text-sm text-yellow-800 mt-2">
            {missingRequired.map((field) => (
              <li key={field.value}>{field.label}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleComplete}
          disabled={missingRequired.length > 0}
        >
          Continue with Mapping
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
