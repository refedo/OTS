import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, mapping } = await req.json();

    console.log('[Document Import Multi] Starting multi-project import');
    console.log('[Document Import Multi] Total rows:', data.length);

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Extract mapped values
        const projectNumber = mapping.projectNumber ? row[mapping.projectNumber]?.trim() : null;
        const buildingName = mapping.buildingName ? row[mapping.buildingName]?.trim() : null;
        const title = mapping.title ? row[mapping.title]?.trim() : null;

        if (!projectNumber || !buildingName || !title) {
          results.errors.push(`Row ${i + 1}: Missing required fields (Project Number, Building Name, or Title)`);
          results.skipped++;
          continue;
        }

        // Find project by project number
        const project = await prisma.project.findFirst({
          where: { projectNumber: projectNumber },
        });

        if (!project) {
          results.errors.push(`Row ${i + 1}: Project "${projectNumber}" not found`);
          results.skipped++;
          continue;
        }

        // Find building by name within the project
        const building = await prisma.building.findFirst({
          where: {
            projectId: project.id,
            OR: [
              { name: buildingName },
              { designation: buildingName },
            ],
          },
        });

        if (!building) {
          results.errors.push(`Row ${i + 1}: Building "${buildingName}" not found in project "${projectNumber}"`);
          results.skipped++;
          continue;
        }

        // Generate submission number
        const lastSubmission = await prisma.documentSubmission.findFirst({
          where: { projectId: project.id },
          orderBy: { submissionNumber: 'desc' },
        });

        const nextNumber = lastSubmission
          ? parseInt(lastSubmission.submissionNumber.split('-').pop() || '0') + 1
          : 1;
        const submissionNumber = `${project.projectNumber}-DOC-${String(nextNumber).padStart(4, '0')}`;

        // Parse dates
        const parseDate = (dateStr: string | null | undefined): Date | null => {
          if (!dateStr) return null;
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? null : date;
        };

        // Create document submission
        await prisma.documentSubmission.create({
          data: {
            submissionNumber,
            projectId: project.id,
            buildingId: building.id,
            title,
            documentType: mapping.documentType ? row[mapping.documentType]?.trim() || 'General' : 'General',
            section: mapping.section ? row[mapping.section]?.trim() || null : null,
            revision: mapping.revision ? row[mapping.revision]?.trim() || 'A' : 'A',
            submissionDate: mapping.submissionDate ? parseDate(row[mapping.submissionDate]) || new Date() : new Date(),
            reviewDueDate: mapping.reviewDueDate ? parseDate(row[mapping.reviewDueDate]) : null,
            approvalDate: mapping.approvalDate ? parseDate(row[mapping.approvalDate]) : null,
            status: mapping.status ? row[mapping.status]?.trim() || 'Pending' : 'Pending',
            clientCode: mapping.clientCode ? row[mapping.clientCode]?.trim() || null : null,
            clientResponse: mapping.clientResponse ? row[mapping.clientResponse]?.trim() || null : null,
            handledBy: mapping.handler ? row[mapping.handler]?.trim() || null : null,
            submittedBy: mapping.submitter ? row[mapping.submitter]?.trim() || null : null,
          },
        });

        results.imported++;
      } catch (error) {
        console.error(`[Document Import Multi] Error processing row ${i + 1}:`, error);
        results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.skipped++;
      }
    }

    console.log('[Document Import Multi] Import complete:', results);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[Document Import Multi] Import failed:', error);
    return NextResponse.json(
      { error: 'Import failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
