import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const entry = await prisma.lcrEntry.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, projectNumber: true, name: true } },
      building: { select: { id: true, name: true, designation: true } },
    },
  });

  if (!entry) {
    return NextResponse.json({ error: 'LCR entry not found' }, { status: 404 });
  }

  return NextResponse.json(entry);
}
