/**
 * WorkUnit Dependency Chain API Route
 * 
 * GET /api/work-units/[id]/chain - Get dependency chain for a WorkUnit
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
    const direction = (searchParams.get('direction') || 'downstream') as 'upstream' | 'downstream';
    const maxDepth = parseInt(searchParams.get('maxDepth') || '10');

    // Validate direction
    if (!['upstream', 'downstream'].includes(direction)) {
      return NextResponse.json(
        { error: 'Invalid direction. Must be "upstream" or "downstream"' },
        { status: 400 }
      );
    }

    const chain = await WorkUnitDependencyService.getDependencyChain(
      params.id,
      direction,
      maxDepth
    );

    return NextResponse.json(chain);
  } catch (error) {
    console.error('Error getting dependency chain:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get dependency chain' },
      { status: 500 }
    );
  }
}
