/**
 * Integration event listeners.
 *
 * Called once from src/instrumentation.ts on server startup.
 * Each listener is fire-and-forget — failures are logged but never propagate
 * to the emitting caller.
 *
 * Listeners are always registered. Each service gates on its DB toggle
 * (SystemSettings.openAuditEnabled / libreMesEnabled) at call time.
 */

import { otsEmitter } from './ots-emitter';
import { logger } from '@/lib/logger';

export function registerIntegrationListeners(): void {
  // ── open-audit ──────────────────────────────────────────────────────────────

  const OPEN_AUDIT_ENTITIES = new Set([
    'WPS', 'ITP', 'NCRReport', 'RFIRequest', 'Document',
    'QCInspection', 'Project', 'WorkOrder',
  ]);

  otsEmitter.on('audit:created', (payload) => {
    if (!OPEN_AUDIT_ENTITIES.has(payload.entityType)) return;

    import('@/lib/services/open-audit.service')
      .then(({ openAuditService }) =>
        openAuditService.forward(payload.auditLogId, {
          actorId: payload.actorId,
          action: payload.action,
          entity: payload.entityType,
          entityId: payload.entityId,
          metadata: payload.metadata,
        })
      )
      .catch((err: unknown) => logger.error({ err }, '[OpenAudit] Forward failed'));
  });

  logger.info('[Events] open-audit listener registered');

  // ── Libre MES ───────────────────────────────────────────────────────────────

  otsEmitter.on('work-order:created', (payload) => {
    import('@/lib/services/libre-mes.service')
      .then(({ libreMesService }) =>
        libreMesService.pushOrders([payload.workOrderId])
      )
      .catch((err: unknown) =>
        logger.error({ err, workOrderId: payload.workOrderId }, '[LibreMES] Auto-push failed')
      );
  });

  logger.info('[Events] Libre MES listener registered');
}
