import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    let itemId = searchParams.get('itemId');
    const dolibarrId = searchParams.get('dolibarrId');
    const warehouseId = searchParams.get('warehouseId');

    // Resolve itemId from dolibarrId if provided
    if (!itemId && dolibarrId) {
      const invItem = await prisma.invItem.findFirst({
        where: { dolibarrId: parseInt(dolibarrId, 10), deletedAt: null },
        select: { id: true },
      });
      if (invItem) itemId = invItem.id;
    }
    const movementType = searchParams.get('movementType');
    const direction = searchParams.get('direction');
    const projectId = searchParams.get('projectId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50', 10), 200);

    const where: Record<string, unknown> = {};
    if (itemId) where.itemId = itemId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (movementType) where.movementType = movementType;
    if (direction) where.direction = direction;
    if (projectId) where.projectId = projectId;

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.createdAt = dateFilter;
    }

    const [entries, total] = await Promise.all([
      prisma.invStockLedger.findMany({
        where,
        include: {
          warehouse: { select: { id: true, code: true, name: true, siteId: true } },
          item: { select: { id: true, code: true, name: true, unit: true } },
          location: { select: { id: true, code: true, name: true } },
          performedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invStockLedger.count({ where }),
    ]);

    // Enrich MIR entries with supplier name from receipt
    const mirReferenceIds = entries
      .filter(e => e.referenceType === 'MIR' && e.referenceId)
      .map(e => e.referenceId as string);

    const mirSupplierMap: Record<string, string> = {};
    if (mirReferenceIds.length > 0) {
      const mirReceipts = await prisma.materialInspectionReceipt.findMany({
        where: { id: { in: mirReferenceIds } },
        select: { id: true, supplierName: true },
      });
      for (const r of mirReceipts) {
        if (r.supplierName) mirSupplierMap[r.id] = r.supplierName;
      }
    }

    const enrichedEntries = entries.map(e => ({
      ...e,
      unitCost: e.unitCost ? Number(e.unitCost) : null,
      totalCost: e.totalCost ? Number(e.totalCost) : null,
      supplierName: e.referenceType === 'MIR' && e.referenceId ? (mirSupplierMap[e.referenceId] ?? null) : null,
    }));

    return NextResponse.json({
      entries: enrichedEntries,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to fetch ledger');
    return NextResponse.json({ error: 'Failed to fetch ledger' }, { status: 500 });
  }
}
