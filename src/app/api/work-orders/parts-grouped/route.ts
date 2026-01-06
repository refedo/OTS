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

    // Get all parts for the building with production logs
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
        productionLogs: {
          select: {
            id: true,
            processType: true,
            processedQty: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Group parts by name (e.g., "GABLE ANGLE", "BEAM", "COLUMN", etc.)
    const grouped: { [key: string]: any[] } = {};
    const groupStats: { [key: string]: { count: number; weight: number; producedCount: number; totalQty: number; producedQty: number } } = {};

    parts.forEach(part => {
      const group = part.name || 'Ungrouped';
      
      if (!grouped[group]) {
        grouped[group] = [];
        groupStats[group] = { count: 0, weight: 0, producedCount: 0, totalQty: 0, producedQty: 0 };
      }
      
      // Check if part is fully produced (has production logs with total qty >= part qty)
      const totalProduced = part.productionLogs.reduce((sum, log) => sum + (log.processedQty || 0), 0);
      const isFullyProduced = totalProduced >= (part.quantity || 1);
      
      grouped[group].push({
        ...part,
        isFullyProduced,
        producedQty: totalProduced,
      });
      groupStats[group].count++;
      groupStats[group].weight += Number(part.netWeightTotal) || 0;
      groupStats[group].totalQty += part.quantity || 1;
      groupStats[group].producedQty += totalProduced;
      if (isFullyProduced) {
        groupStats[group].producedCount++;
      }
    });

    // Convert to array format with production progress
    const groupedArray = Object.keys(grouped).map(groupName => {
      const stats = groupStats[groupName];
      const isFullyProduced = stats.producedCount === stats.count && stats.count > 0;
      const progressPercent = stats.count > 0 ? Math.round((stats.producedCount / stats.count) * 100) : 0;
      
      return {
        groupName,
        parts: grouped[groupName],
        count: stats.count,
        totalWeight: stats.weight,
        producedCount: stats.producedCount,
        isFullyProduced,
        progressPercent,
      };
    });

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
