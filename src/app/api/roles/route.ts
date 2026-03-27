import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

const createSchema = z.object({ 
  name: z.string().min(2), 
  description: z.string().optional().nullable().transform(val => val || undefined)
});

export async function GET() {
  const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(roles);
}

export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userPermissions = await getCurrentUserPermissions();
  if (!userPermissions.includes('roles.create')) {
    logger.warn({ userId: session.sub }, '[Roles API] Access denied - missing roles.create permission');
    return NextResponse.json({ error: 'Forbidden - roles.create permission required' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ 
      error: 'Invalid input',
      details: parsed.error.format() 
    }, { status: 400 });
  }

  const role = await prisma.role.create({ data: parsed.data });
  logger.info({ roleName: role.name }, '[Roles API] Role created');

  systemEventService.logUser('ROLE_CREATED', role.id, session.sub, {
    roleName: role.name,
    performedByName: session.name,
  });

  return NextResponse.json(role, { status: 201 });
}
