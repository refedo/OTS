import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { systemEventService } from '@/services/system-events.service';

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: z.enum(['System', 'Process', 'Service', 'Safety', 'Environmental']).optional(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']).optional(),
  deadline: z.string().datetime().optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  rootCause: z.string().optional().nullable(),
  correctiveAction: z.string().optional().nullable(),
  preventiveAction: z.string().optional().nullable(),
  caVerificationMethod: z.string().optional().nullable(),
  caEffectivenessRating: z.enum(['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE']).optional().nullable(),
  caResponsibleId: z.string().uuid().optional().nullable(),
  caTargetDate: z.string().datetime().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const ncr = await prisma.imsNcr.findUnique({
      where: { id },
      include: {
        raisedBy:     { select: { id: true, name: true, email: true } },
        assignedTo:   { select: { id: true, name: true, email: true } },
        closedBy:     { select: { id: true, name: true, email: true } },
        caResponsible:{ select: { id: true, name: true } },
        auditFinding: { select: { id: true, findingNumber: true, type: true, clause: true, description: true } },
      },
    });

    if (!ncr) return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    return NextResponse.json(ncr);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS NCR');
    return NextResponse.json({ error: 'Failed to fetch NCR' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.severity !== undefined) updateData.severity = data.severity;
    if (data.deadline !== undefined) updateData.deadline = new Date(data.deadline);
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
    if (data.rootCause !== undefined) updateData.rootCause = data.rootCause;
    if (data.correctiveAction !== undefined) updateData.correctiveAction = data.correctiveAction;
    if (data.preventiveAction !== undefined) updateData.preventiveAction = data.preventiveAction;
    if (data.caVerificationMethod !== undefined) updateData.caVerificationMethod = data.caVerificationMethod;
    if (data.caEffectivenessRating !== undefined) updateData.caEffectivenessRating = data.caEffectivenessRating;
    if (data.caResponsibleId !== undefined) updateData.caResponsibleId = data.caResponsibleId;
    if (data.caTargetDate !== undefined) updateData.caTargetDate = data.caTargetDate ? new Date(data.caTargetDate) : null;

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'CLOSED') {
        updateData.closedAt = new Date();
        updateData.closedById = session.sub;
      }
    }

    const ncr = await prisma.imsNcr.update({
      where: { id },
      data: updateData,
      include: {
        raisedBy:     { select: { id: true, name: true, email: true } },
        assignedTo:   { select: { id: true, name: true, email: true } },
        closedBy:     { select: { id: true, name: true, email: true } },
        caResponsible:{ select: { id: true, name: true } },
      },
    });

    if (data.status) {
      systemEventService.log({
        eventType: 'IMS_NCR_STATUS_CHANGED',
        eventCategory: 'IMS',
        userId: session.sub,
        userName: session.name,
        entityType: 'ImsNcr',
        entityId: ncr.id,
        entityName: ncr.ncrNumber,
        summary: `QA NCR ${ncr.ncrNumber} status changed to ${data.status}`,
        details: { status: data.status },
      });
    }

    return NextResponse.json(ncr);
  } catch (error) {
    logger.error({ error }, 'Failed to update IMS NCR');
    return NextResponse.json({ error: 'Failed to update NCR' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.imsNcr.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete IMS NCR');
    return NextResponse.json({ error: 'Failed to delete NCR' }, { status: 500 });
  }
}
