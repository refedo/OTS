import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();

    const [
      allRisks,
      allTreatments,
      recentRisks,
    ] = await Promise.all([
      prisma.imsRisk.findMany({
        where: { deletedAt: null },
        select: {
          id: true, type: true, status: true, category: true,
          currentRiskRating: true, currentRiskLevel: true,
          nextReviewDate: true, title: true, riskNumber: true,
          updatedAt: true,
        },
      }),
      prisma.imsRiskTreatment.findMany({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, targetDate: { lt: now } },
        select: { id: true },
      }),
      prisma.imsRisk.findMany({
        where: { deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, riskNumber: true, title: true, type: true, currentRiskRating: true, status: true, updatedAt: true },
      }),
    ]);

    const risks = allRisks.filter(r => r.type === 'RISK');
    const opportunities = allRisks.filter(r => r.type === 'OPPORTUNITY');

    const byRating = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } as Record<string, number>;
    risks.forEach(r => { byRating[r.currentRiskRating] = (byRating[r.currentRiskRating] ?? 0) + 1; });

    const byCategory: Record<string, number> = {};
    allRisks.forEach(r => { byCategory[r.category] = (byCategory[r.category] ?? 0) + 1; });

    const byStatus: Record<string, number> = {};
    allRisks.forEach(r => { byStatus[r.status] = (byStatus[r.status] ?? 0) + 1; });

    const overdueReviews = allRisks.filter(
      r => r.nextReviewDate && r.nextReviewDate < now && r.status !== 'CLOSED'
    ).length;

    const topRisks = [...risks]
      .sort((a, b) => b.currentRiskLevel - a.currentRiskLevel)
      .slice(0, 5);

    return NextResponse.json({
      totalRisks: risks.length,
      totalOpportunities: opportunities.length,
      byRating,
      byCategory,
      byStatus,
      overdueReviews,
      overdueTreatments: allTreatments.length,
      recentActivity: recentRisks,
      topRisks,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS risk dashboard');
    return NextResponse.json({ error: 'Failed to fetch risk dashboard' }, { status: 500 });
  }
}
