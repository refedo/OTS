import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { z } from 'zod';

const revisionSchema = z.object({
  revision: z.string().min(1),
  submissionDate: z.string(),
  status: z.string(),
  handledBy: z.string().uuid().optional().nullable(),
  documentType: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
  clientCode: z.string().optional().nullable(),
  clientResponse: z.string().optional().nullable(),
  clientComments: z.string().optional().nullable(),
  approvalDate: z.string().optional().nullable(),
});

// POST - Create new revision
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received revision body:', body);
    
    const validated = revisionSchema.parse(body);
    console.log('Validated revision data:', validated);

    // Ensure session.sub (user ID) exists
    if (!session.sub) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 401 }
      );
    }

    const revision = await db.documentRevision.create({
      data: {
        revision: validated.revision,
        submissionDate: new Date(validated.submissionDate),
        status: validated.status,
        documentType: validated.documentType || null,
        comments: validated.comments || null,
        clientCode: validated.clientCode || null,
        clientResponse: validated.clientResponse || null,
        clientComments: validated.clientComments || null,
        approvalDate: validated.approvalDate ? new Date(validated.approvalDate) : null,
        submission: {
          connect: { id: params.id }
        },
        submitter: {
          connect: { id: session.sub }
        },
        handler: validated.handledBy ? {
          connect: { id: validated.handledBy }
        } : undefined,
      },
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

    // Don't update main submission - keep original revision and title

    return NextResponse.json(revision, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating revision:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { 
        error: 'Failed to create revision',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
