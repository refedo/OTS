import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'all';
    const buildingId = searchParams.get('buildingId') || 'all';

    // Build where clause for filtering
    const whereClause: any = {};
    
    if (projectId !== 'all') {
      whereClause.projectId = projectId;
    }
    
    if (buildingId !== 'all') {
      whereClause.buildingId = buildingId;
    }

    // Fetch project and building info for display
    let projectInfo = { projectNumber: 'All Projects', name: '' };
    let buildingInfo = 'All Buildings';

    if (projectId !== 'all') {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { projectNumber: true, name: true },
      });
      if (project) {
        projectInfo = project;
      }
    }

    if (buildingId !== 'all') {
      const building = await prisma.building.findUnique({
        where: { id: buildingId },
        select: { designation: true, name: true },
      });
      if (building) {
        buildingInfo = `${building.designation} - ${building.name}`;
      }
    }

    // Fetch all assembly parts based on filters
    const parts = await prisma.assemblyPart.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            projectNumber: true,
            name: true,
          },
        },
        building: {
          select: {
            designation: true,
            name: true,
          },
        },
        productionLogs: {
          select: {
            processType: true,
            processedQty: true,
          },
        },
      },
      orderBy: [
        { assemblyMark: 'asc' },
        { partMark: 'asc' },
      ],
    });

    // Process types to track
    const processTypes = [
      'Preparation',
      'Fit-up',
      'Welding',
      'Visualization',
      'Sandblasting',
      'Painting',
      'Galvanization',
    ];

    // Calculate status for each part
    const statusData = parts.map((part) => {
      const processes: { [key: string]: { processed: number; percentage: number } } = {};
      
      // Calculate processed quantity and percentage for each process
      processTypes.forEach((processType) => {
        const logs = part.productionLogs.filter((log) => log.processType === processType);
        const processed = logs.reduce((sum, log) => sum + log.processedQty, 0);
        const percentage = part.quantity > 0 ? Math.round((processed / part.quantity) * 100) : 0;
        
        processes[processType] = {
          processed,
          percentage: Math.min(percentage, 100), // Cap at 100%
        };
      });

      // Calculate total processed quantity (using the minimum across all processes)
      const processedQty = Math.min(
        ...processTypes.map((pt) => processes[pt].processed),
        part.quantity
      );

      return {
        id: part.id,
        partDesignation: part.partDesignation,
        assemblyMark: part.assemblyMark,
        partMark: part.partMark,
        name: part.name,
        profile: part.profile,
        quantity: part.quantity,
        processedQty,
        weight: part.netWeightTotal,
        processes,
      };
    });

    return NextResponse.json({
      project: {
        projectNumber: projectInfo.projectNumber,
        name: projectInfo.name,
        building: buildingInfo,
      },
      parts: statusData,
    });
  } catch (error) {
    console.error('Error fetching production status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch production status' },
      { status: 500 }
    );
  }
}
