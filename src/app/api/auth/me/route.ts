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
  // customPermissions is a JSON field that may contain various data, not just permissions
  let permissions: string[] = [];
  
  if (user.customPermissions && typeof user.customPermissions === 'object') {
    const customPerms = user.customPermissions as any;
    // Check if it has a permissions array property
    if (Array.isArray(customPerms.permissions)) {
      permissions = customPerms.permissions;
    } else if (Array.isArray(customPerms)) {
      // Legacy: if customPermissions itself is an array
      permissions = customPerms;
    } else {
      // No custom permissions, use role permissions
      permissions = (user.role.permissions as string[] || []);
    }
  } else {
    // Use role permissions
    permissions = (user.role.permissions as string[] || []);
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
