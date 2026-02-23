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
    // Validate JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('[Login] JWT_SECRET is not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

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
      console.error('[Login] Validation failed:', parsed.error);
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    let user;
    try {
      user = await prisma.user.findUnique({
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
    } catch (dbError) {
      console.error('[Login] Database query failed:', dbError);
      throw new Error('Database connection failed');
    }

    if (!user || user.status !== 'active') {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    let valid;
    try {
      valid = await comparePassword(parsed.data.password, user.password);
    } catch (pwError) {
      console.error('[Login] Password comparison failed:', pwError);
      throw new Error('Password verification failed');
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    let token;
    try {
      token = signSession(
        { sub: user.id, name: user.name, role: user.role.name, departmentId: user.departmentId },
        parsed.data.remember
      );
    } catch (jwtError) {
      console.error('[Login] JWT signing failed:', jwtError);
      throw new Error('Session token generation failed');
    }

    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const secure = process.env.COOKIE_SECURE === 'true';
    const domain = process.env.COOKIE_DOMAIN || undefined;
    const maxAge = parsed.data.remember ? 60*60*24*30 : 60*60*24;

    // Log login event
    try {
      await logSystemEvent({
        eventType: 'login',
        category: 'auth',
        title: `User logged in: ${user.name}`,
        description: `${user.email} logged in successfully`,
        userId: user.id,
        metadata: { email: user.email, role: user.role.name },
      });
    } catch (error) {
      console.error('Failed to log login event:', error);
      // Continue with login even if logging fails
    }

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
    console.error('[Login Error] Full error:', err);
    console.error('[Login Error] Error message:', err instanceof Error ? err.message : 'Unknown error');
    console.error('[Login Error] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    
    const errorMessage = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ 
      error: 'Server error', 
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
    }, { status: 500 });
  }
}
