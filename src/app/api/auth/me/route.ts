import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { resolvePermissionsFromData, parseCustomPermissions } from '@/lib/services/permission-resolution.service';

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

  const permissions = resolvePermissionsFromData({
    isAdmin: user.isAdmin,
    rolePermissions: (user.role.permissions as string[]) || [],
    customPermissions: parseCustomPermissions(user.customPermissions),
    restrictedModules: (user.role.restrictedModules as string[]) || [],
  });

  // navPermissions reflects the role's selected permissions for sidebar visibility.
  // Admins still get full API access above, but sidebar respects role deselections.
  const navPermissions = (user.role.permissions as string[]) || [];

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    department: user.department?.name ?? null,
    permissions: permissions,
    navPermissions: navPermissions,
    isAdmin: user.isAdmin || false,
    mobileNumber: user.mobileNumber || null,
  });
}
