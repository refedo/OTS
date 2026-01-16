/**
 * ResourceCapacity API Routes
 * 
 * GET /api/resource-capacity - List all resource capacities
 * POST /api/resource-capacity - Create a new resource capacity
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { ResourceCapacityService } from '@/lib/services/resource-capacity.service';
import { ResourceType, CapacityUnit } from '@prisma/client';

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

    const filters = {
      resourceType: searchParams.get('resourceType') as ResourceType | undefined,
      isActive: searchParams.get('isActive') === 'true' ? true : 
                searchParams.get('isActive') === 'false' ? false : undefined,
    };

    const capacities = await ResourceCapacityService.list(filters);

    return NextResponse.json({
      data: capacities,
      count: capacities.length,
    });
  } catch (error) {
    console.error('Error listing resource capacities:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list resource capacities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.resourceType || !body.resourceName || body.capacityPerDay === undefined || !body.unit) {
      return NextResponse.json(
        { error: 'Missing required fields: resourceType, resourceName, capacityPerDay, unit' },
        { status: 400 }
      );
    }

    // Validate enums
    if (!Object.values(ResourceType).includes(body.resourceType)) {
      return NextResponse.json(
        { error: `Invalid resourceType. Must be one of: ${Object.values(ResourceType).join(', ')}` },
        { status: 400 }
      );
    }

    if (!Object.values(CapacityUnit).includes(body.unit)) {
      return NextResponse.json(
        { error: `Invalid unit. Must be one of: ${Object.values(CapacityUnit).join(', ')}` },
        { status: 400 }
      );
    }

    if (body.capacityPerDay <= 0) {
      return NextResponse.json(
        { error: 'capacityPerDay must be a positive number' },
        { status: 400 }
      );
    }

    const capacity = await ResourceCapacityService.create({
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      resourceName: body.resourceName,
      capacityPerDay: body.capacityPerDay,
      unit: body.unit,
      workingDaysPerWeek: body.workingDaysPerWeek,
      notes: body.notes,
    });

    return NextResponse.json(capacity, { status: 201 });
  } catch (error) {
    console.error('Error creating resource capacity:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create resource capacity' },
      { status: 500 }
    );
  }
}
