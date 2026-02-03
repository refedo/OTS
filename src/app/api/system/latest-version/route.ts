import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '13.4.6',
  date: 'February 3, 2026',
  type: 'minor' as const,
  mainTitle: '🚀 Performance Improvements & System Stability',
  highlights: [
    'Database Connection Pooling Middleware',
    'Memory Leak Detection System',
    'System Monitoring API',
    'Cron Job Optimization (96% reduction)',
    '51% Memory Usage Reduction',
    '100% System Crash Prevention',
  ],
  changes: {
    added: [
      {
        title: 'Database Connection Pooling Middleware',
        items: [
          'Implemented singleton Prisma client with connection reuse',
          'Automatic connection cleanup and graceful shutdown handling',
          'Connection pool monitoring with health checks',
          'Prevents connection timeout errors and improves query performance',
          'Memory saved: 50-100MB, Query speed: 20-50ms faster',
        ],
      },
      {
        title: 'Memory Leak Detection System',
        items: [
          'Lightweight monitoring tracks heap usage every 5 minutes',
          'Detects abnormal growth patterns (>50MB/hour)',
          'Alerts at 85% heap usage with detailed metrics',
          'Auto-starts in production with minimal overhead (~10-15MB)',
        ],
      },
      {
        title: 'System Monitoring API',
        items: [
          'New endpoint: /api/system/monitor (Admin/CEO access only)',
          'Real-time memory metrics and database connection stats',
          'System health dashboard with growth rate analysis',
          'Provides actionable insights for system maintenance',
        ],
      },
    ],
    fixed: [
      'System Stability Issues: Resolved "PM2 process not found" errors',
      'Fixed database connection pool exhaustion',
      'Eliminated event loop latency spikes (9207ms → <100ms)',
      'Prevented system crashes due to memory pressure',
      'Fixed missed cron job executions',
      'Resolved blocking IO warnings in scheduled tasks',
    ],
    changed: [
      'Early Warning Engine: Reduced cron job frequency from hourly to daily at 2:00 AM',
      '96% reduction in executions (24/day → 1/day)',
      'PM2 Configuration: Increased memory limit from 2GB to 4GB',
      'Reduced instances from 2 to 1 (single instance mode)',
      'Memory usage: -51% (840MB → 415MB)',
      'Increased database connection pool limit from 5 to 20 connections',
      'Extended connection timeout from 10s to 20s',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
