import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { runOpsAgent } from '@/lib/agents/ops-agent';
import type { OpsAgentThresholds } from '@/lib/agents/ops-agent';

const log = logger.child({ module: 'api/ops-agent/run' });

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const perms = await getCurrentUserPermissions();
    if (!perms.includes('ops_agent.run')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const config = await prisma.opsAgentConfig.findFirst();
    if (!config) {
      return NextResponse.json({ error: 'Ops Agent not configured' }, { status: 503 });
    }

    // Create the run record immediately so the UI can poll it
    const run = await prisma.opsAgentRun.create({
      data: {
        triggeredBy: session.sub,
        triggerType: 'manual',
        mode: config.mode,
        status: 'RUNNING',
      },
    });

    const configData = {
      id: config.id,
      mode: config.mode,
      enabledModules: config.enabledModules as Record<string, boolean>,
      thresholds: config.thresholds as unknown as OpsAgentThresholds,
      notifyWhatsApp: config.notifyWhatsApp,
      notifyPush: config.notifyPush,
    };

    // Execute in background — run record already exists
    setImmediate(() => {
      runOpsAgent(configData, session.sub, 'manual', run.id).catch((err) => {
        log.error({ error: err, runId: run.id }, 'Background ops agent run failed');
      });
    });

    return NextResponse.json({ message: 'Ops Agent run triggered', runId: run.id }, { status: 202 });
  } catch (error) {
    log.error({ error }, 'Failed to trigger ops agent run');
    return NextResponse.json({ error: 'Failed to trigger run' }, { status: 500 });
  }
}
