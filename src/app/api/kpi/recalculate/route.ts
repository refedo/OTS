import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { calculateKPIsForAllEntities, getPeriodDates } from '@/lib/kpi/calculator';

// POST /api/kpi/recalculate - Trigger manual recalculation (Admin only)
export async function POST(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Admin
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true },
    });

    if (!user || user.role.name !== 'Admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { kpiId, frequency } = body;

    if (kpiId) {
      // Recalculate specific KPI
      const kpi = await prisma.kPIDefinition.findUnique({
        where: { id: kpiId },
      });

      if (!kpi) {
        return NextResponse.json(
          { error: 'KPI definition not found' },
          { status: 404 }
        );
      }

      const { periodStart, periodEnd } = getPeriodDates(kpi.frequency);
      
      await calculateKPIsForAllEntities(kpiId, periodStart, periodEnd);

      // Log recalculation
      await prisma.kPIHistory.create({
        data: {
          kpiId,
          action: 'manual_recalculation',
          payload: {
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
          },
          performedBy: session.sub,
        },
      });

      return NextResponse.json({
        message: 'KPI recalculated successfully',
        kpiId,
        periodStart,
        periodEnd,
      });
    } else if (frequency) {
      // Recalculate all KPIs of a specific frequency
      const kpis = await prisma.kPIDefinition.findMany({
        where: {
          isActive: true,
          frequency,
          calculationType: 'auto',
        },
      });

      const { periodStart, periodEnd } = getPeriodDates(frequency);
      
      for (const kpi of kpis) {
        await calculateKPIsForAllEntities(kpi.id, periodStart, periodEnd);
      }

      return NextResponse.json({
        message: `${kpis.length} KPIs recalculated successfully`,
        frequency,
        count: kpis.length,
        periodStart,
        periodEnd,
      });
    } else {
      return NextResponse.json(
        { error: 'Either kpiId or frequency must be provided' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error recalculating KPIs:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate KPIs' },
      { status: 500 }
    );
  }
}
