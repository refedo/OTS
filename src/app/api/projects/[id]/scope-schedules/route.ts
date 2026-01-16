import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const scopeSchedules = await prisma.scopeSchedule.findMany({
    where: { projectId: id },
    include: {
      building: {
        select: {
          id: true,
          name: true,
          designation: true,
        },
      },
    },
    orderBy: {
      startDate: 'asc',
    },
  });

  return NextResponse.json(scopeSchedules);
}
