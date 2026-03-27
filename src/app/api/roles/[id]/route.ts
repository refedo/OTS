import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { systemEventService } from '@/services/system-events.service';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  permissions: z.array(z.string()).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const role = await prisma.role.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  return NextResponse.json(role);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check RBAC permission for editing roles
  const { checkPermission } = await import('@/lib/permission-checker');
  const canEdit = await checkPermission('roles.edit');
  
  if (!canEdit) {
    return NextResponse.json({ error: 'Forbidden - You do not have permission to edit roles' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
  }

  try {
    const role = await prisma.role.update({
      where: { id: params.id },
      data: parsed.data,
      include: { _count: { select: { users: true } } },
    });

    systemEventService.logUser('ROLE_UPDATED', role.id, session.sub, {
      roleName: role.name,
      performedByName: session.name,
    });

    return NextResponse.json(role);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check RBAC permission for deleting roles
  const { checkPermission } = await import('@/lib/permission-checker');
  const canDelete = await checkPermission('roles.delete');
  
  if (!canDelete) {
    return NextResponse.json({ error: 'Forbidden - You do not have permission to delete roles' }, { status: 403 });
  }

  try {
    // Check if role has users
    const role = await prisma.role.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (role && role._count.users > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role with assigned users' },
        { status: 400 }
      );
    }

    const roleToDelete = await prisma.role.findUnique({
      where: { id: params.id },
      select: { name: true },
    });

    await prisma.role.delete({ where: { id: params.id } });

    systemEventService.logUser('ROLE_DELETED', params.id, session.sub, {
      roleName: roleToDelete?.name,
      performedByName: session.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}
