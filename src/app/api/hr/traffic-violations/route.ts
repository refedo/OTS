/**
 * GET  /api/hr/traffic-violations?employeeId=…  — list violations for one employee (or all)
 * POST /api/hr/traffic-violations               — record a new violation
 *
 * 18.12.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  employeeId: z.string().uuid(),
  assetId: z.string().uuid().optional(),
  violationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  violationType: z.string().min(1).max(200),
  violationAmount: z.coerce.number().min(0),
  referenceNumber: z.string().max(100).optional(),
  issuingAuthority: z.string().max(200).optional(),
  deductFromPayroll: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

export const GET = withApiContext(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  const status = searchParams.get('status');

  try {
    const violations = await prisma.trafficViolation.findMany({
      where: {
        deletedAt: null,
        ...(employeeId ? { employeeId } : {}),
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { violationDate: 'desc' },
      include: {
        employee: { select: { id: true, fullNameEn: true, employmentId: true } },
        asset: { select: { id: true, assetCode: true, name: true, plateNumber: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(violations);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch traffic violations');
    return NextResponse.json({ error: 'Failed to fetch traffic violations' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  const employee = await prisma.employee.findFirst({
    where: { id: d.employeeId, deletedAt: null },
    select: { id: true },
  });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  if (d.assetId) {
    const asset = await prisma.asset.findFirst({ where: { id: d.assetId, deletedAt: null }, select: { id: true } });
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  try {
    const violation = await prisma.trafficViolation.create({
      data: {
        employeeId: d.employeeId,
        assetId: d.assetId ?? null,
        violationDate: new Date(d.violationDate),
        violationType: d.violationType,
        violationAmount: d.violationAmount.toString(),
        status: 'PENDING',
        referenceNumber: d.referenceNumber ?? null,
        issuingAuthority: d.issuingAuthority ?? null,
        deductFromPayroll: d.deductFromPayroll,
        notes: d.notes ?? null,
        createdById: session!.userId,
      },
    });
    logger.info({ violationId: violation.id, employeeId: d.employeeId }, '[Violations] Created');
    return NextResponse.json(violation, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create violation');
    return NextResponse.json({ error: 'Failed to create violation' }, { status: 500 });
  }
});
