import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { systemEventService } from '@/services/system-events.service';

// GET - Fetch Initiatives
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const status = searchParams.get('status');
    const objectiveId = searchParams.get('objectiveId');

    const where: any = {};
    if (year) where.year = parseInt(year);
    if (status) where.status = status;
    if (objectiveId) where.objectiveId = objectiveId;

    const initiatives = await prisma.annualInitiative.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        objective: { select: { id: true, title: true } },
        objectives: {
          include: {
            objective: { select: { id: true, title: true, category: true } },
          },
        },
      },
      orderBy: [{ year: 'desc' }, { startDate: 'asc' }],
    });

    return NextResponse.json(initiatives);
  } catch (error) {
    console.error('Error fetching initiatives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch initiatives' },
      { status: 500 }
    );
  }
}

// POST - Create Initiative
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      objectiveId,
      objectiveIds,
      year,
      startDate,
      endDate,
      budget,
      ownerId,
      status,
    } = body;

    // Use first objectiveId for backward compatibility
    const primaryObjectiveId = objectiveIds?.length > 0 ? objectiveIds[0] : objectiveId;

    const initiative = await prisma.annualInitiative.create({
      data: {
        name,
        description,
        objectiveId: primaryObjectiveId || null,
        year: year || new Date().getFullYear(),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ? parseFloat(budget) : null,
        ownerId,
        status: status || 'Planned',
      },
    });

    // Create junction table entries for all objectives
    const allObjectiveIds = objectiveIds?.length > 0 ? objectiveIds : (objectiveId ? [objectiveId] : []);
    if (allObjectiveIds.length > 0) {
      await prisma.initiativeObjective.createMany({
        data: allObjectiveIds.map((objId: string, index: number) => ({
          initiativeId: initiative.id,
          objectiveId: objId,
          isPrimary: index === 0,
        })),
        skipDuplicates: true,
      });
    }

    // Fetch the complete initiative with relations
    const result = await prisma.annualInitiative.findUnique({
      where: { id: initiative.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        objective: { select: { id: true, title: true } },
        objectives: {
          include: {
            objective: { select: { id: true, title: true, category: true } },
          },
        },
      },
    });

    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    systemEventService.logBusiness('BIZ_INITIATIVE_CREATED', initiative.id, {
      entityType: 'AnnualInitiative',
      entityName: name,
      userId: session?.sub,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating initiative:', error);
    return NextResponse.json(
      { error: 'Failed to create initiative' },
      { status: 500 }
    );
  }
}

// PUT - Update Initiative
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Initiative ID required' }, { status: 400 });
    }

    const {
      name,
      description,
      objectiveId,
      objectiveIds,
      year,
      startDate,
      endDate,
      budget,
      ownerId,
      status,
    } = body;

    // Use first objectiveId for backward compatibility
    const primaryObjectiveId = objectiveIds?.length > 0 ? objectiveIds[0] : objectiveId;

    await prisma.annualInitiative.update({
      where: { id },
      data: {
        name,
        description,
        objectiveId: primaryObjectiveId || null,
        year,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ? parseFloat(budget) : null,
        ownerId,
        status,
      },
    });

    // Sync junction table: delete old entries and create new ones
    const allObjectiveIds = objectiveIds?.length > 0 ? objectiveIds : (objectiveId ? [objectiveId] : []);
    await prisma.initiativeObjective.deleteMany({ where: { initiativeId: id } });
    if (allObjectiveIds.length > 0) {
      await prisma.initiativeObjective.createMany({
        data: allObjectiveIds.map((objId: string, index: number) => ({
          initiativeId: id,
          objectiveId: objId,
          isPrimary: index === 0,
        })),
        skipDuplicates: true,
      });
    }

    // Fetch the complete initiative with relations
    const result = await prisma.annualInitiative.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        objective: { select: { id: true, title: true } },
        objectives: {
          include: {
            objective: { select: { id: true, title: true, category: true } },
          },
        },
      },
    });

    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    systemEventService.logBusiness('BIZ_INITIATIVE_UPDATED', id, {
      entityType: 'AnnualInitiative',
      entityName: name,
      userId: session?.sub,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating initiative:', error);
    return NextResponse.json(
      { error: 'Failed to update initiative' },
      { status: 500 }
    );
  }
}

// DELETE - Delete Initiative
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Initiative ID required' }, { status: 400 });
    }

    await prisma.annualInitiative.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting initiative:', error);
    return NextResponse.json(
      { error: 'Failed to delete initiative' },
      { status: 500 }
    );
  }
}
