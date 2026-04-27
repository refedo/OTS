import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';

const STANDARDS = ['ISO_9001', 'ISO_14001', 'ISO_45001'] as const;

export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    const [
      totalDocuments,
      byStatusRaw,
      overdueReviews,
      pendingDCRs,
      unacknowledgedDistributions,
      allClauses,
      mappedClausesRaw,
      recentActivity,
    ] = await Promise.all([
      // Total active documents
      prisma.imsDocument.count({ where: { deletedAt: null } }),

      // Count by status
      prisma.imsDocument.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true,
      }),

      // Overdue reviews: APPROVED docs with nextReviewDate < now
      prisma.imsDocument.count({
        where: {
          deletedAt: null,
          status: 'APPROVED',
          nextReviewDate: { lt: now },
        },
      }),

      // Pending DCRs: SUBMITTED or UNDER_REVIEW
      prisma.imsChangeRequest.count({
        where: {
          deletedAt: null,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
        },
      }),

      // Unacknowledged distribution recipients
      prisma.imsDistributionRecipient.count({
        where: { acknowledgedAt: null },
      }),

      // All active clauses grouped by standard
      prisma.imsClause.groupBy({
        by: ['standard'],
        where: { isActive: true },
        _count: true,
      }),

      // Distinct clauseIds mapped to at least one document
      prisma.imsClauseMapping.findMany({
        select: {
          clauseId: true,
          clause: { select: { standard: true } },
        },
        distinct: ['clauseId'],
      }),

      // Recent activity: last 10 created/updated documents
      prisma.imsDocument.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          documentNumber: true,
          title: true,
          status: true,
          updatedAt: true,
          createdAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

    // Build byStatus map
    const byStatus: Record<string, number> = {
      DRAFT: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0,
      OBSOLETE: 0,
    };
    for (const row of byStatusRaw) {
      byStatus[row.status] = row._count;
    }

    // Build clause coverage per standard
    const totalClausesByStandard: Record<string, number> = {};
    for (const row of allClauses) {
      totalClausesByStandard[row.standard] = row._count;
    }

    const mappedClausesByStandard: Record<string, Set<string>> = {};
    for (const row of mappedClausesRaw) {
      const std = row.clause.standard;
      if (!mappedClausesByStandard[std]) {
        mappedClausesByStandard[std] = new Set();
      }
      mappedClausesByStandard[std].add(row.clauseId);
    }

    const clauseCoverage = STANDARDS.map((standard) => {
      const totalClauses = totalClausesByStandard[standard] ?? 0;
      const mappedClauses = mappedClausesByStandard[standard]?.size ?? 0;
      const percentage = totalClauses > 0 ? Math.round((mappedClauses / totalClauses) * 100) : 0;
      return { standard, totalClauses, mappedClauses, percentage };
    });

    return NextResponse.json({
      totalDocuments,
      byStatus,
      overdueReviews,
      pendingDCRs,
      unacknowledgedDistributions,
      clauseCoverage,
      recentActivity,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS dashboard');
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
