import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const updateActivitySchema = z.object({
  activityDescription: z.string().min(1).optional(),
  section: z.string().optional(),
  referenceDocument: z.string().optional().nullable(),
  acceptanceCriteria: z.string().optional().nullable(),
  verifyingDocument: z.string().optional().nullable(),
  activityByManuf: z.string().optional().nullable(),
  activityByTPI: z.string().optional().nullable(),
  activityByClient: z.string().optional().nullable(),
  remark: z.string().optional().nullable(),
  // Legacy fields
  inspectionType: z.string().optional().nullable(),
  reportsReference: z.string().optional().nullable(),
  signAId: z.string().uuid().optional().nullable(),
  signBId: z.string().uuid().optional().nullable(),
  signCId: z.string().uuid().optional().nullable(),
  status: z.enum(['Pending', 'Completed']).optional(),
  sequence: z.number().int().min(0).optional(),
  completedDate: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; activityId: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session || !['Admin', 'Manager', 'Engineer'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateActivitySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const updateData: any = { ...parsed.data };
    if (parsed.data.completedDate) {
      updateData.completedDate = new Date(parsed.data.completedDate);
    }

    const activity = await prisma.iTPActivity.update({
      where: { id: params.activityId },
      data: updateData,
      include: {
        signA: {
          select: { id: true, name: true },
        },
        signB: {
          select: { id: true, name: true },
        },
        signC: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error updating ITP activity:', error);
    return NextResponse.json({ 
      error: 'Failed to update activity', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; activityId: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session || !['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.iTPActivity.delete({
      where: { id: params.activityId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ITP activity:', error);
    return NextResponse.json({ 
      error: 'Failed to delete activity', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
