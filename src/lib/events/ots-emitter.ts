/**
 * OTS typed EventEmitter singleton.
 *
 * Provides a strongly-typed pub/sub bus for server-side integration hooks.
 * Listeners are registered once at server startup via src/instrumentation.ts.
 * Emitters (core services / API routes) have zero knowledge of listeners.
 */

import { EventEmitter } from 'events';

// ── Event payload map ─────────────────────────────────────────────────────────

export interface OTSEventMap {
  /** Fired after every AuditLog row is persisted. */
  'audit:created': {
    auditLogId: string;
    entityType: string;
    entityId: string;
    action: string;
    actorId: string;
    metadata?: Record<string, unknown>;
  };

  /** Fired after a WorkOrder row is created. */
  'work-order:created': {
    workOrderId: string;
  };

  /** Fired after a WorkOrder row is updated. */
  'work-order:updated': {
    workOrderId: string;
  };

  /** Fired after a document is stored (local or Nextcloud). */
  'document:uploaded': {
    documentId: string;
    entityType?: string;
    entityId?: string;
    remotePath?: string;
    storageBackend: 'local' | 'nextcloud';
  };
}

// ── Typed subclass ────────────────────────────────────────────────────────────

class OTSEventEmitter extends EventEmitter {
  emit<K extends keyof OTSEventMap>(event: K, payload: OTSEventMap[K]): boolean {
    return super.emit(event as string, payload);
  }

  on<K extends keyof OTSEventMap>(event: K, listener: (payload: OTSEventMap[K]) => void): this {
    return super.on(event as string, listener as (...args: unknown[]) => void);
  }

  once<K extends keyof OTSEventMap>(event: K, listener: (payload: OTSEventMap[K]) => void): this {
    return super.once(event as string, listener as (...args: unknown[]) => void);
  }

  off<K extends keyof OTSEventMap>(event: K, listener: (payload: OTSEventMap[K]) => void): this {
    return super.off(event as string, listener as (...args: unknown[]) => void);
  }
}

export const otsEmitter = new OTSEventEmitter();

// Allow up to 20 listeners per event (3 integration services + headroom)
otsEmitter.setMaxListeners(20);
