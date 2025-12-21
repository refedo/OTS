import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

/**
 * POST /api/document-submissions/import
 * Import document submissions from CSV/Excel data with field mapping
 */
export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { data, mapping, projectId } = body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    if (!mapping) {
      return NextResponse.json({ error: 'Field mapping required' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, projectNumber: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get buildings for this project for matching
    const buildings = await prisma.building.findMany({
      where: { projectId },
      select: { id: true, designation: true, name: true },
    });

    // Get users for matching
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
    });

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Generate submission number
    const generateSubmissionNumber = async (): Promise<string> => {
      const year = new Date().getFullYear();
      const prefix = `DOC-${year}-`;
      
      const lastSubmission = await prisma.documentSubmission.findFirst({
        where: { submissionNumber: { startsWith: prefix } },
        orderBy: { submissionNumber: 'desc' },
      });

      let nextNumber = 1;
      if (lastSubmission) {
        const lastNumber = parseInt(lastSubmission.submissionNumber.split('-')[2]);
        nextNumber = lastNumber + 1;
      }

      return `${prefix}${String(nextNumber).padStart(4, '0')}`;
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row number (1-indexed + header)

      try {
        // Extract values using mapping
        const getValue = (field: string) => {
          const mappedColumn = mapping[field];
          if (!mappedColumn) return null;
          return row[mappedColumn] || null;
        };

        const title = getValue('title');
        const documentType = getValue('documentType') || 'Other';
        const section = getValue('section');
        const revision = getValue('revision') || 'R0';
        const submissionDateStr = getValue('submissionDate');
        const reviewDueDateStr = getValue('reviewDueDate');
        const approvalDateStr = getValue('approvalDate');
        const status = getValue('status') || 'In progress';
        const clientCode = getValue('clientCode');
        const clientResponse = getValue('clientResponse');
        const buildingDesignation = getValue('building');
        const handlerName = getValue('handler');
        const submitterName = getValue('submitter');

        if (!title) {
          results.skipped++;
          results.errors.push(`Row ${rowNum}: Missing title`);
          continue;
        }

        // Parse dates
        const parseDate = (dateStr: string | null): Date | null => {
          if (!dateStr) return null;
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? null : date;
        };

        const submissionDate = parseDate(submissionDateStr) || new Date();
        const reviewDueDate = parseDate(reviewDueDateStr);
        const approvalDate = parseDate(approvalDateStr);

        // Match building
        let buildingId: string | null = null;
        if (buildingDesignation) {
          const building = buildings.find(
            b => b.designation?.toLowerCase() === buildingDesignation.toLowerCase() ||
                 b.name?.toLowerCase() === buildingDesignation.toLowerCase()
          );
          if (building) {
            buildingId = building.id;
          }
        }

        // Match handler
        let handledById: string | null = null;
        if (handlerName) {
          const handler = users.find(
            u => u.name?.toLowerCase() === handlerName.toLowerCase() ||
                 u.email?.toLowerCase() === handlerName.toLowerCase()
          );
          if (handler) {
            handledById = handler.id;
          }
        }

        // Match submitter or use current user
        let submitterId = session.sub;
        if (submitterName) {
          const submitter = users.find(
            u => u.name?.toLowerCase() === submitterName.toLowerCase() ||
                 u.email?.toLowerCase() === submitterName.toLowerCase()
          );
          if (submitter) {
            submitterId = submitter.id;
          }
        }

        // Generate submission number
        const submissionNumber = await generateSubmissionNumber();

        // Create document submission
        await prisma.documentSubmission.create({
          data: {
            submissionNumber,
            projectId,
            buildingId,
            documentType,
            section,
            title,
            revision,
            submissionDate,
            reviewDueDate,
            approvalDate,
            status,
            clientCode,
            clientResponse,
            submitterId,
            handledBy: handledById,
          },
        });

        results.imported++;
      } catch (error) {
        results.errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Imported ${results.imported} document(s), skipped ${results.skipped}`,
    });
  } catch (error) {
    console.error('Error importing document submissions:', error);
    return NextResponse.json({
      error: 'Failed to import document submissions',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
