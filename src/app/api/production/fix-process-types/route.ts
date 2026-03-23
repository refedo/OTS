import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

/**
 * One-time data migration:
 *   1. Normalise processType values in existing ProductionLog rows.
 *   2. Fix source='OTS' on rows whose externalRef starts with 'PTS-'
 *      (they were synced from PTS but got the default source value).
 *
 * GET  → dry-run: returns what would be changed without writing anything.
 * POST → applies the normalisations and returns a summary.
 *
 * Restricted to Admin and Manager roles.
 */

const CANONICAL_MAP: Record<string, string> = {
  // Fit-up variants
  'fit-up': 'Fit-up',
  'fitup': 'Fit-up',
  'fit up': 'Fit-up',

  // Welding variants
  'welding': 'Welding',
  'weld': 'Welding',

  // Visualization variants
  'visualization': 'Visualization',
  'visualisation': 'Visualization',
  'visual': 'Visualization',

  // Preparation variants
  'preparation': 'Preparation',
  'prep': 'Preparation',
  'laser cutting': 'Preparation',
  'cutting': 'Preparation',

  // Sandblasting variants
  'sandblasting': 'Sandblasting',
  'sand blasting': 'Sandblasting',
  'sand-blasting': 'Sandblasting',

  // Painting variants
  'painting': 'Painting',
  'paint': 'Painting',

  // Galvanization variants
  'galvanization': 'Galvanization',
  'galvanisation': 'Galvanization',
  'galvanizing': 'Galvanization',
  'galvanising': 'Galvanization',

  // Erection variants
  'erection': 'Erection',
  'erect': 'Erection',

  // Dispatched to Sandblasting
  'dispatch': 'Dispatched to Sandblasting',
  'dispatched to sandblasting': 'Dispatched to Sandblasting',
  'dispatch to sandblasting': 'Dispatched to Sandblasting',
  'dispatched to sand blasting': 'Dispatched to Sandblasting',
  'dispatch to sand blasting': 'Dispatched to Sandblasting',

  // Dispatched to Galvanization
  'dispatched to galvanization': 'Dispatched to Galvanization',
  'dispatch to galvanization': 'Dispatched to Galvanization',
  'dispatched to galvanisation': 'Dispatched to Galvanization',
  'dispatch to galvanisation': 'Dispatched to Galvanization',
  'dispatched to galvanizing': 'Dispatched to Galvanization',
  'dispatch to galvanizing': 'Dispatched to Galvanization',

  // Dispatched to Painting
  'dispatched to painting': 'Dispatched to Painting',
  'dispatch to painting': 'Dispatched to Painting',

  // Dispatched to Site
  'dispatched to site': 'Dispatched to Site',
  'dispatch to site': 'Dispatched to Site',

  // Dispatched to Customer
  'dispatched to customer': 'Dispatched to Customer',
  'dispatch to customer': 'Dispatched to Customer',
};

const CANONICAL_VALUES = new Set([
  'Preparation',
  'Fit-up',
  'Welding',
  'Visualization',
  'Sandblasting',
  'Painting',
  'Galvanization',
  'Erection',
  'Dispatched to Sandblasting',
  'Dispatched to Galvanization',
  'Dispatched to Painting',
  'Dispatched to Site',
  'Dispatched to Customer',
]);

function normalise(raw: string): string | null {
  if (CANONICAL_VALUES.has(raw)) return null;
  return CANONICAL_MAP[raw.toLowerCase().trim()] ?? null;
}

// GET — dry run
export const GET = withApiContext(async (_req, session) => {
  if (!['Admin', 'Manager'].includes(session!.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const logs = await prisma.productionLog.findMany({
      select: { id: true, processType: true, source: true, externalRef: true },
    });

    const processTypeFixes: Array<{ id: string; from: string; to: string }> = [];
    const sourceFixes: Array<{ id: string; externalRef: string }> = [];
    const unknown: string[] = [];

    for (const log of logs) {
      const to = normalise(log.processType);
      if (to === null && !CANONICAL_VALUES.has(log.processType)) {
        if (!unknown.includes(log.processType)) unknown.push(log.processType);
      } else if (to !== null) {
        processTypeFixes.push({ id: log.id, from: log.processType, to });
      }

      if (log.source !== 'PTS' && log.externalRef?.startsWith('PTS-')) {
        sourceFixes.push({ id: log.id, externalRef: log.externalRef });
      }
    }

    return NextResponse.json({
      dryRun: true,
      processTypesToFix: processTypeFixes.length,
      sourcesToFix: sourceFixes.length,
      unknown,
      processTypeFixes,
      sourceFixes,
    });
  } catch (error) {
    logger.error({ error }, 'fix-production-logs dry-run failed');
    return NextResponse.json({ error: 'Failed to analyse production logs' }, { status: 500 });
  }
});

// POST — apply migration
export const POST = withApiContext(async (_req, session) => {
  if (!['Admin', 'Manager'].includes(session!.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const logs = await prisma.productionLog.findMany({
      select: { id: true, processType: true, source: true, externalRef: true },
    });

    const processTypeUpdates: Array<{ id: string; from: string; to: string }> = [];
    const sourceUpdates: Array<{ id: string }> = [];
    const unknown: string[] = [];

    for (const log of logs) {
      const to = normalise(log.processType);
      if (to === null && !CANONICAL_VALUES.has(log.processType)) {
        if (!unknown.includes(log.processType)) unknown.push(log.processType);
      } else if (to !== null) {
        processTypeUpdates.push({ id: log.id, from: log.processType, to });
      }

      if (log.source !== 'PTS' && log.externalRef?.startsWith('PTS-')) {
        sourceUpdates.push({ id: log.id });
      }
    }

    await prisma.$transaction([
      ...processTypeUpdates.map(({ id, to }) =>
        prisma.productionLog.update({ where: { id }, data: { processType: to } })
      ),
      ...sourceUpdates.map(({ id }) =>
        prisma.productionLog.update({ where: { id }, data: { source: 'PTS' } })
      ),
    ]);

    logger.info(
      {
        processTypeFixed: processTypeUpdates.length,
        sourceFixed: sourceUpdates.length,
        unknownTypes: unknown,
      },
      'fix-production-logs migration applied'
    );

    return NextResponse.json({
      dryRun: false,
      processTypeFixed: processTypeUpdates.length,
      sourceFixed: sourceUpdates.length,
      unknown,
      processTypeChanges: processTypeUpdates,
    });
  } catch (error) {
    logger.error({ error }, 'fix-production-logs migration failed');
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
});
