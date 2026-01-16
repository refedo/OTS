import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const activitySchema = z.object({
  activityDescription: z.string().min(1),
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
  sequence: z.number().int().min(0),
});

export async function GET(
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

    const activities = await prisma.iTPActivity.findMany({
      where: { itpId: params.id },
      include: {
        signA: {
          select: { id: true, name: true, email: true },
        },
        signB: {
          select: { id: true, name: true, email: true },
        },
        signC: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { sequence: 'asc' },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching ITP activities:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch activities', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session || !['Admin', 'Manager', 'Engineer'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = activitySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const activity = await prisma.iTPActivity.create({
      data: {
        ...parsed.data,
        itpId: params.id,
      },
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

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error('Error creating ITP activity:', error);
    return NextResponse.json({ 
      error: 'Failed to create activity', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
