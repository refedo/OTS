import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { version } = await req.json();

    if (!version) {
      return NextResponse.json({ error: 'Version is required' }, { status: 400 });
    }

    // Read current customPermissions to avoid overwriting real permission data
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
          lastSeenVersion: version,
          lastSeenAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking version as seen:', error);
    return NextResponse.json(
      { error: 'Failed to mark version as seen' },
      { status: 500 }
    );
  }
}
