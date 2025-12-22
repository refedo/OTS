import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  summary: z.string().min(10).optional(),
  rootCause: z.string().optional().nullable(),
  resolution: z.string().optional().nullable(),
  recommendation: z.string().optional().nullable(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  status: z.enum(['Open', 'InProgress', 'PendingValidation', 'Validated', 'Archived']).optional(),
  process: z.enum(['Design', 'Detailing', 'Procurement', 'Production', 'QC', 'Erection']).optional(),
  projectId: z.string().uuid().optional().nullable(),
  buildingId: z.string().uuid().optional().nullable(),
  workUnitId: z.string().uuid().optional().nullable(),
  evidenceLinks: z.array(z.object({
    type: z.string(),
    id: z.string(),
    label: z.string()
  })).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const entry = await prisma.knowledgeEntry.findUnique({
      where: { id },
      include: {
        reportedBy: {
          select: { id: true, name: true, email: true, position: true }
        },
        owner: {
          select: { id: true, name: true, email: true, position: true }
        },
        validatedBy: {
          select: { id: true, name: true, email: true, position: true }
        },
        project: {
          select: { id: true, name: true, projectNumber: true }
        },
        building: {
          select: { id: true, name: true, designation: true }
        },
        workUnit: {
          select: { id: true, type: true, referenceModule: true }
        },
        promotedFromIssue: {
          select: { id: true, title: true, type: true }
        },
        applications: {
          include: {
            project: {
              select: { id: true, name: true, projectNumber: true }
            },
            appliedBy: {
              select: { id: true, name: true }
            }
          },
          orderBy: { appliedAt: 'desc' }
        }
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Knowledge entry not found' }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error fetching knowledge entry:', error);
    return NextResponse.json({ error: 'Failed to fetch knowledge entry' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const validated = updateSchema.parse(body);

    const existingEntry = await prisma.knowledgeEntry.findUnique({
      where: { id },
      select: { reportedById: true, ownerId: true, status: true }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Knowledge entry not found' }, { status: 404 });
    }

    const isOwner = existingEntry.reportedById === session.sub || existingEntry.ownerId === session.sub;
    const isSupervisorOrAbove = ['Supervisor', 'Manager', 'Admin', 'CEO'].includes(session.role);

    if (!isOwner && !isSupervisorOrAbove) {
      return NextResponse.json({ error: 'Unauthorized to update this entry' }, { status: 403 });
    }

    const updateData: any = { ...validated };

    if (validated.status === 'Validated' && !isSupervisorOrAbove) {
      return NextResponse.json({ error: 'Only Supervisor or above can validate entries' }, { status: 403 });
    }

    if (validated.status === 'Validated' && existingEntry.status !== 'Validated') {
      updateData.validatedById = session.sub;
      updateData.validatedAt = new Date();
    }

    const entry = await prisma.knowledgeEntry.update({
      where: { id },
      data: updateData,
      include: {
        reportedBy: {
          select: { id: true, name: true, email: true }
        },
        owner: {
          select: { id: true, name: true, email: true }
        },
        validatedBy: {
          select: { id: true, name: true, email: true }
        },
        project: {
          select: { id: true, name: true, projectNumber: true }
        },
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error updating knowledge entry:', error);
    return NextResponse.json({ error: 'Failed to update knowledge entry' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const existingEntry = await prisma.knowledgeEntry.findUnique({
      where: { id },
      select: { reportedById: true }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Knowledge entry not found' }, { status: 404 });
    }

    const isOwner = existingEntry.reportedById === session.sub;
    const isAdmin = ['Admin', 'CEO'].includes(session.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized to delete this entry' }, { status: 403 });
    }

    await prisma.knowledgeEntry.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Knowledge entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting knowledge entry:', error);
    return NextResponse.json({ error: 'Failed to delete knowledge entry' }, { status: 500 });
  }
}
