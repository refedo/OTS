import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import db from '@/lib/db';
import { checkPermission } from '@/lib/permission-checker';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage permissions
    const canManage = await checkPermission('roles.manage_permissions');
    if (!canManage) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { restrictedModules } = await request.json();

    // Validate that restrictedModules is an array
    if (!Array.isArray(restrictedModules)) {
      return NextResponse.json(
        { message: 'restrictedModules must be an array' },
        { status: 400 }
      );
    }

    // Update the role's restricted modules
    const updatedRole = await db.role.update({
      where: { id },
      data: {
        restrictedModules: restrictedModules,
      },
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error('Error updating module restrictions:', error);
    return NextResponse.json(
      { message: 'Failed to update module restrictions' },
      { status: 500 }
    );
  }
}
