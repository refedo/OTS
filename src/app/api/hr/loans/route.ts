/**
 * GET  /api/hr/loans?employeeId=…   — list loans for one employee
 * POST /api/hr/loans                — create a new loan
 *
 * 18.10.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { workflowService } from '@/lib/services/workflow.service';

const createSchema = z.object({
  employeeId: z.string().uuid(),
  principal: z.coerce.number().positive(),
  installmentAmount: z.coerce.number().positive(),
  installmentsTotal: z.coerce.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(500).optional(),
  exceedsYearWarning: z.boolean().default(false),
  warningReason: z.string().max(500).optional(),
});

export const GET = withApiContext(async (req: NextRequest, session) => {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  if (!employeeId) {
    return NextResponse.json({ error: 'employeeId query param required' }, { status: 400 });
  }

  try {
    const loans = await prisma.loan.findMany({
      where: { employeeId, deletedAt: null },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        principal: true,
        installmentAmount: true,
        installmentsTotal: true,
        installmentsPaid: true,
        startDate: true,
        status: true,
        reason: true,
        exceedsYearWarning: true,
        warningReason: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(loans);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch loans');
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  if (d.exceedsYearWarning && !d.warningReason) {
    return NextResponse.json({ error: 'warningReason is required when exceedsYearWarning is true' }, { status: 400 });
  }
  if (d.installmentsTotal > 12 && !d.exceedsYearWarning) {
    return NextResponse.json(
      { error: 'installmentsTotal > 12 — set exceedsYearWarning=true and provide a warningReason' },
      { status: 400 },
    );
  }

  const employee = await prisma.employee.findUnique({ where: { id: d.employeeId, deletedAt: null }, select: { id: true } });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  try {
    const loan = await prisma.loan.create({
      data: {
        employeeId: d.employeeId,
        principal: d.principal.toString(),
        installmentAmount: d.installmentAmount.toString(),
        installmentsTotal: d.installmentsTotal,
        installmentsPaid: 0,
        startDate: new Date(d.startDate),
        status: 'PENDING_APPROVAL',
        reason: d.reason ?? null,
        exceedsYearWarning: d.exceedsYearWarning,
        warningReason: d.warningReason ?? null,
        createdById: session!.userId,
      },
    });

    // Start the approval workflow; fall back to ACTIVE if definition not yet seeded
    try {
      await workflowService.startWorkflow(
        'hr-loan-approval',
        'Loan',
        loan.id,
        session!.userId,
        undefined,
        { principal: d.principal, installmentsTotal: d.installmentsTotal },
      );
    } catch (wfErr) {
      logger.warn({ loanId: loan.id, error: wfErr }, '[Loans] No workflow definition — activating directly');
      await prisma.loan.update({ where: { id: loan.id }, data: { status: 'ACTIVE' } });
    }

    logger.info({ loanId: loan.id, employeeId: d.employeeId }, '[Loans] Created');
    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create loan');
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 });
  }
});
