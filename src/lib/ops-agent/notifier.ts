import type { OpsAgentRun } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';
import type { OpsAgentConfigData } from '@/lib/agents/ops-agent';
import type { OpsBrief } from './parsers';

const log = logger.child({ module: 'OpsAgentNotifier' });

export async function dispatchOpsAgentNotifications(
  run: OpsAgentRun,
  config: OpsAgentConfigData,
  brief: OpsBrief,
): Promise<void> {
  const redCount = brief.earlyWarning?.red?.length ?? 0;
  const amberCount = brief.earlyWarning?.amber?.length ?? 0;

  if (redCount === 0 && amberCount === 0) {
    log.info({ runId: run.id }, 'No RED/AMBER flags — skipping notification');
    return;
  }

  const usersToNotify = await prisma.user.findMany({
    where: {
      status: 'active',
      role: {
        permissions: { path: '$', string_contains: 'ops_agent.view' },
      },
    },
    select: { id: true },
  });

  if (usersToNotify.length === 0) {
    log.info({ runId: run.id }, 'No users with ops_agent.view permission to notify');
    return;
  }

  const title = `Ops Agent: ${redCount} RED, ${amberCount} AMBER`;
  const message = brief.summary ?? 'Ops Agent sweep complete. Review risk flags.';

  for (const user of usersToNotify) {
    try {
      await NotificationService.createNotification({
        userId: user.id,
        type: 'SYSTEM',
        title,
        message,
        relatedEntityType: 'ops_agent_run',
        relatedEntityId: run.id,
      });
    } catch (error) {
      log.warn({ error, userId: user.id }, 'Failed to notify user about ops agent run');
    }
  }

  log.info({ runId: run.id, notified: usersToNotify.length }, 'Ops Agent notifications dispatched');
}
