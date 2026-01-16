/**
 * ResourceCapacity Summary API Route
 * 
 * GET /api/resource-capacity/summary - Get capacity summary across all resource types
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { ResourceCapacityService } from '@/lib/services/resource-capacity.service';

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
    
    // Default to next 4 weeks if not specified
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    
    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const endDate = endDateStr 
      ? new Date(endDateStr) 
      : new Date(startDate.getTime() + 28 * 24 * 60 * 60 * 1000); // 4 weeks

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'startDate must be before endDate' },
        { status: 400 }
      );
    }

    const summary = await ResourceCapacityService.getCapacitySummary(startDate, endDate);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error getting capacity summary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get capacity summary' },
      { status: 500 }
    );
  }
}
