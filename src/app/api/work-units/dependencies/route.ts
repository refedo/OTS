/**
 * WorkUnit Dependencies API Routes
 * 
 * GET /api/work-units/dependencies - List dependencies with filters
 * POST /api/work-units/dependencies - Create a new dependency
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { WorkUnitDependencyService } from '@/lib/services/work-unit-dependency.service';
import { DependencyType } from '@prisma/client';

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
      projectId: searchParams.get('projectId') || undefined,
      fromWorkUnitId: searchParams.get('fromWorkUnitId') || undefined,
      toWorkUnitId: searchParams.get('toWorkUnitId') || undefined,
      dependencyType: searchParams.get('dependencyType') as DependencyType | undefined,
    };

    const dependencies = await WorkUnitDependencyService.list(filters);

    return NextResponse.json({
      data: dependencies,
      count: dependencies.length,
    });
  } catch (error) {
    console.error('Error listing dependencies:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list dependencies' },
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
    if (!body.fromWorkUnitId || !body.toWorkUnitId) {
      return NextResponse.json(
        { error: 'Missing required fields: fromWorkUnitId and toWorkUnitId' },
        { status: 400 }
      );
    }

    // Validate dependencyType if provided
    if (body.dependencyType && !Object.values(DependencyType).includes(body.dependencyType)) {
      return NextResponse.json(
        { error: `Invalid dependencyType. Must be one of: ${Object.values(DependencyType).join(', ')}` },
        { status: 400 }
      );
    }

    const dependency = await WorkUnitDependencyService.create({
      fromWorkUnitId: body.fromWorkUnitId,
      toWorkUnitId: body.toWorkUnitId,
      dependencyType: body.dependencyType,
      lagDays: body.lagDays,
    });

    return NextResponse.json(dependency, { status: 201 });
  } catch (error) {
    console.error('Error creating dependency:', error);

    // Handle specific error cases
    const message = error instanceof Error ? error.message : 'Failed to create dependency';
    const status = message.includes('circular') || message.includes('already exists') ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
