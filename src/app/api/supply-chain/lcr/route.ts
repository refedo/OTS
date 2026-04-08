import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  projectId: z.string().optional(),
  buildingId: z.string().optional(),
  status: z.string().optional(),
  resolutionStatus: z.enum(['pending', 'resolved']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  itemSearch: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(10000).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const GET = withApiContext<any>(async (req, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url!);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId, buildingId, status, resolutionStatus, dateFrom, dateTo, itemSearch, page, limit, sortBy, sortOrder } = parsed.data;

  const where: Prisma.LcrEntryWhereInput = {
    isDeleted: false,
    ...(projectId && { projectId }),
    ...(buildingId && { buildingId }),
    ...(status && { status }),
    ...(resolutionStatus && { resolutionStatus }),
    ...(itemSearch && {
      OR: [
        { itemLabel: { contains: itemSearch } },
        { poNumber: { contains: itemSearch } },
        { dnNumber: { contains: itemSearch } },
        { projectNumber: { contains: itemSearch } },
        { buildingNameRaw: { contains: itemSearch } },
        { awardedToRaw: { contains: itemSearch } },
        { sn: { contains: itemSearch } },
        { mrfNumber: { contains: itemSearch } },
        { thickness: { contains: itemSearch } },
        { project: { projectNumber: { contains: itemSearch } } },
        { project: { name: { contains: itemSearch } } },
        { building: { name: { contains: itemSearch } } },
        { building: { designation: { contains: itemSearch } } },
      ],
    }),
    ...(dateFrom || dateTo
      ? {
          neededToDate: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }
      : {}),
  };

  const skip = (page - 1) * limit;

  // Build orderBy based on sortBy parameter
  let orderBy: any = [{ createdAt: 'asc' }];
  let sortBySn = !sortBy || sortBy === 'sn';
  let snDir: 'asc' | 'desc' = 'asc';

  if (sortBy && sortOrder) {
    const direction = sortOrder;
    switch (sortBy) {
      case 'sn':
        sortBySn = true;
        snDir = direction;
        break;
      case 'project':
        orderBy = [{ projectNumber: direction }, { createdAt: 'desc' }];
        break;
      case 'building':
        orderBy = [{ buildingNameRaw: direction }, { createdAt: 'desc' }];
        break;
      case 'item':
        orderBy = [{ itemLabel: direction }, { createdAt: 'desc' }];
        break;
      case 'qty':
        orderBy = [{ qty: direction }, { createdAt: 'desc' }];
        break;
      case 'amount':
        orderBy = [{ amount: direction }, { createdAt: 'desc' }];
        break;
      case 'status':
        orderBy = [{ status: direction }, { createdAt: 'desc' }];
        break;
      case 'po':
        orderBy = [{ poNumber: direction }, { createdAt: 'desc' }];
        break;
      case 'supplier':
        orderBy = [{ awardedToRaw: direction }, { createdAt: 'desc' }];
        break;
      case 'neededBy':
        orderBy = [{ neededToDate: direction }, { createdAt: 'desc' }];
        break;
    }
  }

  // For SN sort, fetch IDs with raw SQL numeric cast then load full records
  let data;
  let total: number;

  if (sortBySn) {
    total = await prisma.lcrEntry.count({ where });

    // Get sorted IDs using raw SQL for numeric SN ordering
    const dir = snDir === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    const ids: { id: string }[] = await prisma.$queryRaw`
      SELECT id FROM lcr_entries
      WHERE isDeleted = 0
      ${projectId ? Prisma.sql`AND projectId = ${projectId}` : Prisma.empty}
      ${buildingId ? Prisma.sql`AND buildingId = ${buildingId}` : Prisma.empty}
      ${status ? Prisma.sql`AND status = ${status}` : Prisma.empty}
      ${resolutionStatus ? Prisma.sql`AND resolutionStatus = ${resolutionStatus}` : Prisma.empty}
      ORDER BY CAST(sn AS UNSIGNED) ${dir}, createdAt ASC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const idList = ids.map(r => r.id);
    if (idList.length > 0) {
      const entries = await prisma.lcrEntry.findMany({
        where: { id: { in: idList } },
        include: {
          project: { select: { id: true, projectNumber: true, name: true } },
          building: { select: { id: true, name: true, designation: true } },
        },
      });
      // Maintain the raw SQL sort order
      const orderMap = new Map(idList.map((id, i) => [id, i]));
      data = entries.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    } else {
      data = [];
    }
  } else {
    [data, total] = await Promise.all([
      prisma.lcrEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          project: { select: { id: true, projectNumber: true, name: true } },
          building: { select: { id: true, name: true, designation: true } },
        },
      }),
      prisma.lcrEntry.count({ where }),
    ]);
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
