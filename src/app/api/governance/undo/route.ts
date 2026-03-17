/**
 * Governance API - Undo / Revert Actions
 *
 * Allows reverting specific audit log actions:
 * - Undo a single CREATE  → soft-delete the created entity
 * - Undo a BATCH CREATE   → soft-delete all entities in the batch
 * - Restore a DELETE      → restore the soft-deleted entity
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const SOFT_DELETABLE = ['Project', 'Building', 'AssemblyPart'] as const;
type SoftDeletable = typeof SOFT_DELETABLE[number];

const bodySchema = z.object({
  auditLogId: z.string(),
});

const PRISMA_MODEL_MAP: Record<SoftDeletable, keyof typeof prisma> = {
  Project: 'project',
  Building: 'building',
  AssemblyPart: 'assemblyPart',
};

async function softDeleteMany(entityType: SoftDeletable, ids: string[], userId: string): Promise<number> {
  const modelKey = PRISMA_MODEL_MAP[entityType];
  const model = (prisma as unknown as Record<string, {
    updateMany: (args: unknown) => Promise<{ count: number }>;
  }>)[modelKey as string];

  const now = new Date();
  const result = await model.updateMany({
    where: { id: { in: ids }, deletedAt: null },
    data: { deletedAt: now, deletedById: userId, deleteReason: 'Undone via Governance Center' },
  });
  return result.count;
}

async function restoreOne(entityType: SoftDeletable, entityId: string): Promise<boolean> {
  const modelKey = PRISMA_MODEL_MAP[entityType];
  const model = (prisma as unknown as Record<string, {
    update: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
  }>)[modelKey as string];

  const record = await model.findUnique({ where: { id: entityId } });
  if (!record || !record.deletedAt) return false;

  await model.update({
    where: { id: entityId },
    data: { deletedAt: null, deletedById: null, deleteReason: null },
  });
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions — Admin or Manager required' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'auditLogId is required' }, { status: 400 });
    }

    const log = await prisma.auditLog.findUnique({
      where: { id: parsed.data.auditLogId },
    });

    if (!log) {
      return NextResponse.json({ error: 'Audit log not found' }, { status: 404 });
    }

    const entityType = log.entityType as SoftDeletable;
    if (!SOFT_DELETABLE.includes(entityType)) {
      return NextResponse.json(
        { error: `Undo is not supported for ${entityType} — only Project, Building, and AssemblyPart can be undone` },
        { status: 400 }
      );
    }

    let affectedCount = 0;

    if (log.action === 'CREATE') {
      if (log.entityId === 'BATCH') {
        // Batch undo: get all entity IDs from metadata
        const meta = log.metadata as { entityIds?: string[]; batchSize?: number } | null;
        const ids = meta?.entityIds;
        if (!ids || ids.length === 0) {
          return NextResponse.json({ error: 'No entity IDs found in batch metadata' }, { status: 400 });
        }
        affectedCount = await softDeleteMany(entityType, ids, session.sub);
      } else {
        // Single undo
        affectedCount = await softDeleteMany(entityType, [log.entityId], session.sub);
      }

      // Record the undo in audit trail
      await prisma.auditLog.create({
        data: {
          entityType,
          entityId: log.entityId,
          action: 'DELETE',
          performedById: session.sub,
          reason: `Undone via Governance Center (reversed audit log ${log.id})`,
          metadata: { undoneAuditLogId: log.id, affectedCount },
        },
      });

      logger.info({ entityType, auditLogId: log.id, affectedCount, userId: session.sub }, 'Undo CREATE action');

      return NextResponse.json({
        success: true,
        action: 'undo_create',
        affectedCount,
        message: `${affectedCount} ${entityType} record${affectedCount !== 1 ? 's' : ''} removed`,
      });
    }

    if (log.action === 'DELETE') {
      const restored = await restoreOne(entityType, log.entityId);
      if (!restored) {
        return NextResponse.json({ error: 'Item could not be restored — it may already be active' }, { status: 400 });
      }

      await prisma.auditLog.create({
        data: {
          entityType,
          entityId: log.entityId,
          action: 'RESTORE',
          performedById: session.sub,
          reason: `Restored via Governance Center (reversed audit log ${log.id})`,
          metadata: { undoneAuditLogId: log.id },
        },
      });

      logger.info({ entityType, entityId: log.entityId, auditLogId: log.id, userId: session.sub }, 'Undo DELETE action');

      return NextResponse.json({
        success: true,
        action: 'undo_delete',
        affectedCount: 1,
        message: `${entityType} restored successfully`,
      });
    }

    return NextResponse.json(
      { error: `Undo is only supported for CREATE and DELETE actions, not ${log.action}` },
      { status: 400 }
    );
  } catch (error) {
    logger.error({ error }, 'Failed to undo action');
    return NextResponse.json({ error: 'Failed to undo action' }, { status: 500 });
  }
}
