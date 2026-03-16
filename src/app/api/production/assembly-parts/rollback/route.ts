import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { logSystemEvent } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const rollbackSchema = z.object({
  partIds: z.array(z.string().uuid()).min(1),
  projectId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getCurrentUserPermissions();
    if (!permissions.includes('production.delete_parts')) {
      return NextResponse.json({ error: 'Forbidden: requires production.delete_parts permission' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = rollbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { partIds, projectId } = parsed.data;

    const result = await prisma.assemblyPart.updateMany({
      where: {
        id: { in: partIds },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        deletedById: session.sub,
        deleteReason: 'Rolled back by user after bulk upload',
      },
    });

    await logSystemEvent({
      eventType: 'deleted',
      category: 'production',
      title: `Rolled back bulk upload — ${result.count} assembly parts soft-deleted`,
      description: `User rolled back a bulk upload, soft-deleting ${result.count} assembly parts. Parts can be restored from Governance.`,
      entityType: 'AssemblyPart',
      userId: session.sub,
      projectId,
      metadata: {
        rolledBackCount: result.count,
        requestedCount: partIds.length,
        partIds,
      },
    });

    return NextResponse.json({ success: true, rolledBack: result.count });
  } catch (error) {
    logger.error({ error }, 'Failed to rollback assembly parts upload');
    return NextResponse.json({ error: 'Failed to rollback upload' }, { status: 500 });
  }
}
