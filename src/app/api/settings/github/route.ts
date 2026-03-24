import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { testGitHubConnection } from '@/lib/services/github.service';
import { getCurrentUserPermissions } from '@/lib/permission-checker';

const saveSchema = z.object({
  githubToken: z.string().min(1, 'Token is required'),
  githubDefaultRepo: z.string().regex(/^[^/]+\/[^/]+$/, 'Must be in owner/repo format'),
});

export async function GET(_req: NextRequest) {
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

    return NextResponse.json({
      configured: !!(settings?.githubToken && settings?.githubDefaultRepo),
      githubDefaultRepo: settings?.githubDefaultRepo ?? null,
      // Mask the token — return only a hint
      githubTokenHint: settings?.githubToken
        ? `${settings.githubToken.slice(0, 6)}${'*'.repeat(10)}`
        : null,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch GitHub settings');
    return NextResponse.json({ error: 'Failed to fetch GitHub settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only CEO/Admin can configure integrations
    const permissions = await getCurrentUserPermissions();
    if (!permissions.includes('backlog.ceo_center')) {
      return NextResponse.json({ error: 'Only Admin or CEO can configure GitHub integration' }, { status: 403 });
    }

    const body = await req.json() as unknown;
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { githubToken, githubDefaultRepo } = parsed.data;

    // Test the connection before saving
    const test = await testGitHubConnection(githubToken, githubDefaultRepo);
    if (!test.ok) {
      return NextResponse.json({ error: test.error }, { status: 422 });
    }

    // Upsert into SystemSettings (singleton pattern)
    let settings = await prisma.systemSettings.findFirst();
    if (settings) {
      await prisma.systemSettings.update({
        where: { id: settings.id },
        data: { githubToken, githubDefaultRepo },
      });
    } else {
      await prisma.systemSettings.create({
        data: { githubToken, githubDefaultRepo },
      });
    }

    logger.info({ repo: githubDefaultRepo, login: test.login }, 'GitHub integration configured');

    return NextResponse.json({
      message: 'GitHub integration saved successfully',
      login: test.login,
      repoFullName: test.repoFullName,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to save GitHub settings');
    return NextResponse.json({ error: 'Failed to save GitHub settings' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getCurrentUserPermissions();
    if (!permissions.includes('backlog.ceo_center')) {
      return NextResponse.json({ error: 'Only Admin or CEO can configure GitHub integration' }, { status: 403 });
    }

    const settings = await prisma.systemSettings.findFirst();
    if (settings) {
      await prisma.systemSettings.update({
        where: { id: settings.id },
        data: { githubToken: null, githubDefaultRepo: null },
      });
    }

    logger.info('GitHub integration disconnected');

    return NextResponse.json({ message: 'GitHub integration disconnected' });
  } catch (error) {
    logger.error({ error }, 'Failed to disconnect GitHub integration');
    return NextResponse.json({ error: 'Failed to disconnect GitHub integration' }, { status: 500 });
  }
}
