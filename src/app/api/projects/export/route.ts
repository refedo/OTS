/**
 * API Route: Export All Projects
 * GET /api/projects/export
 * Downloads all projects and buildings as Excel file
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateProjectExcel } from '@/lib/utils/excel-generator';
import { getAllProjectsForExport } from '@/lib/services/project-import.service';
import { verifySession } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
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
        { error: 'Forbidden. Only Admin and PMO users can export projects.' },
        { status: 403 }
      );
    }

    // Fetch all projects with buildings
    const projects = await getAllProjectsForExport();

    if (projects.length === 0) {
      return NextResponse.json(
        { error: 'No projects found to export' },
        { status: 404 }
      );
    }

    // Generate Excel file
    const buffer = generateProjectExcel(projects);

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `OTS_Projects_Export_${timestamp}.xlsx`;

    // Return file
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      {
        error: 'Failed to export projects',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
