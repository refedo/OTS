/**
 * RiskEvents API Routes
 * 
 * GET /api/risk-events - List active risk events
 * POST /api/risk-events/run - Run the Early Warning Engine (trigger rule evaluation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { EarlyWarningEngineService } from '@/lib/services/early-warning-engine.service';
import { RiskSeverity, RiskType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const filters = {
      severity: searchParams.get('severity') as RiskSeverity | undefined,
      type: searchParams.get('type') as RiskType | undefined,
      projectId: searchParams.get('projectId') || undefined,
    };

    const risks = await EarlyWarningEngineService.getActiveRisks(filters);

    return NextResponse.json({
      data: risks,
      count: risks.length,
    });
  } catch (error) {
    console.error('Error listing risk events:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list risk events' },
      { status: 500 }
    );
  }
}
