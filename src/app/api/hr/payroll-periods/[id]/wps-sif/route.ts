/**
 * POST /api/hr/payroll-periods/[id]/wps-sif
 *   — validate readiness and generate a SAMA WPS SIF file for the period
 *
 * GET /api/hr/payroll-periods/[id]/wps-sif
 *   — return validation report only (no file written)
 *
 * 18.10.0
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { generateWpsSif, validateSifReadiness } from '@/lib/services/hr/wps-sif-generator';

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canExport = await checkPermission('hr.payroll.export');
  if (!canExport) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;
  try {
    const result = await validateSifReadiness(id);
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Validation failed';
    logger.error({ error, id }, '[WPS-SIF] Validation failed');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canExport = await checkPermission('hr.payroll.export');
  if (!canExport) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;
  try {
    const result = await generateWpsSif(id, session.sub);
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to generate SIF';
    logger.error({ error, id }, '[WPS-SIF] Generation failed');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
