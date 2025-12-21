/**
 * Governance API - Audit Trail
 * 
 * READ-ONLY endpoints for viewing audit logs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { auditService } from '@/lib/services/governance';

export async function GET(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // If entityType and entityId provided, get specific trail
    if (entityType && entityId) {
      const result = await auditService.getTrail(entityType, entityId, { limit, offset });
      return NextResponse.json(result);
    }

    // Otherwise get recent logs with optional filters
    const logs = await auditService.getRecent({
      entityType: entityType || undefined,
      action: action as any || undefined,
      userId: userId || undefined,
      limit,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('[Governance API] Audit error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
