/**
 * Excel Parser Utility
 * Handles parsing and validation of Excel files for project migration
 */

import * as XLSX from 'xlsx';
import {
  ParsedExcelData,
  ProjectRow,
  BuildingRow,
  ValidationError,
  ValidationResult,
  ProjectRowSchema,
  BuildingRowSchema,
} from '@/lib/types/project-migration';

// ============================================
// CONSTANTS
// ============================================

const REQUIRED_SHEETS = ['Projects'];

const REQUIRED_PROJECT_COLUMNS = [
  'project_code',
  'project_name',
];

const REQUIRED_BUILDING_COLUMNS = [
  'project_code',
  'building_code',
  'building_name',
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalize column names (lowercase, replace spaces with underscores)
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w_]/g, '');
}

/**
 * Convert Excel date serial number to JavaScript Date
 */
function parseExcelDate(value: any): Date | undefined {
  if (!value) return undefined;
  
  if (value instanceof Date) return value;
  
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
  
  // Excel serial date
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return new Date(date.y, date.m - 1, date.d);
  }
  
  return undefined;
}

/**
 * Parse numeric value from various formats
 */
function parseNumeric(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    // Remove currency symbols, commas, and percentage signs
    const cleaned = value.replace(/[$,%]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  }
  
  return undefined;
}

/**
 * Parse boolean value from various formats
 */
function parseBoolean(value: any): boolean | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  
  if (typeof value === 'boolean') return value;
  
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'yes' || lower === 'true' || lower === '1') return true;
    if (lower === 'no' || lower === 'false' || lower === '0') return false;
  }
  
  if (typeof value === 'number') {
    return value !== 0;
  }
  
  return undefined;
}

// ============================================
// MAIN PARSER FUNCTIONS
// ============================================

/**
 * Extract column headers from Excel file
 */
export function extractExcelColumns(buffer: Buffer): { projects: string[]; buildings: string[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  
  // Check if required sheets exist
  if (!workbook.Sheets['Projects']) {
    throw new Error('Excel file must contain "Projects" sheet');
  }
  
  const projectsSheet = workbook.Sheets['Projects'];
  const buildingsSheet = workbook.Sheets['Buildings'];
  
  // Get first row as headers
  const projectsData = XLSX.utils.sheet_to_json(projectsSheet, { header: 1, defval: '' }) as any[][];
  const buildingsData = buildingsSheet ? XLSX.utils.sheet_to_json(buildingsSheet, { header: 1, defval: '' }) as any[][] : [];
  
  // Extract and filter headers (first row)
  const projectHeaders = (projectsData[0] || [])
    .filter((col: any) => col !== null && col !== undefined && col !== '')
    .map((col: any) => String(col).trim());
  
  const buildingHeaders = (buildingsData[0] || [])
    .filter((col: any) => col !== null && col !== undefined && col !== '')
    .map((col: any) => String(col).trim());
  
  return {
    projects: projectHeaders,
    buildings: buildingHeaders,
  };
}

/**
 * Parse Excel file buffer and extract data with custom column mappings
 */
export function parseExcelFileWithMapping(
  buffer: Buffer,
  projectMappings?: Record<string, string>,
  buildingMappings?: Record<string, string>
): ParsedExcelData {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  
  // Validate sheet names
  const missingSheets = REQUIRED_SHEETS.filter(
    (sheet) => !workbook.SheetNames.includes(sheet)
  );
  
  if (missingSheets.length > 0) {
    throw new Error(
      `Missing required sheet: Projects. Buildings sheet is optional.`
    );
  }
  
  // Parse Projects sheet
  const projectsSheet = workbook.Sheets['Projects'];
  const projectsRaw = XLSX.utils.sheet_to_json(projectsSheet, { defval: '' });
  
  // Parse Buildings sheet (optional)
  const buildingsSheet = workbook.Sheets['Buildings'];
  const buildingsRaw = buildingsSheet ? XLSX.utils.sheet_to_json(buildingsSheet, { defval: '' }) : [];
  
  // Apply mappings to projects and filter empty rows
  const projects: ProjectRow[] = projectsRaw
    .map((row: any) => {
      const mapped: any = {};
      
      // Apply custom mappings if provided
      if (projectMappings) {
        Object.entries(projectMappings).forEach(([excelCol, otsField]) => {
          if (row[excelCol] !== undefined) {
            mapped[otsField] = row[excelCol];
          }
        });
      } else {
        // Use default normalization
        Object.keys(row).forEach((key) => {
          const normalizedKey = normalizeColumnName(key);
          mapped[normalizedKey] = row[key];
        });
      }
      
      return mapProjectRow(mapped);
    })
    .filter((project) => {
      // Filter out completely empty rows (no project_code and no project_name)
      return project.project_code || project.project_name;
    });
  
  // Apply mappings to buildings and filter empty rows
  const buildings: BuildingRow[] = buildingsRaw
    .map((row: any) => {
      const mapped: any = {};
      
      // Apply custom mappings if provided
      if (buildingMappings) {
        Object.entries(buildingMappings).forEach(([excelCol, otsField]) => {
          if (row[excelCol] !== undefined) {
            mapped[otsField] = row[excelCol];
          }
        });
      } else {
        // Use default normalization
        Object.keys(row).forEach((key) => {
          const normalizedKey = normalizeColumnName(key);
          mapped[normalizedKey] = row[key];
        });
      }
      
      return mapBuildingRow(mapped);
    })
    .filter((building) => {
      // Filter out completely empty rows (no project_code, building_code, or building_name)
      return building.project_code || building.building_code || building.building_name;
    });
  
  return { projects, buildings };
}

/**
 * Convert value to string, handling numbers and other types
 */
function toString(value: any): string {
  if (value === null || value === undefined || value === '') return '';
  return String(value).trim();
}

/**
 * Normalize building type to valid enum value
 */
function normalizeBuildingType(value: any): string | undefined {
  if (!value) return undefined;
  
  const str = toString(value).toUpperCase();
  
  // Valid enum values
  const validTypes = ['HR', 'PEB', 'MEP', 'MODULAR', 'OTHER'];
  
  // Check for exact match
  if (validTypes.includes(str)) {
    // Return with proper casing
    if (str === 'MODULAR') return 'Modular';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
  
  // Check for common variations
  const normalized = str.replace(/[^A-Z]/g, '');
  if (normalized === 'HR' || str.includes('HEAVY')) return 'HR';
  if (normalized === 'PEB' || str.includes('PRE') || str.includes('ENGINEERED')) return 'PEB';
  if (normalized === 'MEP' || str.includes('MECHANICAL') || str.includes('ELECTRICAL')) return 'MEP';
  if (str.includes('MODULAR') || str.includes('MODULE')) return 'Modular';
  
  // Default to Other for unrecognized values
  return 'Other';
}

/**
 * Map normalized data to ProjectRow
 */
function mapProjectRow(normalized: any): ProjectRow {
  return {
    project_code: toString(normalized.project_code || normalized.project),
    project_name: toString(normalized.project_name || normalized.name),
    client_name: toString(normalized.client_name || normalized.client),
    location: toString(normalized.location || normalized.project_location),
    start_date: parseExcelDate(normalized.start_date || normalized.planned_start_date),
    end_date: parseExcelDate(normalized.end_date || normalized.planned_end_date),
    status: (toString(normalized.status) as any) || 'Draft',
    remarks: toString(normalized.remarks || normalized.notes),
    contract_value: parseNumeric(normalized.contract_value),
    tonnage: parseNumeric(normalized.tonnage || normalized.contractual_tonnage),
    sales_engineer: toString(normalized.sales_engineer),
    project_manager: toString(normalized.project_manager),
    estimation_number: toString(normalized.estimation_number || normalized.estimation),
    contract_date: parseExcelDate(normalized.contract_date),
    down_payment_date: parseExcelDate(normalized.down_payment_date),
    planned_start_date: parseExcelDate(normalized.planned_start_date || normalized.start_date),
    planned_end_date: parseExcelDate(normalized.planned_end_date || normalized.end_date || normalized.finish),
    structure_type: toString(normalized.structure_type),
    no_of_structures: parseNumeric(normalized.no_of_structures || normalized.number_of_structures),
    erection_subcontractor: toString(normalized.erection_subcontractor),
    down_payment: parseNumeric(normalized.down_payment),
    down_payment_percentage: parseNumeric(normalized.down_payment_percentage),
    down_payment_milestone: toString(normalized.down_payment_milestone),
    payment_2: parseNumeric(normalized.payment_2 || normalized.payment2),
    payment_2_percentage: parseNumeric(normalized.payment_2_percentage),
    payment_2_milestone: toString(normalized.payment_2_milestone),
    payment_3: parseNumeric(normalized.payment_3 || normalized.payment3),
    payment_3_percentage: parseNumeric(normalized.payment_3_percentage),
    payment_3_milestone: toString(normalized.payment_3_milestone),
    payment_4: parseNumeric(normalized.payment_4 || normalized.payment4),
    payment_4_percentage: parseNumeric(normalized.payment_4_percentage),
    payment_4_milestone: toString(normalized.payment_4_milestone),
    payment_5: parseNumeric(normalized.payment_5 || normalized.payment5),
    payment_5_percentage: parseNumeric(normalized.payment_5_percentage),
    payment_5_milestone: toString(normalized.payment_5_milestone),
    payment_6: parseNumeric(normalized.payment_6 || normalized.payment6),
    payment_6_percentage: parseNumeric(normalized.payment_6_percentage),
    payment_6_milestone: toString(normalized.payment_6_milestone),
    ho_retention: parseNumeric(normalized.ho_retention),
    incoterm: toString(normalized.incoterm),
    scope_of_work: toString(normalized.scope_of_work),
    project_nature: toString(normalized.project_nature),
    cranes_included: parseBoolean(normalized.cranes_included),
    surveyor_our_scope: parseBoolean(normalized.surveyor_our_scope),
    galvanized: parseBoolean(normalized.galvanized),
    galvanization_microns: parseNumeric(normalized.galvanization_microns),
    area: parseNumeric(normalized.area),
    m2_per_ton: parseNumeric(normalized.m2_per_ton || normalized.m2ton),
    paint_coat_1: toString(normalized.paint_coat_1),
    coat_1_microns: parseNumeric(normalized.coat_1_microns),
    paint_coat_2: toString(normalized.paint_coat_2),
    coat_2_microns: parseNumeric(normalized.coat_2_microns),
    paint_coat_3: toString(normalized.paint_coat_3),
    coat_3_microns: parseNumeric(normalized.coat_3_microns),
    paint_coat_4: toString(normalized.paint_coat_4),
    coat_4_microns: parseNumeric(normalized.coat_4_microns),
  };
}

/**
 * Map normalized data to BuildingRow
 */
function mapBuildingRow(normalized: any): BuildingRow {
  return {
    project_code: toString(normalized.project_code || normalized.project),
    building_code: toString(normalized.building_code || normalized.building),
    building_name: toString(normalized.building_name || normalized.name),
    building_type: normalizeBuildingType(normalized.building_type || normalized.type),
    area_m2: parseNumeric(normalized.area_m2 || normalized.area),
    weight_tons: parseNumeric(normalized.weight_tons || normalized.weight),
    remarks: toString(normalized.remarks || normalized.notes),
  };
}

/**
 * Parse Excel file buffer and extract data (legacy function - uses default normalization)
 */
export function parseExcelFile(buffer: Buffer): ParsedExcelData {
  return parseExcelFileWithMapping(buffer);
}

/**
 * Validate parsed Excel data
 */
export function validateExcelData(data: ParsedExcelData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  // Validate Projects
  const projectCodes = new Set<string>();
  
  data.projects.forEach((project, index) => {
    const rowNumber = index + 2; // +2 because Excel is 1-indexed and has header row
    
    // Validate with Zod schema
    const result = ProjectRowSchema.safeParse(project);
    
    if (!result.success) {
      result.error.issues.forEach((err: any) => {
        errors.push({
          row: rowNumber,
          field: err.path.join('.'),
          message: `Projects sheet: ${err.message}`,
          severity: 'critical',
        });
      });
    }
    
    // Check for duplicate project codes (only in Projects sheet - same project can have multiple buildings)
    if (project.project_code) {
      if (projectCodes.has(project.project_code)) {
        // This is a warning, not an error - user might want to update/merge data
        warnings.push({
          row: rowNumber,
          field: 'project_code',
          message: `Duplicate project code: ${project.project_code}. Only the last occurrence will be imported.`,
          severity: 'warning',
        });
      }
      projectCodes.add(project.project_code);
    }
    
    // Validate enum values
    if (project.status && !['Draft', 'Active', 'On-Hold', 'Completed', 'Cancelled'].includes(project.status)) {
      errors.push({
        row: rowNumber,
        field: 'status',
        message: `Invalid status: ${project.status}. Must be one of: Draft, Active, On-Hold, Completed, Cancelled`,
        severity: 'critical',
      });
    }
    
    // Warnings for missing optional but recommended fields
    if (!project.client_name) {
      warnings.push({
        row: rowNumber,
        field: 'client_name',
        message: 'Client name is missing',
        severity: 'warning',
      });
    }
    
    if (!project.project_manager) {
      warnings.push({
        row: rowNumber,
        field: 'project_manager',
        message: 'Project manager is missing',
        severity: 'warning',
      });
    }
  });
  
  // Validate Buildings
  data.buildings.forEach((building, index) => {
    const rowNumber = index + 2;
    
    // Validate with Zod schema
    const result = BuildingRowSchema.safeParse(building);
    
    if (!result.success) {
      result.error.issues.forEach((err: any) => {
        errors.push({
          row: rowNumber,
          field: err.path.join('.'),
          message: `Buildings sheet: ${err.message}`,
          severity: 'critical',
        });
      });
    }
    
    // Check if project_code exists in Projects sheet (only if we have projects)
    if (building.project_code && projectCodes.size > 0 && !projectCodes.has(building.project_code)) {
      errors.push({
        row: rowNumber,
        field: 'project_code',
        message: `Building references non-existent project: ${building.project_code}`,
        severity: 'critical',
      });
    }
    
    // Validate building type enum
    if (building.building_type && !['HR', 'PEB', 'MEP', 'Modular', 'Other'].includes(building.building_type)) {
      errors.push({
        row: rowNumber,
        field: 'building_type',
        message: `Invalid building type: ${building.building_type}. Must be one of: HR, PEB, MEP, Modular, Other`,
        severity: 'critical',
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    projectsCount: data.projects.length,
    buildingsCount: data.buildings.length,
  };
}

/**
 * Validate column structure of Excel file
 */
export function validateExcelStructure(buffer: Buffer): ValidationError[] {
  const errors: ValidationError[] = [];
  
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Check for required sheets
    REQUIRED_SHEETS.forEach((sheetName) => {
      if (!workbook.SheetNames.includes(sheetName)) {
        errors.push({
          row: 0,
          message: `Missing required sheet: ${sheetName}`,
          severity: 'critical',
        });
      }
    });
    
    if (errors.length > 0) return errors;
    
    // Validate Projects sheet columns
    const projectsSheet = workbook.Sheets['Projects'];
    const projectsData = XLSX.utils.sheet_to_json(projectsSheet, { header: 1 }) as any[][];
    
    if (projectsData.length > 0) {
      const projectHeaders = projectsData[0].map((h: any) => normalizeColumnName(String(h)));
      
      REQUIRED_PROJECT_COLUMNS.forEach((col) => {
        if (!projectHeaders.includes(col) && !projectHeaders.includes(col.replace('_', ''))) {
          errors.push({
            row: 1,
            field: col,
            message: `Projects sheet missing required column: ${col}`,
            severity: 'critical',
          });
        }
      });
    }
    
    // Validate Buildings sheet columns (optional)
    const buildingsSheet = workbook.Sheets['Buildings'];
    if (!buildingsSheet) return errors; // Buildings sheet is optional
    
    const buildingsData = XLSX.utils.sheet_to_json(buildingsSheet, { header: 1 }) as any[][];
    
    if (buildingsData.length > 0) {
      const buildingHeaders = buildingsData[0].map((h: any) => normalizeColumnName(String(h)));
      
      REQUIRED_BUILDING_COLUMNS.forEach((col) => {
        if (!buildingHeaders.includes(col) && !buildingHeaders.includes(col.replace('_', ''))) {
          errors.push({
            row: 1,
            field: col,
            message: `Buildings sheet missing required column: ${col}`,
            severity: 'critical',
          });
        }
      });
    }
  } catch (error) {
    errors.push({
      row: 0,
      message: `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'critical',
    });
  }
  
  return errors;
}
