/**
 * RiskEvents Summary API Route
 * 
 * GET /api/risk-events/summary - Get risk summary statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { EarlyWarningEngineService } from '@/lib/services/early-warning-engine.service';

export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const summary = await EarlyWarningEngineService.getRiskSummary();

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error getting risk summary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get risk summary' },
      { status: 500 }
    );
  }
}
