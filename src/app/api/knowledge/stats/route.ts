import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  try {
    const whereClause: any = projectId ? { projectId } : {};

    const [
      totalEntries,
      byType,
      byProcess,
      bySeverity,
      byStatus,
      validatedCount,
      openChallenges,
      recentEntries
    ] = await Promise.all([
      prisma.knowledgeEntry.count({ where: whereClause }),
      
      prisma.knowledgeEntry.groupBy({
        by: ['type'],
        where: whereClause,
        _count: true,
      }),
      
      prisma.knowledgeEntry.groupBy({
        by: ['process'],
        where: whereClause,
        _count: true,
      }),
      
      prisma.knowledgeEntry.groupBy({
        by: ['severity'],
        where: whereClause,
        _count: true,
      }),
      
      prisma.knowledgeEntry.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),
      
      prisma.knowledgeEntry.count({
        where: { ...whereClause, status: 'Validated' }
      }),
      
      prisma.knowledgeEntry.count({
        where: { ...whereClause, type: 'CHALLENGE', status: { in: ['Open', 'InProgress'] } }
      }),
      
      prisma.knowledgeEntry.findMany({
        where: whereClause,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          title: true,
          severity: true,
          status: true,
          createdAt: true,
        }
      })
    ]);

    const stats = {
      total: totalEntries,
      validated: validatedCount,
      openChallenges,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byProcess: byProcess.reduce((acc, item) => {
        acc[item.process] = item._count;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      recent: recentEntries,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching knowledge stats:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
