/**
 * ResourceCapacity Analysis API Route
 * 
 * GET /api/resource-capacity/[id]/analysis - Get capacity vs load analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { ResourceCapacityService } from '@/lib/services/resource-capacity.service';

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

    const analysis = await ResourceCapacityService.analyzeCapacityVsLoad(
      params.id,
      startDate,
      endDate
    );

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error analyzing resource capacity:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze resource capacity' },
      { status: 500 }
    );
  }
}
