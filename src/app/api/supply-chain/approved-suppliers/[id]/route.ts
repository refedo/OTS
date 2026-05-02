import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional().nullable(),
  scopeOfApproval: z.string().optional().nullable(),
  approvalStatus: z.enum(['APPROVED', 'CONDITIONAL', 'SUSPENDED', 'EXPIRED']).optional(),
  approvalDate: z.string().datetime().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  lastAuditDate: z.string().datetime().optional().nullable(),
  auditFrequencyDays: z.number().int().optional().nullable(),
  rating: z.string().optional().nullable(),
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
    const data = parsed.data;
    const updated = await prisma.scApprovedSupplier.update({
      where: { id },
      data: {
        ...data,
        approvalDate: data.approvalDate !== undefined ? (data.approvalDate ? new Date(data.approvalDate) : null) : undefined,
        expiryDate: data.expiryDate !== undefined ? (data.expiryDate ? new Date(data.expiryDate) : null) : undefined,
        lastAuditDate: data.lastAuditDate !== undefined ? (data.lastAuditDate ? new Date(data.lastAuditDate) : null) : undefined,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update supplier');
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await prisma.scApprovedSupplier.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session.userId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete supplier');
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 });
  }
}
