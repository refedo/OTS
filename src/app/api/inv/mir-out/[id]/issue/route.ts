import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { logActivity } from '@/lib/api-utils';
import { issueStock, InsufficientStockError } from '@/lib/services/inv/inv-stock.service';
import { postCostAllocationToFinance } from '@/lib/services/inv/inv-stubs.service';

const IssueSchema = z.object({
  lines: z.array(z.object({
    lineId: z.string().uuid(),
    qtyIssued: z.number().positive(),
  })).min(1),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const parsed = IssueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const mirOut = await prisma.invMirOut.findFirst({
      where: { id, deletedAt: null },
      include: {
        lines: {
          include: {
            item: { select: { minStockLevel: true } },
          },
        },
      },
    });

    if (!mirOut) return NextResponse.json({ error: 'MIR-OUT not found' }, { status: 404 });

    const issuable = ['DRAFT', 'APPROVED', 'PARTIALLY_ISSUED'];
    if (!issuable.includes(mirOut.status)) {
      return NextResponse.json({ error: `Cannot issue from MIR-OUT in status: ${mirOut.status}` }, { status: 422 });
    }
    // RAW MATERIAL can be issued from DRAFT; CONSUMABLE requires APPROVED
    if (mirOut.materialType === 'CONSUMABLE' && mirOut.status === 'DRAFT') {
      return NextResponse.json({ error: 'Consumable requests must be approved before issuing' }, { status: 422 });
    }

    // Execute one $transaction per line
    const results = [];
    for (const issueLine of parsed.data.lines) {
      const dbLine = mirOut.lines.find(l => l.id === issueLine.lineId);
      if (!dbLine) {
        return NextResponse.json({ error: `Line ${issueLine.lineId} not found` }, { status: 404 });
      }
      if (dbLine.status === 'ISSUED' || dbLine.status === 'CANCELLED') {
        return NextResponse.json({ error: `Line is already ${dbLine.status}` }, { status: 422 });
      }

      try {
        await prisma.$transaction(async tx => {
          const { isLowStock } = await issueStock(tx, {
            warehouseId: dbLine.warehouseId,
            itemId: dbLine.itemId,
            qty: issueLine.qtyIssued,
            referenceId: mirOut.id,
            referenceNo: mirOut.mirOutNumber,
            projectId: mirOut.projectId,
            locationId: mirOut.locationId,
            performedById: session.userId,
          });

          const newStatus = issueLine.qtyIssued >= dbLine.qtyRequested ? 'ISSUED' : 'PARTIAL';
          await tx.invMirOutLine.update({
            where: { id: dbLine.id },
            data: {
              qtyIssued: dbLine.qtyIssued + issueLine.qtyIssued,
              status: newStatus,
            },
          });

          results.push({ lineId: dbLine.id, status: newStatus, isLowStock });
        });
      } catch (err) {
        if (err instanceof InsufficientStockError) {
          return NextResponse.json({
            error: err.message,
            available: err.available,
            requested: err.requested,
          }, { status: 422 });
        }
        throw err;
      }
    }

    // Re-evaluate MIR-OUT status
    const allLines = await prisma.invMirOutLine.findMany({
      where: { mirOutId: id },
      select: { status: true },
    });

    const allIssued = allLines.every(l => l.status === 'ISSUED' || l.status === 'CANCELLED');
    const someIssued = allLines.some(l => l.status === 'ISSUED' || l.status === 'PARTIAL');
    const newStatus = allIssued ? 'CLOSED' : someIssued ? 'PARTIALLY_ISSUED' : 'DRAFT';

    await prisma.invMirOut.update({
      where: { id },
      data: {
        status: newStatus,
        issuedAt: new Date(),
        issuedById: session.userId,
        closedAt: allIssued ? new Date() : null,
      },
    });

    // Stub: notify financial module
    postCostAllocationToFinance(id);

    await logActivity({
      action: 'UPDATE',
      entityType: 'InvMirOut',
      entityId: id,
      entityName: mirOut.mirOutNumber,
      userId: session.userId,
    });

    logger.info({ mirOutId: id, newStatus, lines: results.length }, '[INV] MIR-OUT stock issued');
    return NextResponse.json({ status: newStatus, lines: results });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to issue MIR-OUT stock');
    return NextResponse.json({ error: 'Failed to issue stock' }, { status: 500 });
  }
}
