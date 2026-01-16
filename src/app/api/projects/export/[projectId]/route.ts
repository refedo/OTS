/**
 * API Route: Export Single Project
 * GET /api/projects/export/[projectId]
 * Downloads a single project and its buildings as Excel file
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateProjectExcel } from '@/lib/utils/excel-generator';
import { getProjectForExport } from '@/lib/services/project-import.service';
import { verifySession } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
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

    const { projectId } = await params;

    // Fetch project with buildings
    const project = await getProjectForExport(projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Generate Excel file
    const buffer = generateProjectExcel([project]);

    // Create filename with project number
    const filename = `OTS_Project_${project.projectNumber}_Export.xlsx`;

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
        error: 'Failed to export project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
