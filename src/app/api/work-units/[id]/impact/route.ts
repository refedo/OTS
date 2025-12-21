/**
 * WorkUnit Delay Impact API Route
 * 
 * GET /api/work-units/[id]/impact - Get delay impact analysis for a WorkUnit
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { WorkUnitDependencyService } from '@/lib/services/work-unit-dependency.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const delayDays = parseInt(searchParams.get('delayDays') || '0');

    if (delayDays <= 0) {
      return NextResponse.json(
        { error: 'delayDays must be a positive integer' },
        { status: 400 }
      );
    }

    const impact = await WorkUnitDependencyService.getDelayImpact(params.id, delayDays);

    return NextResponse.json(impact);
  } catch (error) {
    console.error('Error getting delay impact:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get delay impact' },
      { status: 500 }
    );
  }
}
