/**
 * GET  /api/hr/sections  — list HR sections (active by default, ?includeArchived=true for all)
 * POST /api/hr/sections  — create a new section
 *
 * HR Setup slice. GET is open to any authenticated user with `hr.employee.view`
 * (so the employee form can populate its dropdown); POST is gated by
 * `hr.section.manage`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
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

  // Employee form + setup page both need to read this. Minimum gate is the
  // HR employee-view permission; setup-page actions are gated on POST/PUT/DELETE.
  const canView = await checkPermission('hr.employee.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const includeArchived = req.nextUrl.searchParams.get('includeArchived') === 'true';

  const sections = await prisma.hrSection.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });
  return NextResponse.json(sections);
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
    // Place new sections at the end by default.
    const maxOrder = parsed.data.displayOrder ?? (await prisma.hrSection.aggregate({
      _max: { displayOrder: true },
    }))._max.displayOrder ?? 0;

    const section = await prisma.hrSection.create({
      data: {
        name: parsed.data.name,
        displayOrder: parsed.data.displayOrder ?? maxOrder + 10,
      },
    });
    return NextResponse.json(section, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'A section with that name already exists' }, { status: 409 });
    }
    logger.error({ error }, '[HR Sections] Create failed');
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}
