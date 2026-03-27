import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { hashPassword } from '@/lib/password';
import { systemEventService } from '@/services/system-events.service';

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  position: z.string().nullable().optional(),
  roleId: z.string().uuid(),
  departmentId: z.string().uuid().nullable().optional(),
  reportsToId: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  isAdmin: z.boolean().optional(),
  mobileNumber: z.string().max(20).nullable().optional(),
  customPermissions: z.array(z.string()).nullable().optional()
});

export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Check if this is a request for assignment purposes (all active users)
  const { searchParams } = new URL(req.url);
  const forAssignment = searchParams.get('forAssignment') === 'true';
  
  // For assignment dropdowns, show all active users regardless of role
  // Also check if user has projects.browse_users permission
  if (forAssignment) {
    const users = await prisma.user.findMany({ 
      where: { status: 'active' },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        position: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        role: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' } 
    });
    return NextResponse.json(users);
  }
  
  // Permission-based user listing
  const userPermissions = await getCurrentUserPermissions();
  const canViewUsers = userPermissions.includes('users.view');
  const canBrowseUsers = userPermissions.includes('projects.browse_users');
  
  if (canViewUsers || canBrowseUsers) {
    const users = await prisma.user.findMany({ include: { role: true, department: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(users);
  }
  
  // Default: only self
  const currentUser = await prisma.user.findUnique({ 
    where: { id: session.sub }, 
    include: { role: true, department: true } 
  });
  return NextResponse.json(currentUser ? [currentUser] : []);
}

export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check RBAC permission for creating users
  const { checkPermission } = await import('@/lib/permission-checker');
  const canCreate = await checkPermission('users.create');
  
  if (!canCreate) {
    return NextResponse.json({ error: 'Forbidden - You do not have permission to create users' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { password, departmentId, reportsToId, status, isAdmin, mobileNumber, customPermissions, ...rest } = parsed.data;
  const user = await prisma.user.create({
    data: { 
      ...rest, 
      password: await hashPassword(password),
      departmentId: departmentId || null,
      reportsToId: reportsToId || null,
      status: status || 'active',
      isAdmin: isAdmin || false,
      mobileNumber: mobileNumber || null,
      customPermissions: customPermissions ?? undefined
    },
    include: {
      role: true,
      department: true,
      reportsTo: { select: { id: true, name: true } }
    }
  });
  systemEventService.logUser('USER_CREATED', user.id, session.sub, {
    targetUserName: user.name,
    roleName: user.role?.name,
  });

  return NextResponse.json(user, { status: 201 });
}
