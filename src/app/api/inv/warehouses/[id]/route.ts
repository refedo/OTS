import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { logActivity } from '@/lib/api-utils';

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  siteId: z.string().min(1).max(10).optional(),
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

    const warehouse = await prisma.invWarehouse.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
    if (parsed.data.siteId !== undefined) {
      const site = await prisma.invSite.findFirst({
        where: { code: parsed.data.siteId, deletedAt: null },
        select: { code: true, name: true },
      });
      if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
      updateData.siteId = site.code;
      updateData.siteName = site.name;
    }

    const updated = await prisma.invWarehouse.update({
      where: { id },
      data: updateData,
      select: { id: true, code: true, name: true, siteId: true, siteName: true, isActive: true },
    });

    await logActivity({
      action: 'UPDATE',
      entityType: 'InvWarehouse',
      entityId: id,
      entityName: warehouse.name,
      userId: session.userId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, '[INV] Failed to update warehouse');
    return NextResponse.json({ error: 'Failed to update warehouse' }, { status: 500 });
  }
}
