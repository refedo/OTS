import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  processOwner: z.string().optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  processType: z.enum(['CORE', 'SUPPORT', 'OUTSOURCED', 'IN_HOUSE']).optional(),
  inputs: z.string().optional().nullable(),
  outputs: z.string().optional().nullable(),
  kpis: z.string().optional().nullable(),
  relatedDocumentNumbers: z.string().optional().nullable(),
  isoClause: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'UNDER_REVIEW', 'OBSOLETE']).optional(),
  notes: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }
    const updated = await prisma.imsQmsProcess.update({
      where: { id },
      data: { ...parsed.data, updatedAt: new Date() },
      select: { id: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update QMS process');
    return NextResponse.json({ error: 'Failed to update process' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await prisma.imsQmsProcess.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session.userId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete QMS process');
    return NextResponse.json({ error: 'Failed to delete process' }, { status: 500 });
  }
}
