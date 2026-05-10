import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import { z } from 'zod';

const UpdateRowSchema = z.object({
  result: z.enum(['Conforming', 'Non-Conforming', 'OFI', 'Observation', 'N/A']).optional().nullable(),
  evidence: z.string().optional().nullable(),
  attachmentUrl: z.string().url().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

async function generateNcrNumber(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const count = await prisma.imsNcr.count();
  const seq = (count + 1).toString().padStart(3, '0');
  return `QA-NCR-${yy}${mm}-${seq}`;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ auditId: string; rowId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { auditId, rowId } = await params;
    const body = await req.json();
    const parsed = UpdateRowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Update the row
    const row = await prisma.imsAuditChecklistRow.update({
      where: { id: rowId },
      data: {
        result: data.result ?? undefined,
        evidence: data.evidence ?? undefined,
        attachmentUrl: data.attachmentUrl ?? undefined,
      },
    });

    // Auto-create NCR for Non-Conforming result
    if (data.result === 'Non-Conforming') {
      try {
        const audit = await prisma.imsAudit.findUnique({
          where: { id: auditId },
          select: { id: true, auditNumber: true },
        });

        const ncrNumber = await generateNcrNumber();
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 30);

        const ncr = await prisma.imsNcr.create({
          data: {
            ncrNumber,
            title: `NC: ${row.questionText.slice(0, 240)}`,
            description: data.evidence || row.questionText,
            auditId: audit?.id ?? auditId,
            auditNumber: audit?.auditNumber ?? undefined,
            status: 'OPEN',
            deadline,
            raisedById: session.sub,
          },
          select: { id: true, ncrNumber: true },
        });

        systemEventService.log({
          eventType: 'IMS_NCR_CREATED',
          eventCategory: 'IMS',
          userId: session.sub,
          userName: session.name,
          entityType: 'ImsNcr',
          entityId: ncr.id,
          entityName: ncr.ncrNumber,
          summary: `NCR ${ncr.ncrNumber} auto-created from checklist row result`,
          details: { rowId, auditId, ncrNumber: ncr.ncrNumber },
        });

        return NextResponse.json({ row, ncr });
      } catch (ncrError) {
        logger.error({ error: ncrError }, 'Failed to auto-create NCR from checklist row');
        // Return the updated row even if NCR creation fails
        return NextResponse.json({ row, ncrError: 'NCR auto-creation failed' });
      }
    }

    // Auto-create OFI Entry for OFI or Observation result
    if (data.result === 'OFI' || data.result === 'Observation') {
      try {
        const audit = await prisma.imsAudit.findUnique({
          where: { id: auditId },
          select: {
            id: true,
            auditNumber: true,
            scope: true,
          },
        });

        const existingOfiCount = await prisma.imsOfiEntry.count({
          where: { auditId },
        });

        const findingNumber = `${audit?.auditNumber ?? auditId}-OFI-${(existingOfiCount + 1).toString().padStart(3, '0')}`;

        // Derive processArea from linked question if available, else default to 'General'
        let processArea = 'General';
        if (row.questionId) {
          const question = await prisma.imsChecklistQuestion.findUnique({
            where: { id: row.questionId },
            select: { processArea: true },
          });
          if (question?.processArea) processArea = question.processArea;
        }

        const ofi = await prisma.imsOfiEntry.create({
          data: {
            findingNumber,
            auditId,
            auditNumber: audit?.auditNumber ?? undefined,
            findingType: data.result,
            processArea,
            description: data.evidence || row.questionText,
            status: 'Open',
            createdById: session.sub,
          },
          select: { id: true, findingNumber: true },
        });

        systemEventService.log({
          eventType: 'IMS_OFI_CREATED',
          eventCategory: 'IMS',
          userId: session.sub,
          userName: session.name,
          entityType: 'ImsOfiEntry',
          entityId: ofi.id,
          entityName: ofi.findingNumber,
          summary: `OFI ${ofi.findingNumber} auto-created from checklist row result (${data.result})`,
          details: { rowId, auditId, findingNumber: ofi.findingNumber, findingType: data.result },
        });

        return NextResponse.json({ row, ofi });
      } catch (ofiError) {
        logger.error({ error: ofiError }, 'Failed to auto-create OFI from checklist row');
        // Return the updated row even if OFI creation fails
        return NextResponse.json({ row, ofiError: 'OFI auto-creation failed' });
      }
    }

    return NextResponse.json({ row });
  } catch (error) {
    logger.error({ error }, 'Failed to update checklist row');
    return NextResponse.json({ error: 'Failed to update checklist row' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ auditId: string; rowId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { rowId } = await params;

    await prisma.imsAuditChecklistRow.delete({
      where: { id: rowId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete checklist row');
    return NextResponse.json({ error: 'Failed to delete checklist row' }, { status: 500 });
  }
}
