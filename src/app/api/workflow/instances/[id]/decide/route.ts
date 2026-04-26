import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';
import { workflowService } from '@/lib/services/workflow.service';

const decideSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'DELEGATE', 'COMMENT']),
  comment: z.string().optional(),
  delegatedToUserId: z.string().optional(),
});

export const POST = withApiContext(async (req, session, ctx) => {
  const { id } = await ctx!.params;
  const canApprove = await checkPermission('workflow.my-approvals.view');
  if (!canApprove) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = decideSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await workflowService.recordDecision(
      id,
      session!.userId,
      parsed.data.decision,
      parsed.data.comment,
      parsed.data.delegatedToUserId,
    );

    // Propagate final workflow outcome to the owning entity
    if (result?.entityType === 'Loan') {
      if (result.status === 'APPROVED') {
        await prisma.loan.update({ where: { id: result.entityId }, data: { status: 'ACTIVE' } });
      } else if (result.status === 'REJECTED') {
        await prisma.loan.update({ where: { id: result.entityId }, data: { status: 'CANCELLED' } });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error, id }, 'Failed to record workflow decision');
    const message = error instanceof Error ? error.message : 'Failed to record decision';
    const status = message.includes('not an authorized') || message.includes('already submitted') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
