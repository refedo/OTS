import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const events = await (prisma as unknown as { systemEvent: { findMany: (args: unknown) => Promise<unknown[]> } }).systemEvent.findMany({
      where: {
        entityType: 'NCRReport',
        entityId: id,
        eventType: { in: ['QC_NCR_CREATED', 'QC_NCR_STATUS_CHANGED', 'QC_NCR_CLOSED'] },
      },
      select: {
        id: true,
        eventType: true,
        summary: true,
        details: true,
        userName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const history = (events as Array<{
      id: string;
      eventType: string;
      summary: string | null;
      details: unknown;
      userName: string | null;
      createdAt: Date;
    }>).map(e => {
      const det = e.details as Record<string, unknown> | null;
      const status: string = (det?.status as string) ||
        (e.eventType === 'QC_NCR_CREATED' ? 'Open' :
         e.eventType === 'QC_NCR_CLOSED' ? 'Closed' : 'Updated');
      return {
        id: e.id,
        status,
        changedAt: e.createdAt.toISOString(),
        changedBy: e.userName ?? 'System',
        notes: e.summary ?? null,
      };
    });

    return NextResponse.json(history);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
