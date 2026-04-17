import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

const log = logger.child({ module: 'api/ops-agent/config' });

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  mode: z.enum(['READ_ONLY', 'ANNOTATE', 'FULL_ACTOR']).optional(),
  enabledModules: z.record(z.boolean()).optional(),
  thresholds: z
    .object({
      taskStaleDays: z.number().int().min(1).max(30),
      projectStaleDays: z.number().int().min(1).max(60),
      otApprovalHours: z.number().int().min(1).max(168),
    })
    .optional(),
  cronSchedule: z.string().optional(),
  notifyWhatsApp: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
  aiProvider: z.string().optional(),
  aiModel: z.string().optional(),
  aiApiKey: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const perms = await getCurrentUserPermissions();
    if (!perms.includes('ops_agent.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const config = await prisma.opsAgentConfig.findFirst();
    return NextResponse.json(config ?? null);
  } catch (error) {
    log.error({ error }, 'Failed to fetch ops agent config');
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const perms = await getCurrentUserPermissions();
    if (!perms.includes('ops_agent.configure')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.opsAgentConfig.findFirst();
    if (!existing) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    const prevMode = existing.mode;
    const updated = await prisma.opsAgentConfig.update({
      where: { id: existing.id },
      data: { ...parsed.data, updatedBy: session.sub },
    });

    const eventType = parsed.data.mode && parsed.data.mode !== prevMode
      ? 'OPS_AGENT_MODE_CHANGED'
      : 'OPS_AGENT_CONFIG_UPDATED';

    await systemEventService.log({
      eventType,
      eventCategory: 'OPS_AGENT',
      severity: 'INFO',
      userId: session.sub,
      summary: `Ops Agent config updated by ${session.sub}`,
      details: { changes: parsed.data, prevMode },
    });

    return NextResponse.json(updated);
  } catch (error) {
    log.error({ error }, 'Failed to update ops agent config');
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
