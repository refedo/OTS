import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'OpsAgentSeeder' });

export async function ensureOpsAgentConfig(): Promise<void> {
  try {
    const existing = await prisma.opsAgentConfig.findFirst();
    if (existing) return;

    await prisma.opsAgentConfig.create({
      data: {
        mode: 'READ_ONLY',
        enabledModules: { tasks: true, projects: true, hr: true, pipeline: true },
        thresholds: { taskStaleDays: 3, projectStaleDays: 7, otApprovalHours: 24 },
        cronSchedule: '0 7 * * 0-4',
        notifyWhatsApp: true,
        notifyPush: true,
      },
    });

    log.info({}, 'Default OpsAgentConfig seeded');
  } catch (error) {
    log.warn({ error }, 'Failed to seed OpsAgentConfig (non-fatal)');
  }
}
