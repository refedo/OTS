import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { z } from 'zod';
import { WorkUnitSyncService } from '@/lib/services/work-unit-sync.service';

const updateSchema = z.object({
  status: z.string().optional(),
  revision: z.string().optional(),
  title: z.string().optional(),
  clientResponse: z.string().optional().nullable(),
  clientComments: z.string().optional().nullable(),
  clientResponseDate: z.string().optional().nullable(),
  approvalDate: z.string().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
  internalComments: z.string().optional().nullable(),
  clientCode: z.string().optional().nullable(),
  daysCount: z.number().optional().nullable(),
});

// GET - Get single document submission
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const submission = await db.documentSubmission.findUnique({
      where: { id: params.id },
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
          include: {
            submitter: {
              select: {
                id: true,
                name: true,
              },
            },
            handler: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { submissionDate: 'asc' },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Document submission not found' }, { status: 404 });
    }

    return NextResponse.json(submission);
  } catch (error) {
    console.error('Error fetching document submission:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document submission' },
      { status: 500 }
    );
  }
}

// PATCH - Update document submission
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: any = {};
  let updateData: any = {};
  
  try {
    const token = request.cookies.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    body = await request.json();
    const validated = updateSchema.parse(body);
    if (validated.status) updateData.status = validated.status;
    if (validated.revision) updateData.revision = validated.revision;
    if (validated.title) updateData.title = validated.title;
    if (validated.clientResponse !== undefined) updateData.clientResponse = validated.clientResponse;
    if (validated.clientComments !== undefined) updateData.clientComments = validated.clientComments;
    if (validated.clientResponseDate) updateData.clientResponseDate = new Date(validated.clientResponseDate);
    if (validated.approvalDate) updateData.approvalDate = new Date(validated.approvalDate);
    if (validated.rejectionReason !== undefined) updateData.rejectionReason = validated.rejectionReason;
    if (validated.internalComments !== undefined) updateData.internalComments = validated.internalComments;
    if (validated.clientCode !== undefined) updateData.clientCode = validated.clientCode;
    if (validated.daysCount !== undefined) updateData.daysCount = validated.daysCount;

    const submission = await db.documentSubmission.update({
      where: { id: params.id },
      data: updateData,
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

    // Sync WorkUnit status if status was updated (non-blocking)
    if (validated.status) {
      WorkUnitSyncService.syncDocumentSubmissionStatusUpdate(params.id, validated.status).catch((err) => {
        console.error('WorkUnit status sync failed:', err);
      });
    }

    return NextResponse.json(submission);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating document submission:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      body: body,
      updateData: updateData
    });
    return NextResponse.json(
      { 
        error: 'Failed to update document submission',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete document submission
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if submission exists
    const submission = await db.documentSubmission.findUnique({
      where: { id: params.id },
      select: { id: true, submissionNumber: true },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Document submission not found' }, { status: 404 });
    }

    // Only Admin and Manager can delete
    if (!['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'Only Admin and Manager roles can delete submissions' 
      }, { status: 403 });
    }

    // Delete the submission (cascade will delete revisions)
    await db.documentSubmission.delete({
      where: { id: params.id },
    });

    console.log(`Document submission ${submission.submissionNumber} deleted by ${session.name}`);

    return NextResponse.json({ 
      message: 'Document submission deleted successfully',
      submissionNumber: submission.submissionNumber
    });
  } catch (error) {
    console.error('Error deleting document submission:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { 
        error: 'Failed to delete document submission',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
