import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

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

    const audit = await prisma.imsAudit.findUnique({
      where: { id },
      include: {
        plan: { select: { planNumber: true, auditType: true, year: true } },
        auditor: { select: { id: true, name: true } },
        auditee: { select: { id: true, name: true } },
        findings: {
          include: {
            responsible: { select: { id: true, name: true } },
          },
          orderBy: { findingNumber: 'asc' },
        },
      },
    });

    if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(audit);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch audit');
    return NextResponse.json({ error: 'Failed to fetch audit' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();

    const updateData: Record<string, unknown> = { ...body };
    if (body.scheduledDate) updateData.scheduledDate = new Date(body.scheduledDate);
    if (body.actualDate) updateData.actualDate = new Date(body.actualDate);

    const updated = await prisma.imsAudit.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update audit');
    return NextResponse.json({ error: 'Failed to update audit' }, { status: 500 });
  }
}
