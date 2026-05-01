import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import { z } from 'zod';

const CAPatchSchema = z.object({
  caRequired: z.boolean().optional(),
  caRootCause: z.string().optional().nullable(),
  caAction: z.string().optional().nullable(),
  caVerificationMethod: z.string().optional().nullable(),
  caEffectivenessRating: z.enum(['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE']).optional().nullable(),
  caResponsibleId: z.string().uuid().optional().nullable(),
  caTargetDate: z.string().datetime().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const ncr = await prisma.nCRReport.findUnique({
      where: { id },
      select: {
        id: true,
        ncrNumber: true,
        status: true,
        caRequired: true,
        caRootCause: true,
        caAction: true,
        caVerificationMethod: true,
        caEffectivenessRating: true,
        caClosedAt: true,
        caResponsibleId: true,
        caTargetDate: true,
        caWorkflowInstanceId: true,
        caResponsible: { select: { id: true, name: true } },
      },
    });

    if (!ncr) return NextResponse.json({ error: 'NCR not found' }, { status: 404 });

    // Fetch workflow instance if linked
    let workflowInstance = null;
    if (ncr.caWorkflowInstanceId) {
      workflowInstance = await prisma.workflowInstance.findUnique({
        where: { id: ncr.caWorkflowInstanceId },
        include: {
          definition: { select: { key: true, name: true } },
          initiatedBy: { select: { id: true, name: true } },
          stepInstances: {
            include: {
              step: true,
              approvals: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
            orderBy: { sequence: 'asc' },
          },
        },
      });
    }

    return NextResponse.json({ ...ncr, workflowInstance });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch NCR CA data');
    return NextResponse.json({ error: 'Failed to fetch CA data' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const parsed = CAPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const updated = await prisma.nCRReport.update({
      where: { id },
      data: {
        ...(data.caRequired !== undefined && { caRequired: data.caRequired }),
        ...(data.caRootCause !== undefined && { caRootCause: data.caRootCause }),
        ...(data.caAction !== undefined && { caAction: data.caAction }),
        ...(data.caVerificationMethod !== undefined && { caVerificationMethod: data.caVerificationMethod }),
        ...(data.caEffectivenessRating !== undefined && { caEffectivenessRating: data.caEffectivenessRating }),
        ...(data.caResponsibleId !== undefined && { caResponsibleId: data.caResponsibleId }),
        ...(data.caTargetDate !== undefined && {
          caTargetDate: data.caTargetDate ? new Date(data.caTargetDate) : null,
        }),
      },
    });

    systemEventService.log({
      eventType: 'QC_NCR_CA_UPDATED',
      eventCategory: 'QC',
      userId: session.sub,
      userName: session.name,
      entityType: 'NCRReport',
      entityId: id,
      entityName: updated.ncrNumber,
      summary: `Corrective action fields updated for NCR ${updated.ncrNumber}`,
      details: { ...data },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update NCR CA fields');
    return NextResponse.json({ error: 'Failed to update CA fields' }, { status: 500 });
  }
}
