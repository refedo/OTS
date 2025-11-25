import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/password';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().uuid(),
  departmentId: z.string().uuid().nullable().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: await hashPassword(parsed.data.password),
        roleId: parsed.data.roleId,
        departmentId: parsed.data.departmentId ?? null,
        status: 'active'
      }
    });

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
