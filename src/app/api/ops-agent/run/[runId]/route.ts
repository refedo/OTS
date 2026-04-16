import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'api/ops-agent/run/[runId]' });

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const perms = await getCurrentUserPermissions();
    if (!perms.includes('ops_agent.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { runId } = await params;
    const run = await prisma.opsAgentRun.findUnique({
      where: { id: runId },
      include: {
        riskFlags: { orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }] },
      },
    });

    if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

    return NextResponse.json(run);
  } catch (error) {
    log.error({ error }, 'Failed to fetch ops agent run');
    return NextResponse.json({ error: 'Failed to fetch run' }, { status: 500 });
  }
}
