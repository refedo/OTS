import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

const log = logger.child({ module: 'api/ops-agent/flags/resolve' });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ flagId: string }> }) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const perms = await getCurrentUserPermissions();
    if (!perms.includes('ops_agent.resolve_flags')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { flagId } = await params;
    const flag = await prisma.opsRiskFlag.findUnique({ where: { id: flagId } });
    if (!flag) return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
    if (flag.resolvedAt) return NextResponse.json({ error: 'Flag already resolved' }, { status: 400 });

    const updated = await prisma.opsRiskFlag.update({
      where: { id: flagId },
      data: { resolvedAt: new Date(), resolvedBy: session.sub },
    });

    await systemEventService.log({
      eventType: 'OPS_RISK_FLAG_RESOLVED',
      eventCategory: 'OPS_AGENT',
      severity: 'INFO',
      userId: session.sub,
      entityType: flag.entityType,
      entityId: flag.entityId,
      summary: `Ops risk flag resolved by ${session.sub}: ${flag.entityLabel}`,
      details: { flagId, severity: flag.severity, module: flag.module },
    });

    return NextResponse.json(updated);
  } catch (error) {
    log.error({ error }, 'Failed to resolve risk flag');
    return NextResponse.json({ error: 'Failed to resolve flag' }, { status: 500 });
  }
}
