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

  // Get user permissions: custom permissions override role permissions
  let permissions: string[] = [];
  
  // Check if customPermissions is a valid array of strings (not an object with other data)
  const hasValidCustomPermissions = user.customPermissions 
    && Array.isArray(user.customPermissions)
    && user.customPermissions.length > 0
    && typeof user.customPermissions[0] === 'string';
  
  if (hasValidCustomPermissions) {
    permissions = user.customPermissions as string[];
  } else if (user.role.permissions) {
    permissions = Array.isArray(user.role.permissions)
      ? user.role.permissions as string[]
      : [];
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
