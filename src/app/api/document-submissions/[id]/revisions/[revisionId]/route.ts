import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { z } from 'zod';

const updateRevisionSchema = z.object({
  status: z.string().optional(),
  clientCode: z.string().optional().nullable(),
  approvalDate: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
  clientResponse: z.string().optional().nullable(),
  clientComments: z.string().optional().nullable(),
});

// PATCH - Update a revision
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; revisionId: string } }
) {
  try {
    const token = request.cookies.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateRevisionSchema.parse(body);

    const updateData: any = {};
    if (validated.status) updateData.status = validated.status;
    if (validated.clientCode !== undefined) updateData.clientCode = validated.clientCode;
    if (validated.approvalDate) updateData.approvalDate = new Date(validated.approvalDate);
    if (validated.comments !== undefined) updateData.comments = validated.comments;
    if (validated.clientResponse !== undefined) updateData.clientResponse = validated.clientResponse;
    if (validated.clientComments !== undefined) updateData.clientComments = validated.clientComments;

    const revision = await db.documentRevision.update({
      where: { id: params.revisionId },
      data: updateData,
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
    });

    return NextResponse.json(revision);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating revision:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { 
        error: 'Failed to update revision',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a revision
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; revisionId: string } }
) {
  try {
    const token = request.cookies.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if revision exists
    const revision = await db.documentRevision.findUnique({
      where: { id: params.revisionId },
      select: { id: true, revision: true },
    });

    if (!revision) {
      return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
    }

    // Only Admin and Manager can delete
    if (!['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'Only Admin and Manager roles can delete revisions' 
      }, { status: 403 });
    }

    // Delete the revision
    await db.documentRevision.delete({
      where: { id: params.revisionId },
    });

    console.log(`Revision ${revision.revision} deleted by ${session.name}`);

    return NextResponse.json({ 
      message: 'Revision deleted successfully',
      revision: revision.revision
    });
  } catch (error) {
    console.error('Error deleting revision:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { 
        error: 'Failed to delete revision',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
