import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { hashPassword } from '@/lib/password';
import { systemEventService } from '@/services/system-events.service';

const customPermissionsSchema = z.union([
  z.object({
    grants: z.array(z.string()).optional().default([]),
    revokes: z.array(z.string()).optional().default([]),
  }),
  z.array(z.string()),
  z.null(),
]).optional();

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  position: z.string().nullable().optional(),
  roleId: z.string().uuid().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  reportsToId: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  isAdmin: z.boolean().optional(),
  mobileNumber: z.string().max(20).nullable().optional(),
  customPermissions: customPermissionsSchema,
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { role: true, department: true }
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check RBAC permission for editing users
  const { checkPermission } = await import('@/lib/permission-checker');
  const canEdit = await checkPermission('users.edit');
  
  if (!canEdit) {
    return NextResponse.json({ error: 'Forbidden - You do not have permission to edit users' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
  }

  const { password, departmentId, mobileNumber, customPermissions, ...rest } = parsed.data;
  
  // Build update data
  const updateData: any = { ...rest };
  
  if (departmentId !== undefined) {
    updateData.departmentId = departmentId;
  }
  
  if (mobileNumber !== undefined) {
    updateData.mobileNumber = mobileNumber;
  }
  
  if (customPermissions !== undefined) {
    updateData.customPermissions = customPermissions;
  }
  
  if (password) {
    updateData.password = await hashPassword(password);
  }

  try {
    // Fetch current state for change detection
    const oldUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { status: true, isAdmin: true, roleId: true },
    });

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      include: { role: true, department: true },
    });

    // Determine the most significant event type
    if (parsed.data.status === 'inactive' && oldUser?.status === 'active') {
      systemEventService.logUser('USER_DEACTIVATED', user.id, session.sub, {
        targetUserName: user.name,
        performedByName: session.name,
      });
    } else if (parsed.data.status === 'active' && oldUser?.status === 'inactive') {
      systemEventService.logUser('USER_REACTIVATED', user.id, session.sub, {
        targetUserName: user.name,
        performedByName: session.name,
      });
    } else if (parsed.data.isAdmin === true && !oldUser?.isAdmin) {
      systemEventService.logUser('USER_ADMIN_GRANTED', user.id, session.sub, {
        targetUserName: user.name,
        performedByName: session.name,
      });
    } else if (parsed.data.isAdmin === false && oldUser?.isAdmin) {
      systemEventService.logUser('USER_ADMIN_REVOKED', user.id, session.sub, {
        targetUserName: user.name,
        performedByName: session.name,
      });
    } else {
      systemEventService.logUser('USER_UPDATED', user.id, session.sub, {
        targetUserName: user.name,
        performedByName: session.name,
        roleName: user.role?.name,
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check RBAC permission for deleting users
  const { checkPermission } = await import('@/lib/permission-checker');
  const canDelete = await checkPermission('users.delete');
  
  if (!canDelete) {
    return NextResponse.json({ error: 'Forbidden - You do not have permission to delete users' }, { status: 403 });
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { name: true },
    });

    await prisma.user.delete({ where: { id: params.id } });

    systemEventService.logUser('USER_DELETED', params.id, session.sub, {
      targetUserName: targetUser?.name,
      performedByName: session.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
