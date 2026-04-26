import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';
import { workflowService } from '@/lib/services/workflow.service';

export const GET = withApiContext(async (req, session, ctx) => {
  const { entityType, entityId } = await ctx!.params;
  const canView = await checkPermission('workflow.instances.view');
  const canApprove = await checkPermission('workflow.my-approvals.view');
  if (!canView && !canApprove) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const status = await workflowService.getWorkflowStatus(entityType, entityId);
    if (!status) return NextResponse.json(null);
    return NextResponse.json(status);
  } catch (error) {
    logger.error({ error, entityType, entityId }, 'Failed to fetch entity workflow status');
    return NextResponse.json({ error: 'Failed to fetch workflow status' }, { status: 500 });
  }
});
