import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { role: true, department: true }
  });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get user permissions from role (customPermissions is used for user preferences like lastSeenVersion)
  let permissions: string[] = [];
  
  // Check if customPermissions has a permissions array (for custom role overrides)
  const customPerms = user.customPermissions as Record<string, unknown> | null;
  if (customPerms && Array.isArray(customPerms.permissions)) {
    permissions = customPerms.permissions as string[];
  } else if (user.role.permissions && Array.isArray(user.role.permissions)) {
    // Use role permissions as default
    permissions = user.role.permissions as string[];
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    department: user.department?.name ?? null,
    permissions: permissions
  });
}
