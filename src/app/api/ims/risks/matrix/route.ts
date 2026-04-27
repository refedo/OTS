import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import logger from '@/lib/logger';

function getRating(level: number): string {
  if (level <= 4) return 'LOW';
  if (level <= 9) return 'MEDIUM';
  if (level <= 15) return 'HIGH';
  return 'CRITICAL';
}

export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const standard = searchParams.get('standard');

    const risks = await prisma.imsRisk.findMany({
      where: {
        deletedAt: null,
        status: { not: 'CLOSED' },
        ...(standard
          ? { applicableStandards: { path: '$', array_contains: standard } }
          : {}),
      },
      select: {
        id: true,
        riskNumber: true,
        title: true,
        type: true,
        status: true,
        currentLikelihood: true,
        currentSeverity: true,
        currentRiskLevel: true,
        currentRiskRating: true,
      },
    });

    // Build 5x5 matrix
    const cells = [];
    for (let severity = 5; severity >= 1; severity--) {
      for (let likelihood = 1; likelihood <= 5; likelihood++) {
        const level = likelihood * severity;
        const rating = getRating(level);
        const cellRisks = risks.filter(
          r => r.currentLikelihood === likelihood && r.currentSeverity === severity
        );
        cells.push({ likelihood, severity, riskLevel: level, riskRating: rating, risks: cellRisks });
      }
    }

    const summary = {
      LOW: risks.filter(r => r.currentRiskRating === 'LOW').length,
      MEDIUM: risks.filter(r => r.currentRiskRating === 'MEDIUM').length,
      HIGH: risks.filter(r => r.currentRiskRating === 'HIGH').length,
      CRITICAL: risks.filter(r => r.currentRiskRating === 'CRITICAL').length,
    };

    return NextResponse.json({ cells, summary, total: risks.length });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch risk matrix');
    return NextResponse.json({ error: 'Failed to fetch risk matrix' }, { status: 500 });
  }
}
