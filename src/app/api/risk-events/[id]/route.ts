/**
 * RiskEvent API Routes - Single Item Operations
 * 
 * GET /api/risk-events/[id] - Get a risk event by ID
 * PATCH /api/risk-events/[id] - Resolve a risk event
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { EarlyWarningEngineService } from '@/lib/services/early-warning-engine.service';

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

    const riskEvent = await EarlyWarningEngineService.getById(params.id);

    return NextResponse.json(riskEvent);
  } catch (error) {
    console.error('Error getting risk event:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get risk event' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const body = await request.json();

    // Only action supported is resolving
    if (body.action === 'resolve') {
      const riskEvent = await EarlyWarningEngineService.resolveRisk(params.id);
      return NextResponse.json(riskEvent);
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: resolve' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating risk event:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes('already resolved')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update risk event' },
      { status: 500 }
    );
  }
}
