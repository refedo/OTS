import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

const log = logger.child({ module: 'agent/actions/create-task' });

function verifySecret(req: NextRequest): boolean {
  return req.headers.get('x-ots-agent-secret') === process.env.OTS_INTERNAL_API_SECRET;
}

const schema = z.object({
  runId: z.string(),
  title: z.string().min(1),
  description: z.string(),
  assigned_to: z.string(),
  related_entity_type: z.string().optional(),
  related_entity_id: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
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

    const { runId, title, description, assigned_to, related_entity_type, related_entity_id, priority } = parsed.data;

    const priorityMap: Record<string, string> = {
      LOW: 'Low',
      MEDIUM: 'Medium',
      HIGH: 'High',
      CRITICAL: 'High',
    };

    const task = await prisma.task.create({
      data: {
        title,
        description,
        assignedToId: assigned_to,
        priority: priorityMap[priority] ?? 'Medium',
        status: 'Pending',
        createdById: assigned_to,
      },
    });

    await systemEventService.log({
      eventType: 'OPS_AGENT_TASK_CREATED',
      eventCategory: 'OPS_AGENT',
      severity: 'INFO',
      entityType: 'task',
      entityId: task.id,
      summary: `Ops Agent created follow-up task: ${title}`,
      details: { runId, taskId: task.id, assignedTo: assigned_to, priority },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    log.error({ error }, 'Failed to create follow-up task');
    return NextResponse.json({ error: 'Failed to create follow-up task' }, { status: 500 });
  }
}
