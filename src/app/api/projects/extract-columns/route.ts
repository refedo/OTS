/**
 * API Route: Extract Excel Columns
 * POST /api/projects/extract-columns
 * Extracts column headers from uploaded Excel file for field mapping
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { extractExcelColumns } from '@/lib/utils/excel-parser';

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
        { error: 'Forbidden. Only Admin and PMO users can extract columns.' },
        { status: 403 }
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

    // Extract columns
    try {
      const columns = extractExcelColumns(buffer);
      
      console.log('Extracted columns:', columns);
      
      // Validate that we got columns
      if (!columns.projects || columns.projects.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No columns found',
            message: 'The Projects sheet appears to be empty or has no header row',
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        columns,
      });
    } catch (error) {
      console.error('Extract columns error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to extract columns',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Extract columns error:', error);
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
