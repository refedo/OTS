import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

const createSchema = z.object({ name: z.string().min(2), description: z.string().optional() });

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (['CEO', 'Admin'].includes(session.role)) {
    const items = await prisma.department.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(items);
  }

  // Manager/Engineer/Operator: only the department of the current user (if any)
  const me = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!me?.departmentId) return NextResponse.json([]);
  const dep = await prisma.department.findUnique({ where: { id: me.departmentId } });
  return NextResponse.json(dep ? [dep] : []);
}

export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session || session.role !== 'Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const item = await prisma.department.create({ data: parsed.data });
  return NextResponse.json(item, { status: 201 });
}
