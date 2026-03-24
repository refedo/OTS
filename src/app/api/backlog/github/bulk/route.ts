import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createGitHubIssue, updateGitHubIssue } from '@/lib/services/github.service';

// POST /api/backlog/github/bulk
// Body: { ids?: string[] }  — omit ids to push all unsynced items
export async function POST(req: NextRequest) {
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

    const body = await req.json() as { ids?: string[] };
    const repo = settings.githubDefaultRepo;

    const where = body.ids?.length
      ? { id: { in: body.ids } }
      : {};    // empty = all items

    const items = await prisma.productBacklogItem.findMany({
      where,
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
      orderBy: { createdAt: 'asc' },
    });

    const results: Array<{ id: string; code: string; ok: boolean; issueNumber?: number; issueUrl?: string; error?: string }> = [];

    for (const item of items) {
      try {
        const itemRepo = item.githubRepo ?? repo;
        const payload = {
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
          await updateGitHubIssue(settings.githubToken, itemRepo, issueNumber, payload);
          const existing = await prisma.productBacklogItem.findUnique({
            where: { id: item.id },
            select: { githubIssueUrl: true },
          });
          issueUrl = existing?.githubIssueUrl ?? '';
        } else {
          const result = await createGitHubIssue(settings.githubToken, itemRepo, payload);
          issueNumber = result.issueNumber;
          issueUrl = result.issueUrl;
        }

        await prisma.productBacklogItem.update({
          where: { id: item.id },
          data: {
            githubIssueNumber: issueNumber,
            githubIssueUrl: issueUrl || undefined,
            githubRepo: itemRepo,
            githubSyncedAt: new Date(),
          },
        });

        results.push({ id: item.id, code: item.code, ok: true, issueNumber: issueNumber ?? undefined, issueUrl });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ err, itemId: item.id }, 'Bulk GitHub sync failed for item');
        results.push({ id: item.id, code: item.code, ok: false, error: message });
      }

      // Small delay to stay within GitHub's secondary rate limits
      await new Promise(r => setTimeout(r, 300));
    }

    const succeeded = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;

    logger.info({ succeeded, failed, total: items.length }, 'Bulk GitHub sync complete');

    return NextResponse.json({ succeeded, failed, total: items.length, results });
  } catch (error) {
    logger.error({ error }, 'Bulk GitHub sync failed');
    return NextResponse.json({ error: 'Bulk sync failed' }, { status: 500 });
  }
}
