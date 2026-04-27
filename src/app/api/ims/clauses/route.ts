import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';

interface RawClause {
  id: string;
  standard: string;
  clause: string;
  title: string;
  titleAr: string | null;
  level: number;
  isActive: boolean;
  parentId: string | null;
}

interface ClauseNode extends RawClause {
  children: ClauseNode[];
}

function buildHierarchy(clauses: ClauseNode[], parentId: string | null = null): ClauseNode[] {
  return clauses
    .filter((c: ClauseNode) => (c.parentId ?? null) === parentId)
    .map((c: ClauseNode) => ({
      ...c,
      children: buildHierarchy(clauses, c.id),
    }));
}

export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const standard = searchParams.get('standard');

    const where: Record<string, unknown> = { isActive: true };
    if (standard) where.standard = standard;

    const rawClauses: RawClause[] = await prisma.imsClause.findMany({
      where,
      select: {
        id: true,
        standard: true,
        clause: true,
        title: true,
        titleAr: true,
        level: true,
        isActive: true,
        parentId: true,
      },
      orderBy: [{ standard: 'asc' }, { clause: 'asc' }],
    });

    const clausesWithChildren: ClauseNode[] = rawClauses.map((c: RawClause) => ({
      ...c,
      children: [],
    }));

    const hierarchy = buildHierarchy(clausesWithChildren);

    return NextResponse.json(hierarchy);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS clauses');
    return NextResponse.json({ error: 'Failed to fetch clauses' }, { status: 500 });
  }
}
