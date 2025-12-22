import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

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
  
  console.log('[Roles API] POST - Session role:', session?.role);
  
  if (!session || !['Admin', 'CEO'].includes(session.role)) {
    console.log('[Roles API] Access denied - Role:', session?.role);
    return NextResponse.json({ error: 'Forbidden. Admin or CEO access required.' }, { status: 403 });
  }

  const body = await req.json();
  console.log('[Roles API] Request body:', body);
  
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    console.log('[Roles API] Validation failed:', parsed.error);
    return NextResponse.json({ 
      error: 'Invalid input',
      details: parsed.error.format() 
    }, { status: 400 });
  }

  const role = await prisma.role.create({ data: parsed.data });
  console.log('[Roles API] Role created:', role.name);
  return NextResponse.json(role, { status: 201 });
}
