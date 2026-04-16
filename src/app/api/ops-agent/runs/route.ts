import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'api/ops-agent/runs' });

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const perms = await getCurrentUserPermissions();
    if (!perms.includes('ops_agent.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10));

    const [runs, total] = await Promise.all([
      prisma.opsAgentRun.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { riskFlags: true } },
        },
      }),
      prisma.opsAgentRun.count(),
    ]);

    return NextResponse.json({ runs, total, page, limit });
  } catch (error) {
    log.error({ error }, 'Failed to list ops agent runs');
    return NextResponse.json({ error: 'Failed to list runs' }, { status: 500 });
  }
}
