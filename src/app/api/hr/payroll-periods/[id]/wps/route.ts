/**
 * POST /api/hr/payroll-periods/[id]/wps — generate Alinma WPS file for period
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { generateAlinmaWpsFile } from '@/lib/services/hr/wps-alinma-generator';

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canExport = await checkPermission('hr.payroll.export');
  if (!canExport) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;
  try {
    const result = await generateAlinmaWpsFile(id, session.sub);
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to generate WPS';
    logger.error({ error, id }, '[WPS] Generation failed');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
