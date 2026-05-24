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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const mirOut = await prisma.invMirOut.findFirst({
      where: { id, deletedAt: null },
      include: {
        requestedBy: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        issuedBy: { select: { id: true, name: true } },
        rejectedBy: { select: { id: true, name: true } },
        location: { select: { id: true, code: true, name: true, siteId: true } },
        lines: {
          include: {
            item: { select: { id: true, code: true, name: true, unit: true, category: true } },
            warehouse: { select: { id: true, code: true, name: true, type: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!mirOut) return NextResponse.json({ error: 'MIR-OUT not found' }, { status: 404 });

    // Build status timeline
    const timeline = [];
    if (mirOut.createdAt) {
      timeline.push({ step: 'DRAFT', label: 'Created', actor: mirOut.requestedBy, at: mirOut.createdAt });
    }
    if (mirOut.submittedAt && mirOut.submittedBy) {
      timeline.push({ step: 'SUBMITTED', label: 'Submitted for Approval', actor: mirOut.submittedBy, at: mirOut.submittedAt });
    }
    if (mirOut.approvedAt && mirOut.approvedBy) {
      timeline.push({ step: 'APPROVED', label: 'Approved', actor: mirOut.approvedBy, at: mirOut.approvedAt });
    }
    if (mirOut.issuedAt && mirOut.issuedBy) {
      timeline.push({ step: 'ISSUED', label: 'Issued to Production', actor: mirOut.issuedBy, at: mirOut.issuedAt });
    }
    if (mirOut.rejectedAt && mirOut.rejectedBy) {
      timeline.push({ step: 'REJECTED', label: 'Rejected', actor: mirOut.rejectedBy, at: mirOut.rejectedAt, note: mirOut.rejectionReason });
    }

    // Attach current balances to lines
    const linesWithBalance = await Promise.all(
      mirOut.lines.map(async line => {
        const bal = await prisma.invStockBalance.findUnique({
          where: { warehouseId_itemId: { warehouseId: line.warehouseId, itemId: line.itemId } },
          select: { quantity: true },
        });
        return { ...line, availableQty: bal?.quantity ?? 0 };
      })
    );

    return NextResponse.json({ ...mirOut, lines: linesWithBalance, timeline });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to fetch MIR-OUT detail');
    return NextResponse.json({ error: 'Failed to fetch MIR-OUT' }, { status: 500 });
  }
}
