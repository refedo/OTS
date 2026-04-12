/**
 * GET  /api/hr/agencies — list manpower agencies
 * POST /api/hr/agencies — create a manpower agency
 *
 * Gated by `hr.agency.view` (read) / `hr.agency.manage` (write).
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const createSchema = z.object({
  nameEn: z.string().min(1).max(255),
  nameAr: z.string().max(255).nullable().optional(),
  contactPerson: z.string().max(200).nullable().optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  contractRef: z.string().max(120).nullable().optional(),
  contractStart: z.string().nullable().optional(),
  contractEnd: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),
});

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.agency.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const agencies = await prisma.agency.findMany({
    where: { deletedAt: null },
    orderBy: { nameEn: 'asc' },
    include: {
      _count: { select: { slots: { where: { deletedAt: null } } } },
    },
  });
  return NextResponse.json(agencies);
}

export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.agency.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    const agency = await prisma.agency.create({
      data: {
        nameEn: data.nameEn,
        nameAr: data.nameAr ?? null,
        contactPerson: data.contactPerson ?? null,
        contactPhone: data.contactPhone ?? null,
        contractRef: data.contractRef ?? null,
        contractStart: data.contractStart ? new Date(data.contractStart) : null,
        contractEnd: data.contractEnd ? new Date(data.contractEnd) : null,
        status: data.status ?? 'ACTIVE',
        createdById: session.sub,
      },
    });
    logger.info({ agencyId: agency.id, nameEn: agency.nameEn }, '[HR] Agency created');
    return NextResponse.json(agency, { status: 201 });
  } catch (error) {
    logger.error({ error }, '[HR] Failed to create agency');
    return NextResponse.json({ error: 'Failed to create agency' }, { status: 500 });
  }
}
