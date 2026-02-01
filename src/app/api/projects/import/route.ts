/**
 * API Route: Import Projects from Excel
 * POST /api/projects/import
 * Uploads and imports projects and buildings from Excel file
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { parseExcelFileWithMapping, validateExcelData, validateExcelStructure, extractExcelColumns } from '@/lib/utils/excel-parser';
import { importProjectsFromExcel } from '@/lib/services/project-import.service';
import { fileUploadLimiter } from '@/lib/utils/rate-limiter';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = cookieStore.get(cookieName)?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has Admin or PMO role
    const userRole = session.role;
    if (userRole !== 'Admin' && userRole !== 'PMO') {
      return NextResponse.json(
        { error: 'Forbidden. Only Admin and PMO users can import projects.' },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimitResult = fileUploadLimiter.check(session.sub);
    if (!rateLimitResult.allowed) {
      const resetDate = new Date(rateLimitResult.resetTime);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `You have exceeded the upload limit. Please try again after ${resetDate.toLocaleString()}.`,
          resetTime: rateLimitResult.resetTime,
        },
        { status: 429 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          message: 'Only Excel files (.xlsx, .xls) are allowed',
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: `File size must not exceed ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step 1: Get field mappings from form data (if provided)
    const projectMappingsJson = formData.get('projectMappings') as string | null;
    const buildingMappingsJson = formData.get('buildingMappings') as string | null;
    
    const projectMappings = projectMappingsJson ? JSON.parse(projectMappingsJson) : undefined;
    const buildingMappings = buildingMappingsJson ? JSON.parse(buildingMappingsJson) : undefined;
    
    // Debug: Log the mappings received
    console.log('[Import API] Project mappings received:', JSON.stringify(projectMappings, null, 2));

    // Step 2: Validate Excel structure (skip if using custom mappings)
    if (!projectMappings && !buildingMappings) {
      const structureErrors = validateExcelStructure(buffer);
      if (structureErrors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid Excel structure',
            errors: structureErrors,
            warnings: [],
          },
          { status: 400 }
        );
      }
    }

    // Step 3: Parse Excel data with mappings
    let parsedData;
    try {
      parsedData = parseExcelFileWithMapping(buffer, projectMappings, buildingMappings);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse Excel file',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 400 }
      );
    }

    // Step 4: Validate data
    const validationResult = validateExcelData(parsedData);
    
    if (!validationResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          projectsCount: validationResult.projectsCount,
          buildingsCount: validationResult.buildingsCount,
        },
        { status: 400 }
      );
    }

    // Step 5: Import data to database
    const importResult = await importProjectsFromExcel(parsedData);

    if (!importResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Import failed',
          errors: importResult.errors,
          warnings: importResult.warnings,
          message: importResult.message,
        },
        { status: 500 }
      );
    }

    // Success response
    return NextResponse.json(
      {
        success: true,
        message: importResult.message,
        projectsCreated: importResult.projectsCreated,
        projectsUpdated: importResult.projectsUpdated,
        buildingsCreated: importResult.buildingsCreated,
        buildingsUpdated: importResult.buildingsUpdated,
        warnings: importResult.warnings,
        rateLimitRemaining: rateLimitResult.remaining,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
