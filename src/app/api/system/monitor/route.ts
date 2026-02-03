/**
 * System Monitoring API
 * 
 * Provides real-time system health metrics:
 * - Memory usage and leak detection
 * - Database connection pool stats
 * - Application health
 * 
 * Access: Admin only
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { MemoryMonitor } from '@/lib/monitoring/memory-monitor';
import { dbPool } from '@/lib/middleware/db-connection-pool';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check authentication
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user details to check role
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only allow Admin and CEO roles
    if (!['Admin', 'CEO'].includes(user.role.name)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Gather system metrics
    const memoryStats = MemoryMonitor.getStats();
    const dbStats = dbPool.getStats();
    const dbHealthy = await dbPool.healthCheck();

    // Process uptime
    const uptimeSeconds = process.uptime();
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      
      // Memory metrics
      memory: {
        current: {
          heapUsed: memoryStats.current.heapUsed,
          heapTotal: memoryStats.current.heapTotal,
          heapUsagePercent: memoryStats.current.heapUsagePercent,
          rss: memoryStats.current.rss,
          external: memoryStats.current.external,
        },
        growthRate: Math.round(memoryStats.growthRate * 100) / 100,
        isHealthy: memoryStats.isHealthy,
        snapshotCount: memoryStats.snapshots,
      },

      // Database metrics
      database: {
        isConnected: dbStats.isConnected,
        isHealthy: dbHealthy,
        connectionCount: dbStats.connectionCount,
        idleTimeSeconds: Math.round(dbStats.idleTime / 1000),
        lastActivity: dbStats.lastActivity,
      },

      // System metrics
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptimeSeconds: Math.round(uptimeSeconds),
        uptimeFormatted: `${uptimeHours}h ${uptimeMinutes}m`,
        pid: process.pid,
        environment: process.env.NODE_ENV,
      },

      // Health summary
      health: {
        overall: memoryStats.isHealthy && dbHealthy ? 'healthy' : 'warning',
        issues: [
          ...(!memoryStats.isHealthy ? ['Memory usage high or growing rapidly'] : []),
          ...(!dbHealthy ? ['Database connection issues'] : []),
        ],
      },
    });

  } catch (error) {
    console.error('[System Monitor] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch system metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
