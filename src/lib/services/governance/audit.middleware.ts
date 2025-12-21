/**
 * Prisma Audit Middleware
 * 
 * Automatically logs all CREATE, UPDATE, DELETE operations to the audit trail.
 * Similar to Dolibarr's automatic audit logging.
 */

import { auditService } from './audit.service';
import { getCurrentUserId, getRequestContext } from './request-context';

// Prisma middleware types
type Params = {
  model?: string;
  action: string;
  args: any;
  dataPath: string[];
  runInTransaction: boolean;
};

type Next = (params: Params) => Promise<any>;

// Entities to audit (matches AUDITED_ENTITIES from audit.service)
const AUDITED_MODELS = new Set([
  'Project',
  'Building',
  'AssemblyPart',
  'ProductionLog',
  'QCInspection',
  'WeldingInspection',
  'DimensionalInspection',
  'NDTInspection',
  'WPS',
  'ITP',
  'DocumentSubmission',
  'RFIRequest',
  'NCRReport',
  'Task',
  'User',
  'WorkOrder',
  'WorkOrderPart',
]);

// Fields to exclude from audit (noisy/large fields)
const EXCLUDED_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'password',
  'passwordHash',
  'token',
  'refreshToken',
]);

// Batch operation detection (to avoid logging 1000s of individual records)
const BATCH_THRESHOLD = 10; // If more than 10 operations in same request, treat as batch
const batchTracker = new Map<string, number>();

/**
 * Clean entity data for audit logging
 */
function cleanEntityData(data: any): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {};
  
  const cleaned: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Skip excluded fields
    if (EXCLUDED_FIELDS.has(key)) continue;
    
    // Skip undefined/null
    if (value === undefined || value === null) continue;
    
    // Skip large binary data
    if (Buffer.isBuffer(value)) continue;
    
    // Truncate very long strings
    if (typeof value === 'string' && value.length > 1000) {
      cleaned[key] = value.substring(0, 1000) + '... (truncated)';
      continue;
    }
    
    cleaned[key] = value;
  }
  
  return cleaned;
}

/**
 * Check if this is part of a batch operation
 */
function isBatchOperation(model: string): boolean {
  const ctx = getRequestContext();
  if (!ctx) return false;
  
  const key = `${ctx.requestId}:${model}`;
  const count = (batchTracker.get(key) || 0) + 1;
  batchTracker.set(key, count);
  
  // Clean up old entries after 5 seconds
  setTimeout(() => batchTracker.delete(key), 5000);
  
  return count > BATCH_THRESHOLD;
}

/**
 * Prisma middleware for automatic audit logging
 */
export function createAuditMiddleware() {
  return async (params: Params, next: Next) => {
    const { model, action } = params;
    
    // Skip if no model or not an audited model
    if (!model || !AUDITED_MODELS.has(model)) {
      return next(params);
    }
    
    // Skip if no user context (system operations) - but don't block the operation
    const userId = getCurrentUserId();
    const hasUserContext = !!userId;
    
    // Check for batch operations
    const isBatch = isBatchOperation(model);
    
    try {
      switch (action) {
        case 'create': {
          const result = await next(params);
          
          // Only log if we have user context
          if (hasUserContext && !isBatch && result) {
            setImmediate(() => {
              auditService.logCreate(
                model,
                result.id,
                cleanEntityData(result)
              ).catch(err => console.error('[AuditMiddleware] Create log failed:', err));
            });
          }
          
          return result;
        }
        
        case 'update':
        case 'delete': {
          // Execute the operation first
          const result = await next(params);
          
          // Only log if we have user context
          if (hasUserContext && !isBatch && result) {
            setImmediate(() => {
              if (action === 'update') {
                auditService.log({
                  entityType: model,
                  entityId: result.id,
                  action: 'UPDATE',
                  reason: 'Updated via API',
                }).catch(err => console.error('[AuditMiddleware] Update log failed:', err));
              } else {
                auditService.logDelete(
                  model,
                  result.id,
                  'Deleted via API'
                ).catch(err => console.error('[AuditMiddleware] Delete log failed:', err));
              }
            });
          }
          
          return result;
        }
        
        case 'createMany': {
          const result = await next(params);
          
          // Only log if we have user context
          if (hasUserContext) {
            setImmediate(() => {
              auditService.logBatch({
                entityType: model,
                action: 'CREATE',
                entityIds: [],
                summary: `Bulk created ${result.count} ${model} records`,
              }).catch(err => console.error('[AuditMiddleware] Batch create log failed:', err));
            });
          }
          
          return result;
        }
        
        case 'updateMany': {
          const result = await next(params);
          
          // Only log if we have user context
          if (hasUserContext) {
            setImmediate(() => {
              auditService.logBatch({
                entityType: model,
                action: 'UPDATE',
                entityIds: [],
                summary: `Bulk updated ${result.count} ${model} records`,
              }).catch(err => console.error('[AuditMiddleware] Batch update log failed:', err));
            });
          }
          
          return result;
        }
        
        case 'deleteMany': {
          const result = await next(params);
          
          // Only log if we have user context
          if (hasUserContext) {
            setImmediate(() => {
              auditService.logBatch({
                entityType: model,
                action: 'DELETE',
                entityIds: [],
                summary: `Bulk deleted ${result.count} ${model} records`,
              }).catch(err => console.error('[AuditMiddleware] Batch delete log failed:', err));
            });
          }
          
          return result;
        }
        
        default:
          return next(params);
      }
    } catch (error) {
      // Don't let audit failures break the main operation
      console.error('[AuditMiddleware] Error:', error);
      return next(params);
    }
  };
}
