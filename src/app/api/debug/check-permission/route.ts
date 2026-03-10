/**
 * Debug API to check user permissions
 * GET /api/debug/check-permission?permission=projects.edit
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import db from '@/lib/db';
import { hasPermission, ALL_PERMISSIONS } from '@/lib/permissions';
import { filterPermissionsByModules } from '@/lib/module-restrictions';

export async function GET(request: NextRequest) {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const token = request.cookies.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    return NextResponse.json({ 
      error: 'No session',
      hasToken: !!token,
      cookieName
    }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requiredPermission = searchParams.get('permission') || 'projects.edit';

  // Get user from database
  const user = await db.user.findUnique({
    where: { id: session.sub },
    include: { role: true },
  });

  if (!user || !user.role) {
    return NextResponse.json({
      error: 'User or role not found',
      userId: session.sub,
      sessionName: session.name,
      sessionRole: session.role
    }, { status: 404 });
  }

  // Resolve permissions
  let permissions: string[] = [];
  let permissionSource = '';

  if (user.isAdmin) {
    permissions = ALL_PERMISSIONS.map(p => p.id);
    permissionSource = 'isAdmin (all permissions)';
  } else {
    permissions = (user.role.permissions as string[]) || [];
    permissionSource = `role: ${user.role.name}`;
    
    const restrictedModules = (user.role.restrictedModules as string[]) || [];
    if (restrictedModules.length > 0) {
      const beforeFilter = permissions.length;
      permissions = filterPermissionsByModules(permissions, restrictedModules);
      permissionSource += ` (filtered from ${beforeFilter} to ${permissions.length} by modules: ${restrictedModules.join(', ')})`;
    }
  }

  const hasAccess = hasPermission(permissions, requiredPermission);
  const hasPermissionInArray = permissions.includes(requiredPermission);

  return NextResponse.json({
    debug: true,
    session: {
      sub: session.sub,
      name: session.name,
      role: session.role,
      email: session.email
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      roleName: user.role.name,
      roleId: user.role.id
    },
    permissionCheck: {
      requiredPermission,
      hasAccess,
      hasPermissionInArray,
      permissionSource,
      totalPermissions: permissions.length
    },
    rolePermissions: {
      count: (user.role.permissions as string[])?.length || 0,
      hasRequiredPermission: ((user.role.permissions as string[]) || []).includes(requiredPermission),
      first10: ((user.role.permissions as string[]) || []).slice(0, 10)
    }
  });
}
