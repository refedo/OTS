/**
 * POST /api/hr/absence-alerts/evaluate — run the absence-escalation engine now.
 *
 * Two authorised callers:
 *   • Cron — Authorization: Bearer <CRON_SECRET> (see CRON_JOB_REGISTRY).
 *   • Manual — an authenticated user holding hr.analytics.view (UI "Run now").
 *
 * Idempotent: re-running never creates duplicate alerts (dedupeKey). (OTS-BL-080)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { evaluateAbsenceEscalations } from '@/lib/services/hr/absence-escalation.service';

export const POST = withApiContext(
  async (req: NextRequest, session) => {
    const authHeader = req.headers.get('authorization');
    const viaCron = !!env.CRON_SECRET && authHeader === `Bearer ${env.CRON_SECRET}`;
    const viaUser = !viaCron && (await checkPermission('hr.analytics.view'));

    if (!viaCron && !viaUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const result = await evaluateAbsenceEscalations({ triggeredById: session?.userId });
      return NextResponse.json({ ok: true, ...result });
    } catch (error) {
      logger.error({ error }, '[Absence Alerts] Evaluation failed');
      return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 });
    }
  },
  { requireAuth: false },
);
