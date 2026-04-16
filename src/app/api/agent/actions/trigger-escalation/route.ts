import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

const log = logger.child({ module: 'agent/actions/trigger-escalation' });

function verifySecret(req: NextRequest): boolean {
  return req.headers.get('x-ots-agent-secret') === process.env.OTS_INTERNAL_API_SECRET;
}

const schema = z.object({
  runId: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  reason: z.string(),
});

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { runId, entity_type, entity_id, reason } = parsed.data;

    await systemEventService.log({
      eventType: 'OPS_AGENT_ESCALATION_TRIGGERED',
      eventCategory: 'OPS_AGENT',
      severity: 'WARNING',
      entityType: entity_type,
      entityId: entity_id,
      summary: `Ops Agent triggered escalation for ${entity_type} ${entity_id}: ${reason.slice(0, 100)}`,
      details: { runId, entity_type, entity_id, reason },
    });

    log.info({ runId, entity_type, entity_id }, 'Escalation stub triggered (workflow engine not yet implemented)');

    return NextResponse.json({
      success: true,
      message: 'Escalation logged. Full workflow engine integration is pending.',
      entityType: entity_type,
      entityId: entity_id,
    });
  } catch (error) {
    log.error({ error }, 'Failed to trigger escalation');
    return NextResponse.json({ error: 'Failed to trigger escalation' }, { status: 500 });
  }
}
