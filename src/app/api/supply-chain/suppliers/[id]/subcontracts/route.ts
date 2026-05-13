import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const GET = withApiContext(async (_req: NextRequest, session, context) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supplierId = Number(context?.params.id);
  if (!supplierId || isNaN(supplierId)) {
    return NextResponse.json({ error: 'Invalid supplier id' }, { status: 400 });
  }

  try {
    const contracts = await prisma.subcontractorContract.findMany({
      where: {
        deletedAt: null,
        supplier: { dolibarrId: supplierId },
      },
      select: {
        id: true,
        contractNumber: true,
        name: true,
        status: true,
        contractValue: true,
        currency: true,
        scopeTypes: true,
        createdAt: true,
        project: { select: { id: true, projectNumber: true, name: true } },
        building: { select: { id: true, designation: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      contracts: contracts.map(c => ({
        ...c,
        contractValue: Number(c.contractValue),
      })),
    });
  } catch (error) {
    logger.error({ error, supplierId }, '[Suppliers] Failed to fetch subcontracts');
    return NextResponse.json({ error: 'Failed to fetch subcontracts' }, { status: 500 });
  }
});
