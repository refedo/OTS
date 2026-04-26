import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';
import { workflowService } from '@/lib/services/workflow.service';

const cancelSchema = z.object({
  reason: z.string().optional(),
});

export const POST = withApiContext(async (req, session, ctx) => {
  const { id } = await ctx!.params;
  const canCancel = await checkPermission('workflow.instances.cancel');
  if (!canCancel) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = cancelSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await workflowService.cancelWorkflow(id, session!.userId, parsed.data.reason);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id }, 'Failed to cancel workflow');
    const message = error instanceof Error ? error.message : 'Failed to cancel workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
