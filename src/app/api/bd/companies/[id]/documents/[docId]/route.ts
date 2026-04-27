import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { logActivity } from '@/lib/api-utils';

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  fileUrl: z.string().max(512).optional().nullable(),
  status: z.enum(['SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
  submittedAt: z.string().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userPermissions = await getCurrentUserPermissions();
    if (!userPermissions.includes('bd.documents.manage') && !userPermissions.includes('bd.companies.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { docId } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.bdDocument.findFirst({ where: { id: docId, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { submittedAt, ...rest } = parsed.data;
    const updated = await prisma.bdDocument.update({
      where: { id: docId },
      data: {
        ...rest,
        ...(submittedAt !== undefined ? { submittedAt: submittedAt ? new Date(submittedAt) : existing.submittedAt } : {}),
      },
    });

    await logActivity({
      action: 'UPDATE',
      entityType: 'BdDocument',
      entityId: docId,
      entityName: updated.title,
      userId: session.sub,
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update BD document');
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userPermissions = await getCurrentUserPermissions();
    if (!userPermissions.includes('bd.documents.manage') && !userPermissions.includes('bd.companies.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { docId } = await params;

    const existing = await prisma.bdDocument.findFirst({ where: { id: docId, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.bdDocument.update({
      where: { id: docId },
      data: { deletedAt: new Date() },
    });

    await logActivity({
      action: 'DELETE',
      entityType: 'BdDocument',
      entityId: docId,
      entityName: existing.title,
      userId: session.sub,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete BD document');
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
