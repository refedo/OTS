import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await req.json() as { key: string };

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { customPermissions: true },
    });
    const existing = (user?.customPermissions as Record<string, unknown>) ?? {};

    await prisma.user.update({
      where: { id: session.sub },
      data: {
        customPermissions: {
          ...existing,
          [`tipsDismissed_${key}`]: true,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to save tips dismissed state');
    return NextResponse.json({ error: 'Failed to save preference' }, { status: 500 });
  }
}
