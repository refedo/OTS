import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const UpdateSchema = z.object({
  type: z.enum(['NC', 'OFI', 'Observation']).optional(),
  clause: z.string().optional(),
  description: z.string().optional(),
  evidence: z.string().optional().nullable(),
  correctiveAction: z.string().optional().nullable(),
  responsibleId: z.string().uuid().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
  closedAt: z.string().datetime().optional().nullable(),
  closureEvidence: z.string().optional().nullable(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED', 'OVERDUE']).optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const finding = await prisma.imsAuditFinding.findUnique({
      where: { id },
      include: {
        audit: { select: { auditNumber: true, scope: true } },
        responsible: { select: { id: true, name: true } },
      },
    });
    if (!finding) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(finding);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch finding');
    return NextResponse.json({ error: 'Failed to fetch finding' }, { status: 500 });
  }
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
    const updateData: Record<string, unknown> = { ...data };
    if (data.targetDate !== undefined) updateData.targetDate = data.targetDate ? new Date(data.targetDate) : null;
    if (data.closedAt !== undefined) updateData.closedAt = data.closedAt ? new Date(data.closedAt) : null;
    const updated = await prisma.imsAuditFinding.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update finding');
    return NextResponse.json({ error: 'Failed to update finding' }, { status: 500 });
  }
}
