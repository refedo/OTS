import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/password';

const schema = z.object({ token: z.string().uuid(), password: z.string().min(8) });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const record = await prisma.passwordResetToken.findUnique({ where: { token: parsed.data.token } });
    if (!record || record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: record.userId },
      data: { password: await hashPassword(parsed.data.password) }
    });
    await prisma.passwordResetToken.delete({ where: { token: parsed.data.token } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
