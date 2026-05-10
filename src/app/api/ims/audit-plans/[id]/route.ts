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

    const plan = await prisma.imsAuditPlan.findUnique({
      where: { id },
      include: {
        audits: {
          include: {
            auditor: { select: { id: true, name: true } },
            auditee: { select: { id: true, name: true } },
            _count: { select: { findings: true } },
          },
          orderBy: { scheduledDate: 'asc' },
        },
      },
    });

    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const allClauses: string[] = [];
    for (const audit of plan.audits) {
      if (Array.isArray(audit.isoClausesInScope)) {
        allClauses.push(...(audit.isoClausesInScope as string[]));
      }
    }
    const coverageSummary = [...new Set(allClauses)].sort();

    return NextResponse.json({ ...plan, coverageSummary });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch audit plan');
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const updated = await prisma.imsAuditPlan.update({ where: { id }, data: body });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update audit plan');
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}
