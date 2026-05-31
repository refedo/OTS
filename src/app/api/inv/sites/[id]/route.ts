import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).nullable().optional(),
  sourceCodes: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['Admin', 'CEO', 'Manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const site = await prisma.invSite.update({
      where: { id },
      data: parsed.data,
      select: { id: true, code: true, name: true, description: true, sourceCodes: true, isActive: true },
    });

    logger.info({ id, updatedBy: session.sub }, '[INV] Site updated');
    return NextResponse.json(site);
  } catch (error) {
    logger.error({ error }, '[INV] Failed to update site');
    return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
  }
}
