import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }

    // Get all parts for the building
    const parts = await prisma.assemblyPart.findMany({
      where: {
        buildingId,
      },
      select: {
        id: true,
        partDesignation: true,
        assemblyMark: true,
        partMark: true,
        name: true,
        quantity: true,
        netWeightTotal: true,
        status: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Group parts by name (e.g., "GABLE ANGLE", "BEAM", "COLUMN", etc.)
    const grouped: { [key: string]: any[] } = {};
    const groupStats: { [key: string]: { count: number; weight: number } } = {};

    parts.forEach(part => {
      const group = part.name || 'Ungrouped';
      
      if (!grouped[group]) {
        grouped[group] = [];
        groupStats[group] = { count: 0, weight: 0 };
      }
      
      grouped[group].push(part);
      groupStats[group].count++;
      groupStats[group].weight += Number(part.netWeightTotal) || 0;
    });

    // Convert to array format
    const groupedArray = Object.keys(grouped).map(groupName => ({
      groupName,
      parts: grouped[groupName],
      count: groupStats[groupName].count,
      totalWeight: groupStats[groupName].weight,
    }));

    // Sort groups by name
    groupedArray.sort((a, b) => a.groupName.localeCompare(b.groupName));

    return NextResponse.json(groupedArray);
  } catch (error) {
    console.error('Error fetching grouped parts:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch grouped parts', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
