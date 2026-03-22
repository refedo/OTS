import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  projectId: z.string().optional(),
  buildingId: z.string().optional(),
});

export const GET = withApiContext<any>(async (req, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url!);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { projectId, buildingId } = parsed.data;

  type WeightRow = {
    projectNumber: string | null;
    projectName: string | null;
    buildingName: string | null;
    status: string | null;
    totalWeight: string | null;
    itemCount: bigint;
  };

  let results: WeightRow[];

  if (projectId && buildingId) {
    results = await prisma.$queryRaw<WeightRow[]>`
      SELECT p.projectNumber, p.name AS projectName,
        COALESCE(b.name, e.buildingNameRaw, 'Unknown') AS buildingName,
        e.status, SUM(e.totalWeight) AS totalWeight, COUNT(*) AS itemCount
      FROM lcr_entries e
      LEFT JOIN Project p ON e.projectId = p.id
      LEFT JOIN Building b ON e.buildingId = b.id
      WHERE e.isDeleted = false AND e.totalWeight > 0
        AND e.projectId = ${projectId} AND e.buildingId = ${buildingId}
      GROUP BY p.projectNumber, p.name, COALESCE(b.name, e.buildingNameRaw, 'Unknown'), e.status
      ORDER BY p.projectNumber, buildingName
    `;
  } else if (projectId) {
    results = await prisma.$queryRaw<WeightRow[]>`
      SELECT p.projectNumber, p.name AS projectName,
        COALESCE(b.name, e.buildingNameRaw, 'Unknown') AS buildingName,
        e.status, SUM(e.totalWeight) AS totalWeight, COUNT(*) AS itemCount
      FROM lcr_entries e
      LEFT JOIN Project p ON e.projectId = p.id
      LEFT JOIN Building b ON e.buildingId = b.id
      WHERE e.isDeleted = false AND e.totalWeight > 0 AND e.projectId = ${projectId}
      GROUP BY p.projectNumber, p.name, COALESCE(b.name, e.buildingNameRaw, 'Unknown'), e.status
      ORDER BY p.projectNumber, buildingName
    `;
  } else if (buildingId) {
    results = await prisma.$queryRaw<WeightRow[]>`
      SELECT p.projectNumber, p.name AS projectName,
        COALESCE(b.name, e.buildingNameRaw, 'Unknown') AS buildingName,
        e.status, SUM(e.totalWeight) AS totalWeight, COUNT(*) AS itemCount
      FROM lcr_entries e
      LEFT JOIN Project p ON e.projectId = p.id
      LEFT JOIN Building b ON e.buildingId = b.id
      WHERE e.isDeleted = false AND e.totalWeight > 0 AND e.buildingId = ${buildingId}
      GROUP BY p.projectNumber, p.name, COALESCE(b.name, e.buildingNameRaw, 'Unknown'), e.status
      ORDER BY p.projectNumber, buildingName
    `;
  } else {
    results = await prisma.$queryRaw<WeightRow[]>`
      SELECT p.projectNumber, p.name AS projectName,
        COALESCE(b.name, e.buildingNameRaw, 'Unknown') AS buildingName,
        e.status, SUM(e.totalWeight) AS totalWeight, COUNT(*) AS itemCount
      FROM lcr_entries e
      LEFT JOIN Project p ON e.projectId = p.id
      LEFT JOIN Building b ON e.buildingId = b.id
      WHERE e.isDeleted = false AND e.totalWeight > 0
      GROUP BY p.projectNumber, p.name, COALESCE(b.name, e.buildingNameRaw, 'Unknown'), e.status
      ORDER BY p.projectNumber, buildingName
    `;
  }

  // Group by project+building and compute percentages
  const grouped = new Map<string, {
    projectNumber: string;
    projectName: string;
    buildingName: string;
    totalWeight: number;
    bought: number;
    underRequest: number;
    availableAtFactory: number;
    other: number;
  }>();

  for (const row of results) {
    const key = `${row.projectNumber ?? 'Unknown'}__${row.buildingName ?? 'Unknown'}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        projectNumber: row.projectNumber ?? 'Unknown',
        projectName: row.projectName ?? '',
        buildingName: row.buildingName ?? 'Unknown',
        totalWeight: 0,
        bought: 0,
        underRequest: 0,
        availableAtFactory: 0,
        other: 0,
      });
    }
    const entry = grouped.get(key)!;
    const w = row.totalWeight ? parseFloat(row.totalWeight) : 0;
    const status = (row.status ?? '').toLowerCase();
    entry.totalWeight += w;
    if (status === 'bought') entry.bought += w;
    else if (status === 'under request') entry.underRequest += w;
    else if (status === 'available at factory') entry.availableAtFactory += w;
    else entry.other += w;
  }

  const data = Array.from(grouped.values()).map(g => ({
    ...g,
    boughtPct: g.totalWeight > 0 ? Math.round((g.bought / g.totalWeight) * 100) : 0,
    underRequestPct: g.totalWeight > 0 ? Math.round((g.underRequest / g.totalWeight) * 100) : 0,
    availableAtFactoryPct: g.totalWeight > 0 ? Math.round((g.availableAtFactory / g.totalWeight) * 100) : 0,
    otherPct: g.totalWeight > 0 ? Math.round((g.other / g.totalWeight) * 100) : 0,
  }));

  return NextResponse.json(data);
});
