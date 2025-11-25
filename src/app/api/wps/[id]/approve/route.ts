import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const approvalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    // Only QC Managers and Admins can approve WPS
    if (!session || !['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = approvalSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const { action, rejectionReason } = parsed.data;

    const updateData: any = {
      approvedById: action === 'approve' ? session.sub : null,
      status: action === 'approve' ? 'Approved' : 'Draft',
      dateIssued: action === 'approve' ? new Date() : null,
    };

    if (action === 'reject' && rejectionReason) {
      updateData.remarks = rejectionReason;
    }

    const wps = await prisma.wPS.update({
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
        preparedBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(wps);
  } catch (error) {
    console.error('Error approving WPS:', error);
    return NextResponse.json({ 
      error: 'Failed to process approval', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
