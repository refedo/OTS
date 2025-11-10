import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const updateSchema = z.object({
  itpNumber: z.string().min(1).optional(),
  revision: z.number().int().min(0).optional(),
  type: z.enum(['STANDARD', 'CUSTOM']).optional(),
  jobNo: z.string().optional().nullable(),
  client: z.string().optional().nullable(),
  applicableCodes: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  status: z.enum(['Draft', 'Under Review', 'Approved', 'Rejected']).optional(),
  approvedById: z.string().uuid().optional().nullable(),
  clientApprovedBy: z.string().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
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

    const itp = await prisma.iTP.findUnique({
      where: { id: params.id },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
            client: {
              select: { id: true, name: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        activities: {
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
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!itp) {
      return NextResponse.json({ error: 'ITP not found' }, { status: 404 });
    }

    return NextResponse.json(itp);
  } catch (error) {
    console.error('Error fetching ITP:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch ITP', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function PATCH(
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
    const parsed = updateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const itp = await prisma.iTP.update({
      where: { id: params.id },
      data: parsed.data,
      include: {
        project: true,
        createdBy: true,
        approvedBy: true,
        activities: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    return NextResponse.json(itp);
  } catch (error) {
    console.error('Error updating ITP:', error);
    return NextResponse.json({ 
      error: 'Failed to update ITP', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    // Only Admins can delete ITPs
    if (!session || session.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.iTP.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ITP:', error);
    return NextResponse.json({ 
      error: 'Failed to delete ITP', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
