/**
 * RiskEvents Run API Route
 * 
 * POST /api/risk-events/run - Run the Early Warning Engine
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { EarlyWarningEngineService } from '@/lib/services/early-warning-engine.service';

export async function POST(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await EarlyWarningEngineService.runAllRules();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running early warning engine:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run early warning engine' },
      { status: 500 }
    );
  }
}
