import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { z } from 'zod';
import { WorkUnitSyncService } from '@/lib/services/work-unit-sync.service';

const documentSubmissionSchema = z.object({
  projectId: z.string().uuid(),
  buildingId: z.string().uuid().optional().nullable(),
  documentType: z.string().min(1),
  section: z.string().optional().nullable(),
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  revision: z.string().default('R0'),
  handledBy: z.string().uuid().optional().nullable(),
  submissionDate: z.string(),
  reviewDueDate: z.string().optional().nullable(),
  status: z.string(),
  clientCode: z.string().optional().nullable(),
  clientResponseDate: z.string().optional().nullable(),
  internalComments: z.string().optional().nullable(),
});

// GET - List all document submissions with filters
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const buildingId = searchParams.get('buildingId');
    const documentType = searchParams.get('documentType');
    const status = searchParams.get('status');

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (buildingId) where.buildingId = buildingId;
    if (documentType) where.documentType = documentType;
    if (status) where.status = status;

    const submissions = await db.documentSubmission.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
          },
        },
        building: {
          select: {
            id: true,
            designation: true,
            name: true,
          },
        },
        handler: {
          select: {
            id: true,
            name: true,
            position: true,
          },
        },
        submitter: {
          select: {
            id: true,
            name: true,
            position: true,
          },
        },
        revisions: {
          orderBy: { submissionDate: 'desc' },
          take: 5,
        },
      },
      orderBy: { submissionDate: 'desc' },
    });

    // Serialize dates to ISO strings
    const serialized = submissions.map(s => ({
      ...s,
      submissionDate: s.submissionDate.toISOString(),
      reviewDueDate: s.reviewDueDate?.toISOString() || null,
      approvalDate: s.approvalDate?.toISOString() || null,
      clientResponseDate: s.clientResponseDate?.toISOString() || null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      revisions: s.revisions.map(r => ({
        ...r,
        submissionDate: r.submissionDate.toISOString(),
        approvalDate: r.approvalDate?.toISOString() || null,
        createdAt: r.createdAt.toISOString(),
      })),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Error fetching document submissions:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { 
        error: 'Failed to fetch document submissions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new document submission
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received body:', body);
    
    const validated = documentSubmissionSchema.parse(body);
    console.log('Validated data:', validated);

    // Generate submission number
    const year = new Date().getFullYear();
    const count = await db.documentSubmission.count({
      where: {
        submissionNumber: {
          startsWith: `DOC-${year}-`,
        },
      },
    });
    const submissionNumber = `DOC-${year}-${String(count + 1).padStart(3, '0')}`;

    // Ensure session.sub (user ID) exists
    if (!session.sub) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 401 }
      );
    }

    const submission = await db.documentSubmission.create({
      data: {
        submissionNumber,
        documentType: validated.documentType,
        section: validated.section || null,
        title: validated.title || '',
        description: validated.description || null,
        revision: validated.revision || 'R0',
        submissionDate: new Date(validated.submissionDate),
        reviewDueDate: validated.reviewDueDate ? new Date(validated.reviewDueDate) : null,
        status: validated.status,
        clientCode: validated.clientCode || null,
        clientResponseDate: validated.clientResponseDate ? new Date(validated.clientResponseDate) : null,
        internalComments: validated.internalComments || null,
        project: {
          connect: { id: validated.projectId }
        },
        building: validated.buildingId ? {
          connect: { id: validated.buildingId }
        } : undefined,
        handler: validated.handledBy ? {
          connect: { id: validated.handledBy }
        } : undefined,
        submitter: {
          connect: { id: session.sub }
        },
      },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
          },
        },
        building: {
          select: {
            id: true,
            designation: true,
            name: true,
          },
        },
        handler: {
          select: {
            id: true,
            name: true,
          },
        },
        submitter: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Sync to WorkUnit for Operations Control (non-blocking)
    WorkUnitSyncService.syncFromDocumentSubmission({
      id: submission.id,
      projectId: validated.projectId,
      submitterId: session.sub,
      handledBy: validated.handledBy || null,
      submissionDate: new Date(validated.submissionDate),
      reviewDueDate: validated.reviewDueDate ? new Date(validated.reviewDueDate) : null,
      status: validated.status,
    }).catch((err) => {
      console.error('WorkUnit sync failed:', err);
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating document submission:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create document submission',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );
  }
}
