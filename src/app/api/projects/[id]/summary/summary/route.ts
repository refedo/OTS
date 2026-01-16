import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/:projectId/summary
 * Returns comprehensive project summary including basic info, tonnage, buildings count, and deadlines
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch project with all required relations
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        projectManager: {
          select: {
            id: true,
            name: true,
          },
        },
        salesEngineer: {
          select: {
            id: true,
            name: true,
          },
        },
        buildings: {
          select: {
            id: true,
            designation: true,
            name: true,
            assemblyParts: {
              select: {
                netWeightTotal: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Calculate total tonnage from all buildings
    const totalTonnage = project.buildings.reduce((sum, building) => {
      const buildingTonnage = building.assemblyParts.reduce(
        (partSum, part) => partSum + (Number(part.netWeightTotal) || 0),
        0
      );
      return sum + buildingTonnage;
    }, 0) / 1000; // Convert kg to tons

    const summary = {
      id: project.id,
      projectNumber: project.projectNumber,
      name: project.name,
      clientName: project.client.name,
      totalBuildings: project.buildings.length,
      totalTonnage: Math.round(totalTonnage * 100) / 100, // Round to 2 decimals
      startDate: project.actualStartDate || project.plannedStartDate,
      expectedCompletion: project.actualEndDate || project.plannedEndDate,
      contractDate: project.contractDate,
      status: project.status,
      projectManager: {
        id: project.projectManager.id,
        name: project.projectManager.name,
      },
      salesEngineer: project.salesEngineer ? {
        id: project.salesEngineer.id,
        name: project.salesEngineer.name,
      } : null,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching project summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project summary' },
      { status: 500 }
    );
  }
}
