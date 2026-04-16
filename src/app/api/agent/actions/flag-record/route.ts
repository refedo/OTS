import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

const log = logger.child({ module: 'agent/actions/flag-record' });

function verifySecret(req: NextRequest): boolean {
  return req.headers.get('x-ots-agent-secret') === process.env.OTS_INTERNAL_API_SECRET;
}

const schema = z.object({
  runId: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  entity_label: z.string(),
  severity: z.enum(['RED', 'AMBER', 'GREEN']),
  note: z.string(),
  module: z.string(),
});

export async function PATCH(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { runId, entity_type, entity_id, entity_label, severity, note, module } = parsed.data;

    const flag = await prisma.opsRiskFlag.create({
      data: {
        runId,
        entityType: entity_type,
        entityId: entity_id,
        entityLabel: entity_label,
        severity,
        agentNote: note,
        module,
      },
    });

    await systemEventService.log({
      eventType: 'OPS_RISK_FLAG_CREATED',
      eventCategory: 'OPS_AGENT',
      severity: severity === 'RED' ? 'ERROR' : severity === 'AMBER' ? 'WARNING' : 'INFO',
      entityType: entity_type,
      entityId: entity_id,
      summary: `Ops Agent flagged ${entity_label} as ${severity}: ${note.slice(0, 100)}`,
      details: { flagId: flag.id, runId, module, severity },
    });

    return NextResponse.json({ flag });
  } catch (error) {
    log.error({ error }, 'Failed to create risk flag');
    return NextResponse.json({ error: 'Failed to create risk flag' }, { status: 500 });
  }
}
