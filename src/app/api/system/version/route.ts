import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const versionSchema = z.object({
  version: z.string(),
  notes: z.string().optional(),
  gitCommit: z.string().optional(),
  migrationName: z.string().optional(),
});

// GET /api/system/version - Get current system version and deployment history
export async function GET(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current version (latest deployment)
    const currentVersion = await prisma.systemVersion.findFirst({
      orderBy: { deployedAt: 'desc' },
    });

    // Get deployment history (last 10)
    const deploymentHistory = await prisma.systemVersion.findMany({
      orderBy: { deployedAt: 'desc' },
      take: 10,
    });

    // Get migration status
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
      SELECT migration_name, finished_at 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC 
      LIMIT 5
    `;

    return NextResponse.json({
      current: {
        version: currentVersion?.version || process.env.APP_VERSION || '1.0.0',
        deployedAt: currentVersion?.deployedAt,
        deployedBy: currentVersion?.deployedBy,
        gitCommit: currentVersion?.gitCommit,
        environment: process.env.NODE_ENV,
        status: currentVersion?.status || 'unknown',
      },
      history: deploymentHistory,
      migrations: migrations,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    console.error('Error fetching system version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system version' },
      { status: 500 }
    );
  }
}

// POST /api/system/version - Record a new deployment
export async function POST(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin can record deployments
    if (session.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Only Admin can record deployments' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = versionSchema.parse(body);

    const deployment = await prisma.systemVersion.create({
      data: {
        version: validated.version,
        deployedBy: session.name,
        notes: validated.notes,
        gitCommit: validated.gitCommit,
        migrationName: validated.migrationName,
        environment: process.env.NODE_ENV || 'production',
        status: 'success',
      },
    });

    return NextResponse.json(deployment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error recording deployment:', error);
    return NextResponse.json(
      { error: 'Failed to record deployment' },
      { status: 500 }
    );
  }
}
