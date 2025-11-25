import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const approveSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject']),
  clientApprovedBy: z.string().optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = approveSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const itp = await prisma.iTP.findUnique({
      where: { id: params.id },
    });

    if (!itp) {
      return NextResponse.json({ error: 'ITP not found' }, { status: 404 });
    }

    let updateData: any = {};

    switch (parsed.data.action) {
      case 'submit':
        // Engineer submits for review
        if (!['Admin', 'Manager', 'Engineer'].includes(session.role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        updateData = {
          status: 'Under Review',
        };
        break;

      case 'approve':
        // Manager/QC Manager approves
        if (!['Admin', 'Manager'].includes(session.role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        updateData = {
          status: 'Approved',
          approvedById: session.sub,
          dateApproved: new Date(),
          ...(parsed.data.clientApprovedBy && { 
            clientApprovedBy: parsed.data.clientApprovedBy 
          }),
        };
        break;

      case 'reject':
        // Manager can reject
        if (!['Admin', 'Manager'].includes(session.role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        updateData = {
          status: 'Rejected',
        };
        break;
    }

    const updatedITP = await prisma.iTP.update({
      where: { id: params.id },
      data: updateData,
      include: {
        project: true,
        createdBy: true,
        approvedBy: true,
        activities: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    return NextResponse.json(updatedITP);
  } catch (error) {
    console.error('Error processing ITP approval:', error);
    return NextResponse.json({ 
      error: 'Failed to process approval', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
