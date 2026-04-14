/**
 * POST /api/hr/employees/[id]/salary-history/[historyId]/status
 *
 * Advance or reject a salary-change row through the approval cycle. Valid
 * transitions:
 *
 *   DRAFT       --submit-->       PENDING_HR   (hr.employee.salaryHistory.manage)
 *   PENDING_HR  --approveHr-->    PENDING_CEO  (hr.employee.salaryHistory.approveHr)
 *   PENDING_CEO --approveCeo-->   APPROVED     (hr.employee.salaryHistory.approveCeo)
 *   any non-APPROVED --reject-->  REJECTED     (approveHr OR approveCeo)
 *
 * The final approveCeo step is the only one that mutates the timeline:
 *   - Closes the currently-open APPROVED row by setting its effectiveTo to
 *     the day before this row's effectiveFrom
 *   - Sets this row's effectiveTo to null (now the open row)
 *   - Mirrors the new comp values onto Employee.basicSalary + allowances
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { EmployeeSalaryApprovalStatus } from '@prisma/client';

const actionSchema = z.object({
  action: z.enum(['submit', 'approveHr', 'approveCeo', 'reject']),
  rejectReason: z.string().max(1000).optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? await verifySession(token) : null;
}

function dayBefore(date: Date): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; historyId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { action, rejectReason } = parsed.data;

  // Permission gates per action
  const permMap: Record<typeof action, string> = {
    submit: 'hr.employee.salaryHistory.manage',
    approveHr: 'hr.employee.salaryHistory.approveHr',
    approveCeo: 'hr.employee.salaryHistory.approveCeo',
    reject: 'hr.employee.salaryHistory.approveHr', // reject is allowed for any approver
  };
  const granted = await checkPermission(permMap[action]);
  if (action === 'reject' && !granted) {
    const alt = await checkPermission('hr.employee.salaryHistory.approveCeo');
    if (!alt) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else if (!granted) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, historyId } = await context.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.employeeSalaryHistory.findFirst({
        where: { id: historyId, employeeId: id, deletedAt: null },
      });
      if (!row) {
        throw new Error('NOT_FOUND');
      }

      const now = new Date();

      if (action === 'submit') {
        if (row.status !== 'DRAFT') {
          throw new Error(`INVALID_TRANSITION:${row.status}->PENDING_HR`);
        }
        return tx.employeeSalaryHistory.update({
          where: { id: historyId },
          data: {
            status: EmployeeSalaryApprovalStatus.PENDING_HR,
            submittedAt: now,
            submittedById: session.sub,
            updatedById: session.sub,
          },
        });
      }

      if (action === 'approveHr') {
        if (row.status !== 'PENDING_HR') {
          throw new Error(`INVALID_TRANSITION:${row.status}->PENDING_CEO`);
        }
        return tx.employeeSalaryHistory.update({
          where: { id: historyId },
          data: {
            status: EmployeeSalaryApprovalStatus.PENDING_CEO,
            hrApprovedAt: now,
            hrApprovedById: session.sub,
            updatedById: session.sub,
          },
        });
      }

      if (action === 'approveCeo') {
        if (row.status !== 'PENDING_CEO') {
          throw new Error(`INVALID_TRANSITION:${row.status}->APPROVED`);
        }

        // Close the currently-open APPROVED row.
        const openRow = await tx.employeeSalaryHistory.findFirst({
          where: {
            employeeId: id,
            deletedAt: null,
            status: 'APPROVED',
            effectiveTo: null,
            id: { not: historyId },
          },
          orderBy: { effectiveFrom: 'desc' },
        });
        if (openRow) {
          if (new Date(openRow.effectiveFrom) >= row.effectiveFrom) {
            throw new Error(
              `EFFECTIVE_OVERLAP:new row effectiveFrom (${row.effectiveFrom.toISOString().slice(0, 10)}) must be after the current open row's effectiveFrom (${openRow.effectiveFrom.toISOString().slice(0, 10)})`,
            );
          }
          await tx.employeeSalaryHistory.update({
            where: { id: openRow.id },
            data: {
              effectiveTo: dayBefore(row.effectiveFrom),
              updatedById: session.sub,
            },
          });
        }

        const approved = await tx.employeeSalaryHistory.update({
          where: { id: historyId },
          data: {
            status: EmployeeSalaryApprovalStatus.APPROVED,
            ceoApprovedAt: now,
            ceoApprovedById: session.sub,
            effectiveTo: null,
            updatedById: session.sub,
          },
        });

        // Mirror the new comp onto the Employee master.
        await tx.employee.update({
          where: { id },
          data: {
            basicSalary: approved.basicSalary,
            housingAllowance: approved.housingAllowance,
            transportAllowance: approved.transportAllowance,
            mobileAllowance: approved.mobileAllowance,
            foodAllowance: approved.foodAllowance,
            otherAllowances: approved.otherAllowances,
            updatedById: session.sub,
          },
        });

        return approved;
      }

      // action === 'reject'
      if (row.status === 'APPROVED' || row.status === 'REJECTED') {
        throw new Error(`INVALID_TRANSITION:${row.status}->REJECTED`);
      }
      return tx.employeeSalaryHistory.update({
        where: { id: historyId },
        data: {
          status: EmployeeSalaryApprovalStatus.REJECTED,
          rejectedAt: now,
          rejectedById: session.sub,
          rejectReason: rejectReason ?? null,
          updatedById: session.sub,
        },
      });
    });

    logger.info(
      { employeeId: id, historyId, action, newStatus: result.status },
      '[EmployeeSalaryHistory] Status transition',
    );
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (msg.startsWith('INVALID_TRANSITION:')) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    if (msg.startsWith('EFFECTIVE_OVERLAP:')) {
      return NextResponse.json({ error: msg.slice('EFFECTIVE_OVERLAP:'.length) }, { status: 409 });
    }
    logger.error({ err, employeeId: id, historyId, action }, '[EmployeeSalaryHistory] Status transition failed');
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
