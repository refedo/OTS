import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { hashPassword } from '@/lib/password';

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  position: z.string().nullable().optional(),
  roleId: z.string().uuid(),
  departmentId: z.string().uuid().nullable().optional(),
  reportsToId: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional()
});

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Admin: full access. Manager: only same department. Engineer/Operator: self
  if (session.role === 'Admin') {
    const users = await prisma.user.findMany({ include: { role: true, department: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(users);
  }
  if (session.role === 'Manager') {
    const me = await prisma.user.findUnique({ where: { id: session.sub } });
    const users = await prisma.user.findMany({
      where: { departmentId: me?.departmentId ?? undefined },
      include: { role: true, department: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(users);
  }
  // Engineer/Operator: only self
  const self = await prisma.user.findUnique({ where: { id: session.sub }, include: { role: true, department: true } });
  return NextResponse.json(self ? [self] : []);
}

export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { password, departmentId, reportsToId, status, ...rest } = parsed.data;
  const user = await prisma.user.create({
    data: { 
      ...rest, 
      password: await hashPassword(password),
      departmentId: departmentId || null,
      reportsToId: reportsToId || null,
      status: status || 'active'
    },
    include: {
      role: true,
      department: true,
      reportsTo: { select: { id: true, name: true } }
    }
  });
  return NextResponse.json(user, { status: 201 });
}
