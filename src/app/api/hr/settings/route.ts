/**
 * GET /api/hr/settings — read payroll + leaves SystemConfig settings
 * PUT /api/hr/settings — save payroll + leaves settings (hr.payroll.settings)
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import {
  getPayrollSettings,
  getLeavesSettings,
  savePayrollSettings,
  saveLeavesSettings,
} from '@/lib/services/hr/system-config';

const payrollSchema = z.object({
  dailyRateBasis: z.enum(['THIRTY', 'WORKING_DAYS_IN_MONTH', 'WEEKLY_AVERAGE']).optional(),
  gosiEmployeeRate: z.number().min(0).max(1).optional(),
  gosiEmployerRate: z.number().min(0).max(1).optional(),
  overtimeMultiplier: z.number().min(1).max(10).optional(),
  wpsBankCode: z.string().min(1).max(20).optional(),
});

const leavesSchema = z.object({
  approvalChain: z.enum(['MANAGER_HR_CEO', 'MANAGER_HR', 'HR_ONLY']).optional(),
  autoApproveUnderDays: z.number().min(0).max(365).optional(),
});

const updateSchema = z.object({
  payroll: payrollSchema.optional(),
  leaves: leavesSchema.optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Any authenticated HR user can read settings — they drive the forms.
  const [payroll, leaves] = await Promise.all([getPayrollSettings(), getLeavesSettings()]);
  return NextResponse.json({ payroll, leaves });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.payroll.settings');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.payroll) {
      await savePayrollSettings(parsed.data.payroll, session.sub);
    }
    if (parsed.data.leaves) {
      await saveLeavesSettings(parsed.data.leaves, session.sub);
    }
    const [payroll, leaves] = await Promise.all([getPayrollSettings(), getLeavesSettings()]);
    return NextResponse.json({ payroll, leaves });
  } catch (error) {
    logger.error({ error }, '[HR Settings] Save failed');
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
