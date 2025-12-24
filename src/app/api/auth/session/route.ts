/**
 * Session Validation API
 * GET /api/auth/session - Validate and refresh session if needed
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession, signSession, SessionPayload } from '@/lib/jwt';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;

    if (!token) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Verify the token
    const session = verifySession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Validate user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: {
        role: {
          select: { id: true, name: true }
        },
        department: {
          select: { id: true, name: true }
        }
      }
    });

    if (!user || user.status !== 'active') {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    // Get user permissions: custom permissions override role permissions
    const permissions = user.customPermissions 
      ? (user.customPermissions as string[])
      : (user.role.permissions as string[] || []);

    // Check if session data needs refresh (role or department changed)
    const needsRefresh = 
      session.role !== user.role.name || 
      session.departmentId !== user.departmentId;

    if (needsRefresh) {
      // Create new token with updated data
      const newToken = signSession({
        sub: user.id,
        name: user.name,
        role: user.role.name,
        departmentId: user.departmentId
      }, false); // Default to 1 day

      const secure = process.env.COOKIE_SECURE === 'true';
      const domain = process.env.COOKIE_DOMAIN || undefined;
      const maxAge = 60 * 60 * 24; // 1 day

      const response = NextResponse.json({
        valid: true,
        refreshed: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          departmentId: user.departmentId,
          department: user.department?.name,
          permissions: permissions
        }
      });

      response.headers.append(
        'Set-Cookie',
        `${cookieName}=${newToken}; HttpOnly; Path=/; SameSite=Lax; ${secure ? 'Secure; ' : ''}${domain ? `Domain=${domain}; ` : ''}Max-Age=${maxAge}`
      );

      return response;
    }

    // Session is valid and up-to-date
    return NextResponse.json({
      valid: true,
      refreshed: false,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        departmentId: user.departmentId,
        department: user.department?.name,
        permissions: permissions
      }
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json({ error: 'Session validation failed' }, { status: 500 });
  }
}
