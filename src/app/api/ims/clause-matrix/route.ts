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

    const [allClauses, activeDocuments] = await Promise.all([
      prisma.imsClause.findMany({
        where: { isActive: true },
        select: {
          id: true,
          standard: true,
          clause: true,
          title: true,
          level: true,
          parentId: true,
        },
        orderBy: [{ standard: 'asc' }, { clause: 'asc' }],
      }),
      prisma.imsDocument.findMany({
        where: { deletedAt: null, status: { not: 'OBSOLETE' } },
        select: {
          id: true,
          documentNumber: true,
          title: true,
          status: true,
          clauseMappings: {
            select: { clauseId: true },
          },
        },
        orderBy: { documentNumber: 'asc' },
      }),
    ]);

    // Group clauses by standard
    const clausesByStandard: Record<string, typeof allClauses> = {};
    for (const clause of allClauses) {
      if (!clausesByStandard[clause.standard]) {
        clausesByStandard[clause.standard] = [];
      }
      clausesByStandard[clause.standard].push(clause);
    }

    // Build documents with flat clauseId array
    type ActiveDoc = (typeof activeDocuments)[number];
    type ClauseRow = (typeof allClauses)[number];
    const documents = activeDocuments.map((doc: ActiveDoc) => ({
      id: doc.id,
      documentNumber: doc.documentNumber,
      title: doc.title,
      status: doc.status,
      clauseIds: doc.clauseMappings.map((m: { clauseId: string }) => m.clauseId),
    }));

    // Calculate coverage per standard
    const coverage = STANDARDS.map((standard) => {
      const standardClauses: ClauseRow[] = clausesByStandard[standard] ?? [];
      const totalClauses = standardClauses.length;
      const clauseIdSet = new Set(standardClauses.map((c: ClauseRow) => c.id));

      const mappedClauseIds = new Set<string>();
      for (const doc of documents) {
        for (const clauseId of doc.clauseIds) {
          if (clauseIdSet.has(clauseId)) {
            mappedClauseIds.add(clauseId);
          }
        }
      }

      const mappedClauses = mappedClauseIds.size;
      const percentage = totalClauses > 0 ? Math.round((mappedClauses / totalClauses) * 100) : 0;

      return { standard, totalClauses, mappedClauses, percentage };
    });

    return NextResponse.json({
      clauses: clausesByStandard,
      documents,
      coverage,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS clause matrix');
    return NextResponse.json({ error: 'Failed to fetch clause matrix' }, { status: 500 });
  }
}
