/**
 * GET  /api/hr/occupations  — list (active by default, ?includeArchived=true for all)
 * POST /api/hr/occupations  — create
 *
 * GET is open to any user with `hr.employee.view` (employee form needs it).
 * POST is gated by `hr.section.manage`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  displayOrder: z.number().int().min(0).max(9999).optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.employee.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const includeArchived = req.nextUrl.searchParams.get('includeArchived') === 'true';

  const occupations = await prisma.hrOccupation.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });
  return NextResponse.json(occupations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.section.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const maxOrder = parsed.data.displayOrder ?? (await prisma.hrOccupation.aggregate({
      _max: { displayOrder: true },
    }))._max.displayOrder ?? 0;

    const occupation = await prisma.hrOccupation.create({
      data: {
        name: parsed.data.name,
        displayOrder: parsed.data.displayOrder ?? maxOrder + 10,
      },
    });
    return NextResponse.json(occupation, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'An occupation with that name already exists' }, { status: 409 });
    }
    logger.error({ error }, '[HR Occupations] Create failed');
    return NextResponse.json({ error: 'Failed to create occupation' }, { status: 500 });
  }
}
