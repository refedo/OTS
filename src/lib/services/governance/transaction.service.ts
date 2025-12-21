/**
 * Transaction Service
 * 
 * Provides safe transaction wrappers for multi-step operations.
 * Ensures atomic operations with proper error handling and logging.
 */

import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getRequestId, getCurrentUserId } from './request-context';

export type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface TransactionContext {
  operationName: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface TransactionResult<T> {
  success: boolean;
  result?: T;
  error?: string;
  duration: number;
}

/**
 * Execute operations within a safe transaction
 * 
 * Features:
 * - Automatic rollback on failure
 * - Error logging with context
 * - Duration tracking
 * - System event creation on failure
 */
export async function safeTransaction<T>(
  operations: (tx: TransactionClient) => Promise<T>,
  context: TransactionContext
): Promise<TransactionResult<T>> {
  const startTime = Date.now();
  const requestId = getRequestId();
  const userId = getCurrentUserId();

  try {
    const result = await prisma.$transaction(async (tx) => {
      return await operations(tx as TransactionClient);
    }, {
      maxWait: 10000, // 10 seconds max wait
      timeout: 30000, // 30 seconds timeout
    });

    return {
      success: true,
      result,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`[Transaction] ${context.operationName} failed:`, {
      error: errorMessage,
      requestId,
      userId,
      entityType: context.entityType,
      entityId: context.entityId,
      duration,
    });

    // Log failed transaction as system event
    try {
      await prisma.systemEvent.create({
        data: {
          eventType: 'transaction_failed',
          category: 'error',
          severity: 'ERROR',
          title: `Transaction failed: ${context.operationName}`,
          description: errorMessage,
          requestId,
          entityType: context.entityType,
          entityId: context.entityId,
          userId: userId || undefined,
          metadata: {
            ...context.metadata,
            duration,
            stack: error instanceof Error ? error.stack : undefined,
          },
        },
      });
    } catch (logError) {
      console.error('[Transaction] Failed to log transaction error:', logError);
    }

    return {
      success: false,
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Execute operations with retry logic
 */
export async function safeTransactionWithRetry<T>(
  operations: (tx: TransactionClient) => Promise<T>,
  context: TransactionContext,
  options?: {
    maxRetries?: number;
    retryDelayMs?: number;
  }
): Promise<TransactionResult<T>> {
  const { maxRetries = 3, retryDelayMs = 1000 } = options || {};
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await safeTransaction(operations, {
      ...context,
      metadata: {
        ...context.metadata,
        attempt,
        maxRetries,
      },
    });

    if (result.success) {
      return result;
    }

    lastError = result.error;

    // Don't retry on certain errors
    if (
      lastError?.includes('Unique constraint') ||
      lastError?.includes('Foreign key constraint') ||
      lastError?.includes('Record not found')
    ) {
      return result;
    }

    // Wait before retrying
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt));
    }
  }

  return {
    success: false,
    error: `Failed after ${maxRetries} attempts: ${lastError}`,
    duration: 0,
  };
}

/**
 * Batch operations with transaction
 * Useful for bulk updates that need to be atomic
 */
export async function batchTransaction<T, R>(
  items: T[],
  operation: (tx: TransactionClient, item: T, index: number) => Promise<R>,
  context: TransactionContext,
  options?: {
    batchSize?: number;
    continueOnError?: boolean;
  }
): Promise<{
  success: boolean;
  results: R[];
  errors: Array<{ index: number; error: string }>;
  duration: number;
}> {
  const { batchSize = 100, continueOnError = false } = options || {};
  const startTime = Date.now();
  const results: R[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  // Process in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const batchResult = await safeTransaction(
      async (tx) => {
        const batchResults: R[] = [];
        
        for (let j = 0; j < batch.length; j++) {
          const globalIndex = i + j;
          try {
            const result = await operation(tx, batch[j], globalIndex);
            batchResults.push(result);
          } catch (error) {
            if (!continueOnError) throw error;
            errors.push({
              index: globalIndex,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        
        return batchResults;
      },
      {
        ...context,
        metadata: {
          ...context.metadata,
          batchStart: i,
          batchSize: batch.length,
          totalItems: items.length,
        },
      }
    );

    if (batchResult.success && batchResult.result) {
      results.push(...batchResult.result);
    } else if (!continueOnError) {
      return {
        success: false,
        results,
        errors: [{ index: i, error: batchResult.error || 'Batch failed' }],
        duration: Date.now() - startTime,
      };
    }
  }

  return {
    success: errors.length === 0,
    results,
    errors,
    duration: Date.now() - startTime,
  };
}
