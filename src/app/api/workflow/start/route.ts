import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';
import { workflowService } from '@/lib/services/workflow.service';

const startSchema = z.object({
  key: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  siteId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const POST = withApiContext(async (req, session) => {
  const canStart = await checkPermission('workflow.instances.start');
  if (!canStart) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = startSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const instance = await workflowService.startWorkflow(
      parsed.data.key,
      parsed.data.entityType,
      parsed.data.entityId,
      session!.userId,
      parsed.data.siteId,
      parsed.data.metadata,
    );
    return NextResponse.json(instance, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to start workflow');
    const message = error instanceof Error ? error.message : 'Failed to start workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
