import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { logActivity } from '@/lib/api-utils';

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
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
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const location = await prisma.invLocation.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

    const updated = await prisma.invLocation.update({
      where: { id },
      data: { ...parsed.data, updatedAt: new Date() },
      select: { id: true, code: true, name: true, isActive: true },
    });

    await logActivity({
      action: 'UPDATE',
      entityType: 'InvLocation',
      entityId: id,
      entityName: location.name,
      userId: session.userId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, '[INV] Failed to update location');
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}
