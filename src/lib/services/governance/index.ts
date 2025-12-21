/**
 * Enterprise Governance Spine (EGS)
 * 
 * Central export for all governance services.
 */

// Request Context
export {
  runWithContext,
  runWithContextAsync,
  getRequestContext,
  getCurrentUserId,
  getRequestId,
  getRequestSource,
  createContextFromSession,
  createSystemContext,
  type RequestContext,
  type RequestSource,
} from './request-context';

// Audit Service
export {
  auditService,
  AUDITED_ENTITIES,
  type AuditedEntity,
  type AuditLogParams,
  type BatchAuditParams,
  type FieldChange,
} from './audit.service';

// Version Service
export {
  versionService,
  VERSIONED_ENTITIES,
  type VersionedEntity,
  type CreateVersionParams,
} from './version.service';

// Soft Delete Service
export {
  softDeleteService,
  SOFT_DELETE_ENTITIES,
  type SoftDeleteEntity,
  type SoftDeleteParams,
  type RestoreParams,
} from './soft-delete.service';

// Transaction Service
export {
  safeTransaction,
  safeTransactionWithRetry,
  batchTransaction,
  type TransactionClient,
  type TransactionContext,
  type TransactionResult,
} from './transaction.service';
