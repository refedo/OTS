import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';
import { workflowService } from '@/lib/services/workflow.service';

export const GET = withApiContext(async (req, session) => {
  const canApprove = await checkPermission('workflow.my-approvals.view');
  if (!canApprove) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId') ?? undefined;

  try {
    const pending = await workflowService.getPendingApprovalsForUser(session!.userId, siteId);
    return NextResponse.json(pending);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch pending approvals');
    return NextResponse.json({ error: 'Failed to fetch pending approvals' }, { status: 500 });
  }
});
