/**
 * Governance API - Deleted Items
 * 
 * Endpoints for viewing and restoring soft-deleted items.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { softDeleteService, SOFT_DELETE_ENTITIES, type SoftDeleteEntity } from '@/lib/services/governance';

export async function GET(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType') as SoftDeleteEntity;
    const deletedAfter = searchParams.get('deletedAfter');
    const deletedBefore = searchParams.get('deletedBefore');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!entityType) {
      return NextResponse.json(
        { error: 'entityType is required', supportedTypes: SOFT_DELETE_ENTITIES },
        { status: 400 }
      );
    }

    if (!SOFT_DELETE_ENTITIES.includes(entityType)) {
      return NextResponse.json(
        { error: `Invalid entityType. Supported: ${SOFT_DELETE_ENTITIES.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await softDeleteService.getDeleted(entityType, {
      deletedAfter: deletedAfter ? new Date(deletedAfter) : undefined,
      deletedBefore: deletedBefore ? new Date(deletedBefore) : undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Governance API] Deleted items error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deleted items' },
      { status: 500 }
    );
  }
}

// Restore a deleted item
export async function POST(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    if (!SOFT_DELETE_ENTITIES.includes(entityType)) {
      return NextResponse.json(
        { error: `Invalid entityType. Supported: ${SOFT_DELETE_ENTITIES.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await softDeleteService.restore({
      entityType,
      entityId,
      userId: session.sub,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Item restored successfully' });
  } catch (error) {
    console.error('[Governance API] Restore error:', error);
    return NextResponse.json(
      { error: 'Failed to restore item' },
      { status: 500 }
    );
  }
}
