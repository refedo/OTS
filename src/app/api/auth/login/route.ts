import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { comparePassword } from '@/lib/password';
import { signSession } from '@/lib/jwt';
import { logSystemEvent } from '@/lib/api-utils';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  remember: z.boolean().optional()
});

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let data: any;
    if (contentType.includes('application/json')) {
      data = await req.json();
    } else {
      const form = await req.formData();
      data = Object.fromEntries(form as any);
      data.remember = form.get('remember') ? true : false;
    }

    const parsed = schema.safeParse({
      email: data.email,
      password: data.password,
      remember: !!data.remember
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      include: { 
        role: {
          select: { id: true, name: true, description: true }
        }, 
        department: {
          select: { id: true, name: true }
        }
      }
    });
    if (!user || user.status !== 'active') {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await comparePassword(parsed.data.password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signSession(
      { sub: user.id, name: user.name, role: user.role.name, departmentId: user.departmentId },
      parsed.data.remember
    );

    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const secure = process.env.COOKIE_SECURE === 'true';
    const domain = process.env.COOKIE_DOMAIN || undefined;
    const maxAge = parsed.data.remember ? 60*60*24*30 : 60*60*24;

    // Log login event
    await logSystemEvent({
      eventType: 'login',
      category: 'auth',
      title: `User logged in: ${user.name}`,
      description: `${user.email} logged in successfully`,
      userId: user.id,
      metadata: { email: user.email, role: user.role.name },
    });

    // For JSON requests, return success with cookie
    if (contentType.includes('application/json')) {
      const res = NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role.name } });
      res.headers.append('Set-Cookie', `${cookieName}=${token}; HttpOnly; Path=/; SameSite=Lax; ${secure ? 'Secure; ' : ''}${domain ? `Domain=${domain}; ` : ''}Max-Age=${maxAge}`);
      return res;
    }

    // For form submissions, redirect
    const res = NextResponse.redirect(new URL('/dashboard', process.env.APP_URL || 'http://localhost:3000'));
    res.headers.append('Set-Cookie', `${cookieName}=${token}; HttpOnly; Path=/; SameSite=Lax; ${secure ? 'Secure; ' : ''}${domain ? `Domain=${domain}; ` : ''}Max-Age=${maxAge}`);
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
