/**
 * WorkUnit API Routes
 * 
 * GET /api/work-units - List WorkUnits with filters
 * POST /api/work-units - Create a new WorkUnit
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { WorkUnitService } from '@/lib/services/work-unit.service';
import { WorkUnitType, WorkUnitStatus } from '@prisma/client';

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

    // Parse filters
    const filters = {
      projectId: searchParams.get('projectId') || undefined,
      type: searchParams.get('type') as WorkUnitType | undefined,
      status: searchParams.get('status') as WorkUnitStatus | undefined,
      ownerId: searchParams.get('ownerId') || undefined,
      referenceModule: searchParams.get('referenceModule') || undefined,
      plannedStartFrom: searchParams.get('plannedStartFrom')
        ? new Date(searchParams.get('plannedStartFrom')!)
        : undefined,
      plannedStartTo: searchParams.get('plannedStartTo')
        ? new Date(searchParams.get('plannedStartTo')!)
        : undefined,
      plannedEndFrom: searchParams.get('plannedEndFrom')
        ? new Date(searchParams.get('plannedEndFrom')!)
        : undefined,
      plannedEndTo: searchParams.get('plannedEndTo')
        ? new Date(searchParams.get('plannedEndTo')!)
        : undefined,
    };

    // Parse pagination
    const pagination = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      sortBy: searchParams.get('sortBy') || 'plannedStart',
      sortOrder: (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc',
    };

    const result = await WorkUnitService.list(filters, pagination);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing WorkUnits:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list WorkUnits' },
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
    const requiredFields = [
      'projectId',
      'type',
      'referenceModule',
      'referenceId',
      'ownerId',
      'plannedStart',
      'plannedEnd',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate type enum
    if (!Object.values(WorkUnitType).includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${Object.values(WorkUnitType).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate status enum if provided
    if (body.status && !Object.values(WorkUnitStatus).includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${Object.values(WorkUnitStatus).join(', ')}` },
        { status: 400 }
      );
    }

    const workUnit = await WorkUnitService.create({
      projectId: body.projectId,
      type: body.type,
      referenceModule: body.referenceModule,
      referenceId: body.referenceId,
      ownerId: body.ownerId,
      plannedStart: new Date(body.plannedStart),
      plannedEnd: new Date(body.plannedEnd),
      actualStart: body.actualStart ? new Date(body.actualStart) : null,
      actualEnd: body.actualEnd ? new Date(body.actualEnd) : null,
      quantity: body.quantity ?? null,
      weight: body.weight ?? null,
      status: body.status,
    });

    return NextResponse.json(workUnit, { status: 201 });
  } catch (error) {
    console.error('Error creating WorkUnit:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create WorkUnit' },
      { status: 500 }
    );
  }
}
