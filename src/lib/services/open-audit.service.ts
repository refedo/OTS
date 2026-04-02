/**
 * OpenAudit Service
 *
 * Forwards critical OTS governance events to an external open-audit store
 * as a tamper-evident compliance mirror. All failures are non-blocking —
 * the service never throws and never delays the calling request.
 *
 * Integration: tomaslachmann/open-audit compatible HTTP endpoint.
 * Enable via OPEN_AUDIT_ENABLED=true + OPEN_AUDIT_API_URL + OPEN_AUDIT_API_KEY.
 */

import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface OpenAuditEvent {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export interface OpenAuditForwardResult {
  success: boolean;
  mirrorLogId: string;
  error?: string;
}

const MAX_ATTEMPTS = 3;

class OpenAuditService {
  private async isEnabled(): Promise<boolean> {
    const settings = await prisma.systemSettings.findFirst({ select: { openAuditEnabled: true } });
    return settings?.openAuditEnabled ?? false;
  }

  /**
   * Forward a single OTS audit event to the external open-audit store.
   * Creates an OpenAuditMirrorLog row first (status=pending), then POSTs
   * to the open-audit HTTP endpoint, then updates the row to delivered/failed.
   * Never throws — all errors are swallowed and logged.
   */
  async forward(auditLogId: string, event: OpenAuditEvent): Promise<OpenAuditForwardResult> {
    if (!await this.isEnabled()) {
      return { success: false, mirrorLogId: '', error: 'open-audit disabled' };
    }

    let mirrorLogId = '';
    try {
      const mirrorLog = await prisma.openAuditMirrorLog.create({
        data: {
          auditLogId,
          actorId: event.actorId,
          action: event.action,
          entity: event.entity,
          entityId: event.entityId,
          metadata: event.metadata ? (event.metadata as Prisma.InputJsonValue) : undefined,
          status: 'pending',
          attempts: 0,
        },
        select: { id: true },
      });
      mirrorLogId = mirrorLog.id;
    } catch (err) {
      logger.error({ err, auditLogId }, '[OpenAudit] Failed to create mirror log row');
      return { success: false, mirrorLogId: '', error: 'db write failed' };
    }

    return this._deliver(mirrorLogId, event);
  }

  private async _deliver(mirrorLogId: string, event: OpenAuditEvent): Promise<OpenAuditForwardResult> {
    const apiUrl = env.OPEN_AUDIT_API_URL;
    const apiKey = env.OPEN_AUDIT_API_KEY;

    if (!apiUrl) {
      await prisma.openAuditMirrorLog.update({
        where: { id: mirrorLogId },
        data: { status: 'failed', errorMessage: 'OPEN_AUDIT_API_URL not configured', lastAttemptAt: new Date() },
      });
      return { success: false, mirrorLogId, error: 'OPEN_AUDIT_API_URL not configured' };
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const res = await fetch(`${apiUrl}/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          actorId: event.actorId,
          action: event.action,
          entity: event.entity,
          entityId: event.entityId,
          metadata: event.metadata ?? {},
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        await prisma.openAuditMirrorLog.update({
          where: { id: mirrorLogId },
          data: { status: 'delivered', deliveredAt: new Date(), lastAttemptAt: new Date(), attempts: { increment: 1 } },
        });
        return { success: true, mirrorLogId };
      }

      const errBody = await res.text().catch(() => '');
      const errorMessage = `HTTP ${res.status}: ${errBody.slice(0, 200)}`;

      const current = await prisma.openAuditMirrorLog.findUnique({
        where: { id: mirrorLogId },
        select: { attempts: true },
      });
      const attempts = (current?.attempts ?? 0) + 1;

      await prisma.openAuditMirrorLog.update({
        where: { id: mirrorLogId },
        data: {
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
          attempts,
          lastAttemptAt: new Date(),
          errorMessage,
        },
      });

      logger.warn({ mirrorLogId, status: res.status }, '[OpenAudit] Delivery returned non-OK');
      return { success: false, mirrorLogId, error: errorMessage };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      const current = await prisma.openAuditMirrorLog.findUnique({
        where: { id: mirrorLogId },
        select: { attempts: true },
      }).catch(() => null);
      const attempts = (current?.attempts ?? 0) + 1;

      await prisma.openAuditMirrorLog.update({
        where: { id: mirrorLogId },
        data: {
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
          attempts,
          lastAttemptAt: new Date(),
          errorMessage,
        },
      }).catch((dbErr) => logger.error({ dbErr }, '[OpenAudit] Failed to update mirror log after delivery error'));

      logger.error({ err, mirrorLogId }, '[OpenAudit] Delivery error');
      return { success: false, mirrorLogId, error: errorMessage };
    }
  }

  /**
   * Retry all rows where status='failed' and attempts < MAX_ATTEMPTS.
   */
  async retryFailed(): Promise<{ retried: number; succeeded: number; failed: number }> {
    if (!await this.isEnabled()) return { retried: 0, succeeded: 0, failed: 0 };

    const rows = await prisma.openAuditMirrorLog.findMany({
      where: { status: 'failed', attempts: { lt: MAX_ATTEMPTS } },
      take: 100,
    });

    let succeeded = 0;
    let failed = 0;

    for (const row of rows) {
      const result = await this._deliver(row.id, {
        actorId: row.actorId,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        metadata: (row.metadata as Record<string, unknown>) ?? undefined,
      });
      if (result.success) succeeded++;
      else failed++;
    }

    return { retried: rows.length, succeeded, failed };
  }

  /**
   * Return mirror log entries with optional filters.
   */
  async getLogs(params: {
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    entity?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rows: unknown[]; total: number }> {
    const { status, dateFrom, dateTo, entity, limit = 50, offset = 0 } = params;

    const where = {
      ...(status && { status }),
      ...(entity && { entity }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.openAuditMirrorLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
      prisma.openAuditMirrorLog.count({ where }),
    ]);

    return { rows, total };
  }

  /**
   * Connectivity check against the open-audit endpoint.
   */
  async checkHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    if (!await this.isEnabled() || !env.OPEN_AUDIT_API_URL) {
      return { ok: false, latencyMs: 0, error: 'open-audit not configured' };
    }

    const start = Date.now();
    try {
      const headers: Record<string, string> = {};
      if (env.OPEN_AUDIT_API_KEY) headers['Authorization'] = `Bearer ${env.OPEN_AUDIT_API_KEY}`;

      const res = await fetch(`${env.OPEN_AUDIT_API_URL}/health`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : 'Unknown' };
    }
  }
}

export const openAuditService = new OpenAuditService();
