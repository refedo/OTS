import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const approvalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  comments: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    // Only Managers and Admins can approve documents
    if (!session || !['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden - Only Managers and Admins can approve documents' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = approvalSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const { action } = parsed.data;

    const updateData: any = {
      approvedById: action === 'approve' ? session.sub : null,
      status: action === 'approve' ? 'Approved' : 'Draft',
    };

    if (action === 'approve') {
      updateData.effectiveDate = new Date();
    }

    const document = await prisma.document.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true },
        },
        uploadedBy: {
          select: { id: true, name: true },
        },
        approvedBy: {
          select: { id: true, name: true, position: true },
        },
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error approving document:', error);
    return NextResponse.json({ 
      error: 'Failed to approve document', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
