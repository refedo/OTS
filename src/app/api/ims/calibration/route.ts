import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('calibrationStatus');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {
      deletedAt: null,
      calibrationRequired: true,
    };

    if (status) where.calibrationStatus = status;
    if (search) where.name = { contains: search };

    const assets = await prisma.asset.findMany({
      where,
      select: {
        id: true,
        assetCode: true,
        name: true,
        category: true,
        make: true,
        model: true,
        serialNumber: true,
        calibrationRequired: true,
        calibrationFrequency: true,
        lastCalibratedAt: true,
        calibrationDueAt: true,
        calibrationCertRef: true,
        calibrationBody: true,
        calibrationStatus: true,
        location: true,
      },
      orderBy: [{ calibrationDueAt: 'asc' }, { assetCode: 'asc' }],
    });

    // Compute derived status for display
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const enriched = assets.map((a: typeof assets[number]) => ({
      ...a,
      derivedStatus: a.calibrationDueAt
        ? a.calibrationDueAt < now
          ? 'OVERDUE'
          : a.calibrationDueAt.getTime() - now.getTime() < thirtyDays
            ? 'DUE_SOON'
            : 'CURRENT'
        : 'CURRENT',
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch calibration register');
    return NextResponse.json({ error: 'Failed to fetch calibration data' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, calibrationCertRef, calibrationBody, lastCalibratedAt, calibrationDueAt, calibrationStatus } = body;

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        ...(calibrationCertRef !== undefined && { calibrationCertRef }),
        ...(calibrationBody !== undefined && { calibrationBody }),
        ...(lastCalibratedAt && { lastCalibratedAt: new Date(lastCalibratedAt) }),
        ...(calibrationDueAt && { calibrationDueAt: new Date(calibrationDueAt) }),
        ...(calibrationStatus && { calibrationStatus }),
        updatedById: session.sub,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update calibration record');
    return NextResponse.json({ error: 'Failed to update calibration' }, { status: 500 });
  }
}
