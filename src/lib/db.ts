/**
 * Database Client
 * 
 * Now uses connection pooling middleware for:
 * - Better connection reuse
 * - Automatic connection cleanup
 * - Graceful shutdown handling
 * - Connection pool monitoring
 */

import { db } from '@/lib/middleware/db-connection-pool';

// Export as prisma for backward compatibility
export const prisma = db;

export default prisma;
