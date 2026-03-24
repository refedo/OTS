import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createGitHubIssue, updateGitHubIssue } from '@/lib/services/github.service';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.systemSettings.findFirst({
      select: { githubToken: true, githubDefaultRepo: true },
    });

    if (!settings?.githubToken || !settings?.githubDefaultRepo) {
      return NextResponse.json(
        { error: 'GitHub integration is not configured. Go to Settings → GitHub to set it up.' },
        { status: 422 }
      );
    }

    const item = await prisma.productBacklogItem.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        type: true,
        category: true,
        priority: true,
        status: true,
        businessReason: true,
        expectedValue: true,
        affectedModules: true,
        riskLevel: true,
        complianceFlag: true,
        githubIssueNumber: true,
        githubRepo: true,
        tasks: { select: { title: true, status: true, description: true } },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Backlog item not found' }, { status: 404 });
    }

    const repo = item.githubRepo ?? settings.githubDefaultRepo;
    const itemPayload = {
      code: item.code,
      title: item.title,
      description: item.description,
      type: item.type,
      category: item.category,
      priority: item.priority,
      status: item.status,
      businessReason: item.businessReason,
      expectedValue: item.expectedValue,
      affectedModules: item.affectedModules as string[],
      riskLevel: item.riskLevel,
      complianceFlag: item.complianceFlag,
      tasks: item.tasks,
    };

    let issueNumber = item.githubIssueNumber;
    let issueUrl = '';

    if (issueNumber) {
      await updateGitHubIssue(settings.githubToken, repo, issueNumber, itemPayload);
      const updated = await prisma.productBacklogItem.findUnique({
        where: { id: item.id },
        select: { githubIssueUrl: true },
      });
      issueUrl = updated?.githubIssueUrl ?? '';
    } else {
      const result = await createGitHubIssue(settings.githubToken, repo, itemPayload);
      issueNumber = result.issueNumber;
      issueUrl = result.issueUrl;
    }

    const updated = await prisma.productBacklogItem.update({
      where: { id: item.id },
      data: {
        githubIssueNumber: issueNumber,
        githubIssueUrl: issueUrl || undefined,
        githubRepo: repo,
        githubSyncedAt: new Date(),
      },
      select: {
        githubIssueNumber: true,
        githubIssueUrl: true,
        githubRepo: true,
        githubSyncedAt: true,
      },
    });

    logger.info({ itemId: item.id, issueNumber, repo }, 'Backlog item synced to GitHub');

    return NextResponse.json({ message: 'Synced to GitHub successfully', ...updated });
  } catch (error) {
    logger.error({ error }, 'Failed to sync backlog item to GitHub');
    const message = error instanceof Error ? error.message : 'Failed to sync to GitHub';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const item = await prisma.productBacklogItem.findUnique({
      where: { id: params.id },
      select: { id: true, githubIssueNumber: true },
    });

    if (!item) {
      return NextResponse.json({ error: 'Backlog item not found' }, { status: 404 });
    }

    await prisma.productBacklogItem.update({
      where: { id: item.id },
      data: {
        githubIssueNumber: null,
        githubIssueUrl: null,
        githubRepo: null,
        githubSyncedAt: null,
      },
    });

    logger.info({ itemId: item.id }, 'GitHub link removed from backlog item');

    return NextResponse.json({ message: 'GitHub link removed' });
  } catch (error) {
    logger.error({ error }, 'Failed to unlink GitHub issue');
    return NextResponse.json({ error: 'Failed to unlink GitHub issue' }, { status: 500 });
  }
}
