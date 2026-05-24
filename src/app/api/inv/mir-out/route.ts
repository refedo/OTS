import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '@/lib/api-utils';
import { nextMirOutNumber } from '@/lib/services/inv/inv-sequence.service';

const LineSchema = z.object({
  itemId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  qtyRequested: z.number().positive(),
});

const CreateSchema = z.object({
  materialType: z.enum(['RAW_MATERIAL', 'CONSUMABLE']),
  siteId: z.string().min(1).max(10),
  projectId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid(),
  notes: z.string().optional().nullable(),
  lines: z.array(LineSchema).min(1),
});

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
    const status = searchParams.get('status');
    const materialType = searchParams.get('materialType');
    const siteId = searchParams.get('siteId');
    const projectId = searchParams.get('projectId');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);

    const where: Record<string, unknown> = { deletedAt: null };
    if (status) where.status = status;
    if (materialType) where.materialType = materialType;
    if (siteId) where.siteId = siteId;
    if (projectId) where.projectId = projectId;
    if (search) where.mirOutNumber = { contains: search };
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.createdAt = dateFilter;
    }

    const [mirOuts, total] = await Promise.all([
      prisma.invMirOut.findMany({
        where,
        include: {
          requestedBy: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invMirOut.count({ where }),
    ]);

    return NextResponse.json({ mirOuts, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to fetch MIR-OUTs');
    return NextResponse.json({ error: 'Failed to fetch MIR-OUTs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Validate: RAW_MATERIAL requires projectId
    if (data.materialType === 'RAW_MATERIAL' && !data.projectId) {
      return NextResponse.json({ error: 'Project is required for Raw Material requests' }, { status: 422 });
    }

    // Validate: Project must be ACTIVE
    if (data.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: data.projectId, deletedAt: null },
        select: { id: true, status: true, projectNumber: true },
      });
      if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      if (project.status !== 'Active') {
        return NextResponse.json({ error: 'Project must be Active to issue materials against it' }, { status: 422 });
      }
    }

    // Validate: Location exists and matches siteId
    const location = await prisma.invLocation.findFirst({
      where: { id: data.locationId, siteId: data.siteId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (!location) return NextResponse.json({ error: 'Production location not found for this factory' }, { status: 404 });

    // Validate: All warehouses match siteId + check available balance
    for (const line of data.lines) {
      const warehouse = await prisma.invWarehouse.findFirst({
        where: { id: line.warehouseId, siteId: data.siteId, deletedAt: null, isActive: true },
        select: { id: true },
      });
      if (!warehouse) {
        return NextResponse.json({ error: `Warehouse not found for factory ${data.siteId}` }, { status: 404 });
      }

      const balance = await prisma.invStockBalance.findUnique({
        where: { warehouseId_itemId: { warehouseId: line.warehouseId, itemId: line.itemId } },
        select: { quantity: true },
      });
      const available = balance?.quantity ?? 0;
      if (line.qtyRequested > available) {
        const item = await prisma.invItem.findUnique({ where: { id: line.itemId }, select: { code: true, name: true } });
        return NextResponse.json({
          error: `Insufficient stock for ${item?.code || line.itemId}: requested ${line.qtyRequested}, available ${available}`,
          available,
        }, { status: 422 });
      }
    }

    const year = new Date().getFullYear();
    const mirOutNumber = await nextMirOutNumber(year);

    const mirOut = await prisma.invMirOut.create({
      data: {
        id: uuidv4(),
        mirOutNumber,
        materialType: data.materialType,
        siteId: data.siteId,
        projectId: data.projectId ?? null,
        locationId: data.locationId,
        status: 'DRAFT',
        notes: data.notes ?? null,
        requestedById: session.userId,
        lines: {
          create: data.lines.map(line => ({
            id: uuidv4(),
            itemId: line.itemId,
            warehouseId: line.warehouseId,
            qtyRequested: line.qtyRequested,
            qtyIssued: 0,
            status: 'PENDING',
          })),
        },
      },
      select: { id: true, mirOutNumber: true, status: true, materialType: true },
    });

    // Consumable: auto-submit to PENDING_APPROVAL
    if (data.materialType === 'CONSUMABLE') {
      await prisma.invMirOut.update({
        where: { id: mirOut.id },
        data: {
          status: 'PENDING_APPROVAL',
          submittedAt: new Date(),
          submittedById: session.userId,
        },
      });
      mirOut.status = 'PENDING_APPROVAL';
    }

    await logActivity({
      action: 'CREATE',
      entityType: 'InvMirOut',
      entityId: mirOut.id,
      entityName: mirOutNumber,
      userId: session.userId,
    });

    logger.info({ mirOutId: mirOut.id, mirOutNumber }, '[INV] MIR-OUT created');
    return NextResponse.json(mirOut, { status: 201 });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to create MIR-OUT');
    return NextResponse.json({ error: 'Failed to create MIR-OUT' }, { status: 500 });
  }
}
