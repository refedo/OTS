import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import * as XLSX from 'xlsx';

const SCOPE_TYPE_MAP: { [key: string]: { id: string; label: string } } = {
  'design': { id: 'design', label: 'Design' },
  'shop drawing': { id: 'shopDrawing', label: 'Detailing' },
  'shop drawings': { id: 'shopDrawing', label: 'Detailing' },
  'detailing': { id: 'shopDrawing', label: 'Detailing' },
  'procurement': { id: 'procurement', label: 'Procurement/Supply' },
  'supply': { id: 'procurement', label: 'Procurement/Supply' },
  'procurement/supply': { id: 'procurement', label: 'Procurement/Supply' },
  'fabrication': { id: 'fabrication', label: 'Fabrication' },
  'galvanization': { id: 'galvanization', label: 'Galvanization' },
  'painting': { id: 'painting', label: 'Painting' },
  'roof sheeting': { id: 'roofSheeting', label: 'Roof Sheeting' },
  'wall sheeting': { id: 'wallSheeting', label: 'Wall Sheeting' },
  'delivery': { id: 'delivery', label: 'Delivery & Logistics' },
  'logistics': { id: 'delivery', label: 'Delivery & Logistics' },
  'delivery & logistics': { id: 'delivery', label: 'Delivery & Logistics' },
  'erection': { id: 'erection', label: 'Erection' },
};

function parseDate(value: any): Date | null {
  if (!value) return null;
  
  // If it's already a Date object
  if (value instanceof Date) {
    return value;
  }
  
  // If it's an Excel serial date number
  if (typeof value === 'number') {
    // Excel date serial number (days since 1900-01-01)
    const excelEpoch = new Date(1900, 0, 1);
    const days = value - 2; // Excel incorrectly treats 1900 as a leap year
    return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
  }
  
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
}

function normalizeActivityName(activity: string): { id: string; label: string } | null {
  const normalized = activity.toLowerCase().trim();
  return SCOPE_TYPE_MAP[normalized] || null;
}

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read the Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

    if (data.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
    }

    // Expected columns: project, building, activity, start date, end date
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Get all projects and buildings for lookup
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        projectNumber: true,
        name: true,
      },
    });

    const buildings = await prisma.building.findMany({
      select: {
        id: true,
        projectId: true,
        designation: true,
        name: true,
      },
    });

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];
      const rowNum = i + 2; // Excel row number (1-indexed + header)

      try {
        // Extract and normalize column names (case-insensitive)
        const keys = Object.keys(row);
        const projectKey = keys.find(k => k.toLowerCase().includes('project'));
        const buildingKey = keys.find(k => k.toLowerCase().includes('building'));
        const activityKey = keys.find(k => k.toLowerCase().includes('activity') || k.toLowerCase().includes('scope'));
        const startDateKey = keys.find(k => k.toLowerCase().includes('start'));
        const endDateKey = keys.find(k => k.toLowerCase().includes('end'));

        if (!projectKey || !buildingKey || !activityKey || !startDateKey || !endDateKey) {
          results.errors.push(`Row ${rowNum}: Missing required columns`);
          results.failed++;
          continue;
        }

        const projectIdentifier = String(row[projectKey] || '').trim();
        const buildingIdentifier = String(row[buildingKey] || '').trim();
        const activityName = String(row[activityKey] || '').trim();
        const startDateValue = row[startDateKey];
        const endDateValue = row[endDateKey];

        // Validate required fields
        if (!projectIdentifier || !buildingIdentifier || !activityName || !startDateValue || !endDateValue) {
          results.errors.push(`Row ${rowNum}: Missing required data`);
          results.failed++;
          continue;
        }

        // Find project by number or name
        const project = projects.find(p => 
          p.projectNumber.toLowerCase() === projectIdentifier.toLowerCase() ||
          p.name.toLowerCase().includes(projectIdentifier.toLowerCase())
        );

        if (!project) {
          results.errors.push(`Row ${rowNum}: Project "${projectIdentifier}" not found`);
          results.failed++;
          continue;
        }

        // Find building by designation or name within the project
        const building = buildings.find(b => 
          b.projectId === project.id && (
            b.designation.toLowerCase() === buildingIdentifier.toLowerCase() ||
            b.name.toLowerCase().includes(buildingIdentifier.toLowerCase())
          )
        );

        if (!building) {
          results.errors.push(`Row ${rowNum}: Building "${buildingIdentifier}" not found in project "${project.projectNumber}"`);
          results.failed++;
          continue;
        }

        // Normalize activity name
        const scopeInfo = normalizeActivityName(activityName);
        if (!scopeInfo) {
          results.errors.push(`Row ${rowNum}: Unknown activity "${activityName}"`);
          results.failed++;
          continue;
        }

        // Parse dates
        const startDate = parseDate(startDateValue);
        const endDate = parseDate(endDateValue);

        if (!startDate || !endDate) {
          results.errors.push(`Row ${rowNum}: Invalid date format`);
          results.failed++;
          continue;
        }

        if (startDate > endDate) {
          results.errors.push(`Row ${rowNum}: Start date must be before end date`);
          results.failed++;
          continue;
        }

        // Check if schedule already exists
        const existingSchedule = await prisma.scopeSchedule.findUnique({
          where: {
            buildingId_scopeType: {
              buildingId: building.id,
              scopeType: scopeInfo.id,
            },
          },
        });

        if (existingSchedule) {
          // Update existing schedule
          await prisma.scopeSchedule.update({
            where: { id: existingSchedule.id },
            data: {
              startDate,
              endDate,
              scopeLabel: scopeInfo.label,
            },
          });
        } else {
          // Create new schedule
          await prisma.scopeSchedule.create({
            data: {
              projectId: project.id,
              buildingId: building.id,
              scopeType: scopeInfo.id,
              scopeLabel: scopeInfo.label,
              startDate,
              endDate,
            },
          });
        }

        results.success++;
      } catch (error) {
        console.error(`Error processing row ${rowNum}:`, error);
        results.errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.failed++;
      }
    }

    return NextResponse.json({
      message: 'Import completed',
      results,
    });
  } catch (error) {
    console.error('Error importing schedules:', error);
    return NextResponse.json({ 
      error: 'Failed to import schedules', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
