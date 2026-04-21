/**
 * GET    /api/hr/circulations/[id]  — get single circulation
 * PATCH  /api/hr/circulations/[id]  — update (only PENDING_CEO allowed)
 * DELETE /api/hr/circulations/[id]  — soft-delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  subjectEn: z.string().max(500).nullable().optional(),
  content: z.string().max(100000).nullable().optional(),
  contentEn: z.string().max(100000).nullable().optional(),
  language: z.enum(['ARABIC', 'ENGLISH', 'BILINGUAL']).optional(),
  attachmentUrl: z.string().max(1000).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  departmentIds: z.array(z.string().uuid()).optional(),
  employeeIds: z.array(z.string().uuid()).optional(),
  targetType: z.enum(['ALL', 'DEPARTMENTS', 'EMPLOYEES']).optional(),
});

const CIRC_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  rejectedBy: { select: { id: true, name: true } },
  recipients: {
    include: {
      employee: { select: { id: true, fullNameEn: true, fullNameAr: true, employmentId: true } },
      department: { select: { id: true, name: true } },
    },
  },
} as const;

export const GET = withApiContext(async (_req: NextRequest, _session, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    const circ = await prisma.hrCirculation.findFirst({
      where: { id, deletedAt: null },
      include: CIRC_INCLUDE,
    });
    if (!circ) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(circ);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch circulation');
    return NextResponse.json({ error: 'Failed to fetch circulation' }, { status: 500 });
  }
});

export const PATCH = withApiContext(async (req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const { checkPermission } = await import('@/lib/permission-checker');
  if (!(await checkPermission('hr.letters.manage'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const circ = await prisma.hrCirculation.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, targetType: true } });
  if (!circ) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (circ.status !== 'PENDING_CEO') return NextResponse.json({ error: 'Cannot edit an approved or rejected circulation' }, { status: 400 });

  const body: unknown = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });

  const { departmentIds, employeeIds, targetType, ...updateData } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.hrCirculation.update({
        where: { id },
        data: updateData,
      });

      // Update recipients if targetType or lists changed
      if (targetType !== undefined || departmentIds !== undefined || employeeIds !== undefined) {
        await tx.hrCirculationRecipient.deleteMany({ where: { circulationId: id } });
        const newTargetType = targetType ?? circ.targetType;
        const rows: { id: string; circulationId: string; employeeId?: string; departmentId?: string }[] = [];
        if (newTargetType === 'DEPARTMENTS' && departmentIds?.length) {
          for (const departmentId of departmentIds) rows.push({ id: crypto.randomUUID(), circulationId: id, departmentId });
        } else if (newTargetType === 'EMPLOYEES' && employeeIds?.length) {
          for (const employeeId of employeeIds) rows.push({ id: crypto.randomUUID(), circulationId: id, employeeId });
        }
        if (rows.length > 0) await tx.hrCirculationRecipient.createMany({ data: rows });
      }

      return result;
    });

    logger.info({ circId: id, userId: session!.userId }, '[Circulations] Updated');
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update circulation');
    return NextResponse.json({ error: 'Failed to update circulation' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (_req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const { checkPermission } = await import('@/lib/permission-checker');
  if (!(await checkPermission('hr.letters.manage'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const circ = await prisma.hrCirculation.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true } });
  if (!circ) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (circ.status === 'APPROVED') return NextResponse.json({ error: 'Cannot delete an approved circulation' }, { status: 400 });

  try {
    await prisma.hrCirculation.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session!.userId },
    });
    logger.info({ circId: id, userId: session!.userId }, '[Circulations] Deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete circulation');
    return NextResponse.json({ error: 'Failed to delete circulation' }, { status: 500 });
  }
});
