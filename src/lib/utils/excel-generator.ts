/**
 * Excel Generator Utility
 * Handles generation of Excel files for project export
 */

import * as XLSX from 'xlsx';

// ============================================
// TYPES
// ============================================

interface ProjectExportData {
  id: string;
  projectNumber: string;
  estimationNumber: string | null;
  name: string;
  client: {
    name: string;
  };
  projectManager: {
    name: string;
  };
  salesEngineer: {
    name: string;
  } | null;
  contractDate: Date | null;
  downPaymentDate: Date | null;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  status: string;
  contractValue: any;
  downPayment: any;
  payment2: any;
  payment3: any;
  payment4: any;
  payment5: any;
  payment6: any;
  hoRetention: any;
  structureType: string | null;
  numberOfStructures: number | null;
  erectionSubcontractor: string | null;
  incoterm: string | null;
  scopeOfWork: string | null;
  projectNature: string | null;
  projectLocation: string | null;
  cranesIncluded: boolean;
  surveyorOurScope: boolean;
  contractualTonnage: any;
  galvanized: boolean;
  galvanizationMicrons: number | null;
  area: any;
  m2PerTon: any;
  paintCoat1: string | null;
  paintCoat1Microns: number | null;
  paintCoat2: string | null;
  paintCoat2Microns: number | null;
  paintCoat3: string | null;
  paintCoat3Microns: number | null;
  paintCoat4: string | null;
  paintCoat4Microns: number | null;
  remarks: string | null;
  buildings: BuildingExportData[];
}

interface BuildingExportData {
  id: string;
  designation: string;
  name: string;
  description: string | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

function formatDecimal(value: any): number | string {
  if (value === null || value === undefined) return '';
  return typeof value === 'object' ? parseFloat(value.toString()) : value;
}

function formatBoolean(value: boolean): string {
  return value ? 'Yes' : 'No';
}

// ============================================
// MAIN GENERATOR FUNCTIONS
// ============================================

/**
 * Generate Excel file from project data
 */
export function generateProjectExcel(projects: ProjectExportData[]): Buffer {
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // ============================================
  // PROJECTS SHEET
  // ============================================
  
  const projectsData = projects.map((project) => ({
    'Project #': project.projectNumber,
    'Estimation #': project.estimationNumber || '',
    'Project Name': project.name,
    'Client Name': project.client.name,
    'Project Manager': project.projectManager.name,
    'Sales Engineer': project.salesEngineer?.name || '',
    'Contract Date': formatDate(project.contractDate),
    'Down Payment Date': formatDate(project.downPaymentDate),
    'Planned Start Date': formatDate(project.plannedStartDate),
    'Planned End Date': formatDate(project.plannedEndDate),
    'Status': project.status,
    'Contract Value': formatDecimal(project.contractValue),
    'Tonnage': formatDecimal(project.contractualTonnage),
    'Down Payment': formatDecimal(project.downPayment),
    'Payment 2': formatDecimal(project.payment2),
    'Payment 3': formatDecimal(project.payment3),
    'Payment 4': formatDecimal(project.payment4),
    'Payment 5': formatDecimal(project.payment5),
    'Payment 6': formatDecimal(project.payment6),
    'H.O Retention': formatDecimal(project.hoRetention),
    'Incoterm': project.incoterm || '',
    'Scope of Work': project.scopeOfWork || '',
    'Structure Type': project.structureType || '',
    'Project Nature': project.projectNature || '',
    'No. of structures': project.numberOfStructures || '',
    'Erection Subcontractor': project.erectionSubcontractor || '',
    'Cranes Included?': formatBoolean(project.cranesIncluded),
    'Surveyor Our Scope': formatBoolean(project.surveyorOurScope),
    'Galvanized': formatBoolean(project.galvanized),
    'Galvanization Microns': project.galvanizationMicrons || '',
    'Area': formatDecimal(project.area),
    'm2/Ton': formatDecimal(project.m2PerTon),
    'Paint Coat 1': project.paintCoat1 || '',
    'Coat 1 - Microns': project.paintCoat1Microns || '',
    'Paint Coat 2': project.paintCoat2 || '',
    'Coat 2 - Microns': project.paintCoat2Microns || '',
    'Paint Coat 3': project.paintCoat3 || '',
    'Coat 3 - Microns': project.paintCoat3Microns || '',
    'Paint Coat 4': project.paintCoat4 || '',
    'Coat 4 - Microns': project.paintCoat4Microns || '',
    'Location': project.projectLocation || '',
    'Remarks': project.remarks || '',
  }));
  
  const projectsSheet = XLSX.utils.json_to_sheet(projectsData);
  
  // Set column widths
  const projectsColWidths = [
    { wch: 15 }, // Project #
    { wch: 15 }, // Estimation #
    { wch: 30 }, // Project Name
    { wch: 25 }, // Client Name
    { wch: 20 }, // Project Manager
    { wch: 20 }, // Sales Engineer
    { wch: 15 }, // Contract Date
    { wch: 18 }, // Down Payment Date
    { wch: 18 }, // Planned Start Date
    { wch: 18 }, // Planned End Date
    { wch: 12 }, // Status
    { wch: 15 }, // Contract Value
    { wch: 12 }, // Tonnage
    { wch: 15 }, // Down Payment
    { wch: 12 }, // Payment 2
    { wch: 12 }, // Payment 3
    { wch: 12 }, // Payment 4
    { wch: 12 }, // Payment 5
    { wch: 12 }, // Payment 6
    { wch: 15 }, // H.O Retention
    { wch: 12 }, // Incoterm
    { wch: 30 }, // Scope of Work
    { wch: 15 }, // Structure Type
    { wch: 15 }, // Project Nature
    { wch: 15 }, // No. of structures
    { wch: 25 }, // Erection Subcontractor
    { wch: 15 }, // Cranes Included?
    { wch: 18 }, // Surveyor Our Scope
    { wch: 12 }, // Galvanized
    { wch: 18 }, // Galvanization Microns
    { wch: 12 }, // Area
    { wch: 10 }, // m2/Ton
    { wch: 15 }, // Paint Coat 1
    { wch: 15 }, // Coat 1 - Microns
    { wch: 15 }, // Paint Coat 2
    { wch: 15 }, // Coat 2 - Microns
    { wch: 15 }, // Paint Coat 3
    { wch: 15 }, // Coat 3 - Microns
    { wch: 15 }, // Paint Coat 4
    { wch: 15 }, // Coat 4 - Microns
    { wch: 25 }, // Location
    { wch: 30 }, // Remarks
  ];
  
  projectsSheet['!cols'] = projectsColWidths;
  
  XLSX.utils.book_append_sheet(workbook, projectsSheet, 'Projects');
  
  // ============================================
  // BUILDINGS SHEET
  // ============================================
  
  const buildingsData: any[] = [];
  
  projects.forEach((project) => {
    project.buildings.forEach((building) => {
      buildingsData.push({
        'Project Code': project.projectNumber,
        'Building Code': building.designation,
        'Building Name': building.name,
        'Building Type': '', // Not stored in current schema
        'Area m2': '', // Not stored in current schema
        'Weight Tons': '', // Not stored in current schema
        'Remarks': building.description || '',
      });
    });
  });
  
  const buildingsSheet = XLSX.utils.json_to_sheet(buildingsData);
  
  // Set column widths
  const buildingsColWidths = [
    { wch: 15 }, // Project Code
    { wch: 15 }, // Building Code
    { wch: 30 }, // Building Name
    { wch: 15 }, // Building Type
    { wch: 12 }, // Area m2
    { wch: 12 }, // Weight Tons
    { wch: 30 }, // Remarks
  ];
  
  buildingsSheet['!cols'] = buildingsColWidths;
  
  XLSX.utils.book_append_sheet(workbook, buildingsSheet, 'Buildings');
  
  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  return buffer;
}

/**
 * Generate empty template Excel file
 */
export function generateEmptyTemplate(): Buffer {
  const workbook = XLSX.utils.book_new();
  
  // Projects sheet with headers only
  const projectsHeaders = [
    'Project #',
    'Estimation #',
    'Project Name',
    'Client Name',
    'Project Manager',
    'Sales Engineer',
    'Contract Date',
    'Down Payment Date',
    'Planned Start Date',
    'Planned End Date',
    'Status',
    'Contract Value',
    'Tonnage',
    'Down Payment',
    'Payment 2',
    'Payment 3',
    'Payment 4',
    'Payment 5',
    'Payment 6',
    'H.O Retention',
    'Incoterm',
    'Scope of Work',
    'Structure Type',
    'Project Nature',
    'No. of structures',
    'Erection Subcontractor',
    'Cranes Included?',
    'Surveyor Our Scope',
    'Galvanized',
    'Galvanization Microns',
    'Area',
    'm2/Ton',
    'Paint Coat 1',
    'Coat 1 - Microns',
    'Paint Coat 2',
    'Coat 2 - Microns',
    'Paint Coat 3',
    'Coat 3 - Microns',
    'Paint Coat 4',
    'Coat 4 - Microns',
    'Location',
    'Remarks',
  ];
  
  const projectsSheet = XLSX.utils.aoa_to_sheet([projectsHeaders]);
  XLSX.utils.book_append_sheet(workbook, projectsSheet, 'Projects');
  
  // Buildings sheet with headers only
  const buildingsHeaders = [
    'Project Code',
    'Building Code',
    'Building Name',
    'Building Type',
    'Area m2',
    'Weight Tons',
    'Remarks',
  ];
  
  const buildingsSheet = XLSX.utils.aoa_to_sheet([buildingsHeaders]);
  XLSX.utils.book_append_sheet(workbook, buildingsSheet, 'Buildings');
  
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  return buffer;
}
