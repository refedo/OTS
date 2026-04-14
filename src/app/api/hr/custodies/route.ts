/**
 * GET  /api/hr/custodies?employeeId=…  — list custodies for one employee
 * POST /api/hr/custodies               — create a new custody
 *
 * 18.10.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  employeeId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  issuedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(1).max(500),
  deductionAmount: z.coerce.number().min(0).default(0),
  notes: z.string().max(500).optional(),
});

export const GET = withApiContext(async (req: NextRequest, session) => {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  if (!employeeId) {
    return NextResponse.json({ error: 'employeeId query param required' }, { status: 400 });
  }

  try {
    const custodies = await prisma.custody.findMany({
      where: { employeeId, deletedAt: null },
      orderBy: { issuedDate: 'desc' },
      select: {
        id: true,
        amount: true,
        issuedDate: true,
        reason: true,
        settledAmount: true,
        deductionAmount: true,
        status: true,
        notes: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(custodies);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch custodies');
    return NextResponse.json({ error: 'Failed to fetch custodies' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  const employee = await prisma.employee.findUnique({ where: { id: d.employeeId, deletedAt: null }, select: { id: true } });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  try {
    const custody = await prisma.custody.create({
      data: {
        employeeId: d.employeeId,
        amount: d.amount.toString(),
        issuedDate: new Date(d.issuedDate),
        reason: d.reason,
        settledAmount: '0',
        deductionAmount: d.deductionAmount.toString(),
        status: 'OPEN',
        notes: d.notes ?? null,
        createdById: session!.userId,
      },
    });
    logger.info({ custodyId: custody.id, employeeId: d.employeeId }, '[Custodies] Created');
    return NextResponse.json(custody, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create custody');
    return NextResponse.json({ error: 'Failed to create custody' }, { status: 500 });
  }
});
