/**
 * Type definitions for Project Migration & Excel Upload Module
 * Hexa Steel® OTS - Operations Tracking System
 */

import { z } from 'zod';

// ============================================
// ENUMS
// ============================================

export const ProjectStatus = z.enum(['Draft', 'Active', 'On-Hold', 'Completed', 'Cancelled']);
export const BuildingType = z.enum(['HR', 'PEB', 'MEP', 'Modular', 'Other']);

// ============================================
// EXCEL ROW SCHEMAS
// ============================================

/**
 * Schema for Projects sheet row
 */
export const ProjectRowSchema = z.object({
  // Required fields
  project_code: z.string().min(1, 'Project code is required'),
  project_name: z.string().min(1, 'Project name is required'),
  
  // Optional fields
  client_name: z.string().optional(),
  location: z.string().optional(),
  start_date: z.union([z.date(), z.string()]).optional(),
  end_date: z.union([z.date(), z.string()]).optional(),
  status: ProjectStatus.optional(),
  remarks: z.string().optional(),
  contract_value: z.union([z.number(), z.string()]).optional(),
  tonnage: z.union([z.number(), z.string()]).optional(),
  sales_engineer: z.string().optional(),
  project_manager: z.string().optional(),
  estimation_number: z.string().optional(),
  contract_date: z.union([z.date(), z.string()]).optional(),
  down_payment_date: z.union([z.date(), z.string()]).optional(),
  planned_start_date: z.union([z.date(), z.string()]).optional(),
  planned_end_date: z.union([z.date(), z.string()]).optional(),
  structure_type: z.string().optional(),
  no_of_structures: z.union([z.number(), z.string()]).optional(),
  erection_subcontractor: z.string().optional(),
  down_payment: z.union([z.number(), z.string()]).optional(),
  down_payment_percentage: z.union([z.number(), z.string()]).optional(),
  down_payment_milestone: z.string().optional(),
  payment_2: z.union([z.number(), z.string()]).optional(),
  payment_2_percentage: z.union([z.number(), z.string()]).optional(),
  payment_2_milestone: z.string().optional(),
  payment_3: z.union([z.number(), z.string()]).optional(),
  payment_3_percentage: z.union([z.number(), z.string()]).optional(),
  payment_3_milestone: z.string().optional(),
  payment_4: z.union([z.number(), z.string()]).optional(),
  payment_4_percentage: z.union([z.number(), z.string()]).optional(),
  payment_4_milestone: z.string().optional(),
  payment_5: z.union([z.number(), z.string()]).optional(),
  payment_5_percentage: z.union([z.number(), z.string()]).optional(),
  payment_5_milestone: z.string().optional(),
  payment_6: z.union([z.number(), z.string()]).optional(),
  payment_6_percentage: z.union([z.number(), z.string()]).optional(),
  payment_6_milestone: z.string().optional(),
  ho_retention: z.union([z.number(), z.string()]).optional(),
  incoterm: z.string().optional(),
  scope_of_work: z.string().optional(),
  project_nature: z.string().optional(),
  cranes_included: z.union([z.boolean(), z.string()]).optional(),
  surveyor_our_scope: z.union([z.boolean(), z.string()]).optional(),
  galvanized: z.union([z.boolean(), z.string()]).optional(),
  galvanization_microns: z.union([z.number(), z.string()]).optional(),
  area: z.union([z.number(), z.string()]).optional(),
  m2_per_ton: z.union([z.number(), z.string()]).optional(),
  paint_coat_1: z.string().optional(),
  coat_1_microns: z.union([z.number(), z.string()]).optional(),
  paint_coat_2: z.string().optional(),
  coat_2_microns: z.union([z.number(), z.string()]).optional(),
  paint_coat_3: z.string().optional(),
  coat_3_microns: z.union([z.number(), z.string()]).optional(),
  paint_coat_4: z.string().optional(),
  coat_4_microns: z.union([z.number(), z.string()]).optional(),
});

/**
 * Schema for Buildings sheet row
 */
export const BuildingRowSchema = z.object({
  // Required fields
  project_code: z.string().min(1, 'Project code is required'),
  building_code: z.string().min(1, 'Building code is required'),
  building_name: z.string().min(1, 'Building name is required'),
  
  // Optional fields
  building_type: z.string().optional(), // Accept any string, will be validated/converted later
  area_m2: z.union([z.number(), z.string()]).optional(),
  weight_tons: z.union([z.number(), z.string()]).optional(),
  remarks: z.string().optional(),
});

export type ProjectRow = z.infer<typeof ProjectRowSchema>;
export type BuildingRow = z.infer<typeof BuildingRowSchema>;

// ============================================
// VALIDATION RESULT TYPES
// ============================================

export interface ValidationError {
  row: number;
  field?: string;
  message: string;
  severity: 'critical' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  projectsCount: number;
  buildingsCount: number;
}

// ============================================
// IMPORT/EXPORT TYPES
// ============================================

export interface ParsedExcelData {
  projects: ProjectRow[];
  buildings: BuildingRow[];
}

export interface ImportSummary {
  success: boolean;
  projectsCreated: number;
  projectsUpdated: number;
  buildingsCreated: number;
  buildingsUpdated: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  message: string;
}

export interface ExportOptions {
  projectId?: string;
  includeBuildings?: boolean;
}

// ============================================
// DATABASE MAPPING TYPES
// ============================================

export interface ProjectImportData {
  projectNumber: string;
  name: string;
  clientId?: string;
  clientName?: string;
  projectManagerId?: string;
  projectManagerName?: string;
  salesEngineerId?: string;
  salesEngineerName?: string;
  estimationNumber?: string;
  contractDate?: Date;
  downPaymentDate?: Date;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  status?: string;
  contractValue?: number;
  downPayment?: number;
  payment2?: number;
  payment3?: number;
  payment4?: number;
  payment5?: number;
  payment6?: number;
  hoRetention?: number;
  structureType?: string;
  numberOfStructures?: number;
  erectionSubcontractor?: string;
  incoterm?: string;
  scopeOfWork?: string;
  projectNature?: string;
  projectLocation?: string;
  cranesIncluded?: boolean;
  surveyorOurScope?: boolean;
  contractualTonnage?: number;
  galvanized?: boolean;
  galvanizationMicrons?: number;
  area?: number;
  m2PerTon?: number;
  paintCoat1?: string;
  paintCoat1Microns?: number;
  paintCoat2?: string;
  paintCoat2Microns?: number;
  paintCoat3?: string;
  paintCoat3Microns?: number;
  paintCoat4?: string;
  paintCoat4Microns?: number;
  remarks?: string;
}

export interface BuildingImportData {
  projectNumber: string;
  designation: string;
  name: string;
  description?: string;
}
