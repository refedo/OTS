import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logActivity } from '@/lib/api-utils';

export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const projectId = searchParams.get('projectId') || '';

  const buildings = await prisma.building.findMany({
    where: {
      ...(search && {
        OR: [
          { designation: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(projectId && { projectId }),
    },
    include: {
      project: {
        select: {
          id: true,
          projectNumber: true,
          name: true,
          status: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [
      { project: { projectNumber: 'asc' } },
      { designation: 'asc' },
    ],
  });

  return NextResponse.json(buildings);
}

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, name, designation, description, startDate, endDate } = body;

    if (!projectId || !name || !designation) {
      return NextResponse.json(
        { error: 'Project ID, name, and designation are required' },
        { status: 400 }
      );
    }

    const building = await prisma.building.create({
      data: {
        projectId,
        name,
        designation,
        description: description || null,
      },
      include: {
        project: { select: { projectNumber: true } },
      },
    });

    // Log audit trail
    await logActivity({
      action: 'CREATE',
      entityType: 'Building',
      entityId: building.id,
      entityName: `${building.designation} - ${building.name}`,
      userId: session.sub,
      projectId: building.projectId,
      metadata: { designation: building.designation, projectNumber: building.project?.projectNumber },
    });

    return NextResponse.json(building);
  } catch (error) {
    console.error('Error creating building:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create building',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Building IDs are required' },
        { status: 400 }
      );
    }

    // Check if any buildings have assembly parts
    const buildingsWithParts = await prisma.building.findMany({
      where: {
        id: { in: ids },
        assemblyParts: { some: {} },
      },
      select: {
        id: true,
        name: true,
        designation: true,
        _count: { select: { assemblyParts: true } },
      },
    });

    if (buildingsWithParts.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete buildings with assembly parts',
          details: `${buildingsWithParts.length} building(s) have assembly parts and cannot be deleted`,
          buildingsWithParts: buildingsWithParts.map(b => ({
            name: b.name,
            designation: b.designation,
            partsCount: b._count.assemblyParts,
          })),
        },
        { status: 400 }
      );
    }

    // Get building info for logging before deletion
    const buildingsToDelete = await prisma.building.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, designation: true, projectId: true },
    });

    // Delete buildings
    const result = await prisma.building.deleteMany({
      where: { id: { in: ids } },
    });

    // Log audit trail for each deleted building
    for (const b of buildingsToDelete) {
      await logActivity({
        action: 'DELETE',
        entityType: 'Building',
        entityId: b.id,
        entityName: `${b.designation} - ${b.name}`,
        userId: session.sub,
        projectId: b.projectId,
        reason: 'Building deleted',
      });
    }

    return NextResponse.json({ 
      success: true, 
      deleted: result.count,
      message: `Successfully deleted ${result.count} building(s)`,
    });
  } catch (error) {
    console.error('Error deleting buildings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete buildings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
