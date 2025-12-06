/**
 * Generate Sample Excel Template
 * Creates a sample Excel file with example data for testing
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

function generateSampleTemplate() {
  const workbook = XLSX.utils.book_new();

  // Sample Projects Data
  const projectsData = [
    {
      'Project #': 'PRJ-2024-001',
      'Estimation #': 'EST-2024-001',
      'Project Name': 'Industrial Warehouse Complex',
      'Client Name': 'ABC Manufacturing Ltd.',
      'Project Manager': 'John Smith',
      'Sales Engineer': 'Jane Doe',
      'Contract Date': '2024-01-15',
      'Down Payment Date': '2024-01-20',
      'Planned Start Date': '2024-02-01',
      'Planned End Date': '2024-08-31',
      'Status': 'Active',
      'Contract Value': 1500000,
      'Tonnage': 450,
      'Down Payment': 300000,
      'Payment 2': 450000,
      'Payment 3': 300000,
      'Payment 4': 300000,
      'Payment 5': 150000,
      'Payment 6': 0,
      'H.O Retention': 75000,
      'Incoterm': 'EXW',
      'Scope of Work': 'Design, Fabrication, Delivery',
      'Structure Type': 'PEB',
      'Project Nature': 'Industrial',
      'No. of structures': 3,
      'Erection Subcontractor': 'XYZ Erection Co.',
      'Cranes Included?': 'Yes',
      'Surveyor Our Scope': 'No',
      'Galvanized': 'Yes',
      'Galvanization Microns': 85,
      'Area': 12000,
      'm2/Ton': 26.67,
      'Paint Coat 1': 'Epoxy Primer',
      'Coat 1 - Microns': 80,
      'Paint Coat 2': 'Polyurethane Topcoat',
      'Coat 2 - Microns': 60,
      'Paint Coat 3': '',
      'Coat 3 - Microns': '',
      'Paint Coat 4': '',
      'Coat 4 - Microns': '',
      'Location': 'Industrial Zone, Dubai',
      'Remarks': 'Fast-track project with tight deadline',
    },
    {
      'Project #': 'PRJ-2024-002',
      'Estimation #': 'EST-2024-002',
      'Project Name': 'Commercial Office Building',
      'Client Name': 'Real Estate Developers Inc.',
      'Project Manager': 'Sarah Johnson',
      'Sales Engineer': 'Mike Wilson',
      'Contract Date': '2024-02-10',
      'Down Payment Date': '2024-02-15',
      'Planned Start Date': '2024-03-01',
      'Planned End Date': '2024-10-31',
      'Status': 'Draft',
      'Contract Value': 2500000,
      'Tonnage': 680,
      'Down Payment': 500000,
      'Payment 2': 750000,
      'Payment 3': 500000,
      'Payment 4': 500000,
      'Payment 5': 250000,
      'Payment 6': 0,
      'H.O Retention': 125000,
      'Incoterm': 'DDP',
      'Scope of Work': 'Design, Fabrication, Erection',
      'Structure Type': 'HR',
      'Project Nature': 'Commercial',
      'No. of structures': 1,
      'Erection Subcontractor': 'ABC Erection Services',
      'Cranes Included?': 'No',
      'Surveyor Our Scope': 'Yes',
      'Galvanized': 'No',
      'Galvanization Microns': '',
      'Area': 18500,
      'm2/Ton': 27.21,
      'Paint Coat 1': 'Zinc Rich Primer',
      'Coat 1 - Microns': 75,
      'Paint Coat 2': 'Epoxy Intermediate',
      'Coat 2 - Microns': 100,
      'Paint Coat 3': 'Polyurethane Finish',
      'Coat 3 - Microns': 50,
      'Paint Coat 4': '',
      'Coat 4 - Microns': '',
      'Location': 'Business Bay, Dubai',
      'Remarks': 'High-rise steel structure',
    },
  ];

  // Sample Buildings Data
  const buildingsData = [
    {
      'Project Code': 'PRJ-2024-001',
      'Building Code': 'WH-A',
      'Building Name': 'Warehouse A',
      'Building Type': 'PEB',
      'Area m2': 4000,
      'Weight Tons': 150,
      'Remarks': 'Main storage facility',
    },
    {
      'Project Code': 'PRJ-2024-001',
      'Building Code': 'WH-B',
      'Building Name': 'Warehouse B',
      'Building Type': 'PEB',
      'Area m2': 4000,
      'Weight Tons': 150,
      'Remarks': 'Secondary storage',
    },
    {
      'Project Code': 'PRJ-2024-001',
      'Building Code': 'ADMIN',
      'Building Name': 'Administration Building',
      'Building Type': 'HR',
      'Area m2': 4000,
      'Weight Tons': 150,
      'Remarks': 'Office and admin facilities',
    },
    {
      'Project Code': 'PRJ-2024-002',
      'Building Code': 'MAIN',
      'Building Name': 'Main Tower',
      'Building Type': 'HR',
      'Area m2': 18500,
      'Weight Tons': 680,
      'Remarks': '15-story office tower',
    },
  ];

  // Create Projects sheet
  const projectsSheet = XLSX.utils.json_to_sheet(projectsData);
  XLSX.utils.book_append_sheet(workbook, projectsSheet, 'Projects');

  // Create Buildings sheet
  const buildingsSheet = XLSX.utils.json_to_sheet(buildingsData);
  XLSX.utils.book_append_sheet(workbook, buildingsSheet, 'Buildings');

  // Write to file
  const outputPath = path.join(process.cwd(), 'OTS_Sample_Import_Template.xlsx');
  XLSX.writeFile(workbook, outputPath);

  console.log(`✅ Sample template generated successfully: ${outputPath}`);
  console.log(`\nSample data includes:`);
  console.log(`  - ${projectsData.length} projects`);
  console.log(`  - ${buildingsData.length} buildings`);
  console.log(`\nYou can use this file to test the import functionality.`);
}

// Run the generator
generateSampleTemplate();
