import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can duplicate roles
    if (session.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Get the original role
    const originalRole = await prisma.role.findUnique({
      where: { id },
    });

    if (!originalRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Create duplicate role with "(Copy)" suffix
    const newRole = await prisma.role.create({
      data: {
        name: `${originalRole.name} (Copy)`,
        description: originalRole.description,
        permissions: originalRole.permissions,
      },
    });

    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    console.error('Error duplicating role:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate role', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
