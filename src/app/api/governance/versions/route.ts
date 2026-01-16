/**
 * Governance API - Entity Versions
 * 
 * READ-ONLY endpoints for viewing entity version history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { versionService } from '@/lib/services/governance';

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
    const versionNumber = searchParams.get('version');
    const atDate = searchParams.get('atDate');
    const compareWith = searchParams.get('compareWith');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    // Get version at specific date
    if (atDate) {
      const date = new Date(atDate);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      }
      const version = await versionService.getVersionAt(entityType, entityId, date);
      return NextResponse.json({ version });
    }

    // Get specific version
    if (versionNumber) {
      const version = await versionService.getVersion(
        entityType,
        entityId,
        parseInt(versionNumber)
      );
      
      // Compare with another version if requested
      if (compareWith && version) {
        const diff = await versionService.compareVersions(
          entityType,
          entityId,
          parseInt(versionNumber),
          parseInt(compareWith)
        );
        return NextResponse.json({ version, diff });
      }
      
      return NextResponse.json({ version });
    }

    // Get version history
    const history = await versionService.getHistory(entityType, entityId, { limit, offset });
    return NextResponse.json(history);
  } catch (error) {
    console.error('[Governance API] Versions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}
