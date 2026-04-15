/**
 * GET    /api/hr/traffic-violations/[id]  — get single violation
 * PUT    /api/hr/traffic-violations/[id]  — update violation
 * DELETE /api/hr/traffic-violations/[id]  — soft-delete violation
 *
 * 18.12.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  violationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  violationType: z.string().min(1).max(200).optional(),
  violationAmount: z.coerce.number().min(0).optional(),
  status: z.enum(['PENDING', 'PAID_BY_EMPLOYEE', 'PAID_BY_COMPANY', 'DEDUCTED_FROM_PAYROLL']).optional(),
  referenceNumber: z.string().max(100).nullable().optional(),
  issuingAuthority: z.string().max(200).nullable().optional(),
  deductFromPayroll: z.boolean().optional(),
  assetId: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

const deleteSchema = z.object({
  deleteReason: z.string().min(1).max(500),
});

export const GET = withApiContext(async (req: NextRequest, _session, ctx) => {
  const id = ctx?.params?.id as string;
  try {
    const violation = await prisma.trafficViolation.findFirst({
      where: { id, deletedAt: null },
      include: {
        employee: { select: { id: true, fullNameEn: true, employmentId: true } },
        asset: { select: { id: true, assetCode: true, name: true, plateNumber: true } },
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    });
    if (!violation) return NextResponse.json({ error: 'Violation not found' }, { status: 404 });
    return NextResponse.json(violation);
  } catch (error) {
    logger.error({ error, id }, 'Failed to fetch violation');
    return NextResponse.json({ error: 'Failed to fetch violation' }, { status: 500 });
  }
});

export const PUT = withApiContext(async (req: NextRequest, session, ctx) => {
  const id = ctx?.params?.id as string;
  const body: unknown = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const violation = await prisma.trafficViolation.findFirst({ where: { id, deletedAt: null } });
  if (!violation) return NextResponse.json({ error: 'Violation not found' }, { status: 404 });

  const d = parsed.data;
  try {
    const updated = await prisma.trafficViolation.update({
      where: { id },
      data: {
        ...(d.violationDate !== undefined ? { violationDate: new Date(d.violationDate) } : {}),
        ...(d.violationType !== undefined ? { violationType: d.violationType } : {}),
        ...(d.violationAmount !== undefined ? { violationAmount: d.violationAmount.toString() } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.referenceNumber !== undefined ? { referenceNumber: d.referenceNumber } : {}),
        ...(d.issuingAuthority !== undefined ? { issuingAuthority: d.issuingAuthority } : {}),
        ...(d.deductFromPayroll !== undefined ? { deductFromPayroll: d.deductFromPayroll } : {}),
        ...(d.assetId !== undefined ? { assetId: d.assetId } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        updatedById: session!.userId,
      },
    });
    logger.info({ violationId: id }, '[Violations] Updated');
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id }, 'Failed to update violation');
    return NextResponse.json({ error: 'Failed to update violation' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (req: NextRequest, session, ctx) => {
  const id = ctx?.params?.id as string;
  const body: unknown = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'deleteReason is required' }, { status: 400 });
  }

  const violation = await prisma.trafficViolation.findFirst({ where: { id, deletedAt: null } });
  if (!violation) return NextResponse.json({ error: 'Violation not found' }, { status: 404 });

  try {
    await prisma.trafficViolation.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: session!.userId,
        deleteReason: parsed.data.deleteReason,
      },
    });
    logger.info({ violationId: id }, '[Violations] Soft-deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id }, 'Failed to delete violation');
    return NextResponse.json({ error: 'Failed to delete violation' }, { status: 500 });
  }
});
