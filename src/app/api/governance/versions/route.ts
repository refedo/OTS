/**
 * Governance API - Entity Versions
 *
 * Endpoints for viewing entity version history and rolling back to previous versions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { versionService } from '@/lib/services/governance';
import { auditService } from '@/lib/services/governance';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const versionNumber = searchParams.get('version');
    const atDate = searchParams.get('atDate');
    const compareWith = searchParams.get('compareWith');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    // Get version at specific date
    if (atDate) {
      const date = new Date(atDate);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      }
      const version = await versionService.getVersionAt(entityType, entityId, date);
      return NextResponse.json({ version });
    }

    // Get specific version
    if (versionNumber) {
      const version = await versionService.getVersion(
        entityType,
        entityId,
        parseInt(versionNumber)
      );

      // Compare with another version if requested
      if (compareWith && version) {
        const diff = await versionService.compareVersions(
          entityType,
          entityId,
          parseInt(versionNumber),
          parseInt(compareWith)
        );
        return NextResponse.json({ version, diff });
      }

      return NextResponse.json({ version });
    }

    // Get version history
    const history = await versionService.getHistory(entityType, entityId, { limit, offset });
    return NextResponse.json(history);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch entity versions');
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
  }
}

const rollbackSchema = z.object({
  entityType: z.enum(['Project', 'Building', 'QCInspection', 'WPS', 'ITP']),
  entityId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  reason: z.string().min(1).max(500),
});

// Fields that should never be overwritten during a rollback
const IMMUTABLE_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'deletedById',
  'deleteReason',
]);

const PRISMA_MODEL_MAP: Record<string, keyof typeof prisma> = {
  Project: 'project',
  Building: 'building',
  QCInspection: 'qCInspection',
  WPS: 'wPS',
  ITP: 'iTP',
};

export async function POST(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = rollbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { entityType, entityId, versionNumber, reason } = parsed.data;

    const version = await versionService.getVersion(entityType, entityId, versionNumber);
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const snapshot = version.snapshot as Record<string, unknown>;

    // Build the update payload — exclude system-managed fields
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(snapshot)) {
      if (!IMMUTABLE_FIELDS.has(key)) {
        updateData[key] = value;
      }
    }

    const modelKey = PRISMA_MODEL_MAP[entityType];
    if (!modelKey) {
      return NextResponse.json({ error: 'Unsupported entity type' }, { status: 400 });
    }

    // Apply rollback via dynamic Prisma model access
    const model = (prisma as unknown as Record<string, { update: (args: unknown) => Promise<unknown> }>)[modelKey as string];
    await model.update({
      where: { id: entityId },
      data: updateData,
    });

    // Audit log the rollback
    await auditService.log({
      entityType,
      entityId,
      action: 'RESTORE',
      reason: `Rolled back to version ${versionNumber}: ${reason}`,
      userId: session.sub,
    });

    logger.info({ entityType, entityId, versionNumber, userId: session.sub }, 'Version rollback applied');

    return NextResponse.json({
      success: true,
      message: `Successfully rolled back ${entityType} to version ${versionNumber}`,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to apply version rollback');
    return NextResponse.json({ error: 'Failed to apply rollback' }, { status: 500 });
  }
}
