import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { filterPermissionsByModules } from '@/lib/module-restrictions';
import { ALL_PERMISSIONS } from '@/lib/permissions';

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

  let permissions: string[] = [];

  // isAdmin flag grants all permissions regardless of role
  if (user.isAdmin) {
    permissions = ALL_PERMISSIONS.map(p => p.id);
  } else {
    // Check if customPermissions has a permissions array (for custom role overrides)
    const customPerms = user.customPermissions as Record<string, unknown> | null;
    if (customPerms && Array.isArray(customPerms.permissions)) {
      permissions = customPerms.permissions as string[];
    } else if (user.role.permissions && Array.isArray(user.role.permissions)) {
      permissions = user.role.permissions as string[];
    }

    // Apply module restrictions — must match server-side permission-checker.ts behavior
    const restrictedModules = (user.role.restrictedModules as string[]) || [];
    if (restrictedModules.length > 0) {
      permissions = filterPermissionsByModules(permissions, restrictedModules);
    }
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    department: user.department?.name ?? null,
    permissions: permissions,
    isAdmin: user.isAdmin || false,
    mobileNumber: user.mobileNumber || null,
  });
}
