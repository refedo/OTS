/**
 * WorkUnit At-Risk API Route
 * 
 * GET /api/work-units/at-risk - Get WorkUnits that are at risk
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { WorkUnitService } from '@/lib/services/work-unit.service';

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
    const daysThreshold = parseInt(searchParams.get('daysThreshold') || '7');

    const atRiskWorkUnits = await WorkUnitService.getAtRiskWorkUnits(daysThreshold);

    return NextResponse.json({
      data: atRiskWorkUnits,
      count: atRiskWorkUnits.length,
      daysThreshold,
    });
  } catch (error) {
    console.error('Error getting at-risk WorkUnits:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get at-risk WorkUnits' },
      { status: 500 }
    );
  }
}
