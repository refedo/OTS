import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return NextResponse.json({ ok: true }); // do not reveal

    const expHours = Number(process.env.PASSWORD_RESET_TOKEN_EXP_HOURS || '2');
    const expiresAt = new Date(Date.now() + expHours * 60 * 60 * 1000);
    const token = crypto.randomUUID();

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt }
    });

    // TODO: Integrate email service. For now, return token in response for dev.
    return NextResponse.json({ ok: true, token });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
