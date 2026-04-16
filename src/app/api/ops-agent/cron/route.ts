import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { runOpsAgent } from '@/lib/agents/ops-agent';
import type { OpsAgentThresholds } from '@/lib/agents/ops-agent';

const log = logger.child({ module: 'api/ops-agent/cron' });

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-ots-agent-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.OTS_INTERNAL_API_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await prisma.opsAgentConfig.findFirst();
    if (!config) {
      return NextResponse.json({ error: 'Ops Agent not configured' }, { status: 503 });
    }

    const configData = {
      id: config.id,
      mode: config.mode,
      enabledModules: config.enabledModules as Record<string, boolean>,
      thresholds: config.thresholds as OpsAgentThresholds,
      notifyWhatsApp: config.notifyWhatsApp,
      notifyPush: config.notifyPush,
    };

    setImmediate(() => {
      runOpsAgent(configData, 'cron', 'cron').catch((err) => {
        log.error({ error: err }, 'Cron ops agent run failed');
      });
    });

    return NextResponse.json({ message: 'Ops Agent cron run triggered' });
  } catch (error) {
    log.error({ error }, 'Failed to trigger ops agent cron run');
    return NextResponse.json({ error: 'Failed to trigger cron run' }, { status: 500 });
  }
}
