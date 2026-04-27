import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logActivity } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getCurrentUserPermissions } from '@/lib/permission-checker';

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  requestType: z.string().max(80).optional().nullable(),
  status: z.enum(['NEW', 'IN_REVIEW', 'IN_PROGRESS', 'CLOSED']).optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ reqId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userPermissions = await getCurrentUserPermissions();
    if (!userPermissions.includes('bd.requests.manage') && !userPermissions.includes('bd.companies.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reqId } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.bdRequest.findFirst({ where: { id: reqId, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.bdRequest.update({ where: { id: reqId }, data: parsed.data });
    await logActivity({ action: 'UPDATE', entityType: 'BdRequest', entityId: reqId, entityName: existing.title, userId: session.sub });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to update BD request');
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ reqId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userPermissions = await getCurrentUserPermissions();
    if (!userPermissions.includes('bd.requests.manage') && !userPermissions.includes('bd.companies.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reqId } = await params;

    const existing = await prisma.bdRequest.findFirst({ where: { id: reqId, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.bdRequest.update({ where: { id: reqId }, data: { deletedAt: new Date() } });
    await logActivity({ action: 'DELETE', entityType: 'BdRequest', entityId: reqId, entityName: existing.title, userId: session.sub });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete BD request');
    return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 });
  }
}
