import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/jwt';

// Use Node.js runtime instead of Edge to support crypto module
export const runtime = 'nodejs';

const cookieName = process.env.COOKIE_NAME || 'ots_session';

const PUBLIC_PATHS = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password'
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static assets and Next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  // Public paths
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Protect all pages except public paths
  const isProtectedPage = pathname === '/' ||
                          pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/organization') ||
                          pathname.startsWith('/users') ||
                          pathname.startsWith('/roles') ||
                          pathname.startsWith('/departments') ||
                          pathname.startsWith('/projects') ||
                          pathname.startsWith('/clients') ||
                          pathname.startsWith('/tasks') ||
                          pathname.startsWith('/itp') ||
                          pathname.startsWith('/wps') ||
                          pathname.startsWith('/documents') ||
                          pathname.startsWith('/production') ||
                          pathname.startsWith('/buildings') ||
                          pathname.startsWith('/settings') ||
                          pathname.startsWith('/notifications') ||
                          pathname.startsWith('/reports') ||
                          pathname.startsWith('/ai-assistant') ||
                          pathname.startsWith('/qc') ||
                          pathname.startsWith('/business-planning') ||
                          pathname.startsWith('/changelog') ||
                          pathname.startsWith('/initiatives') ||
                          pathname.startsWith('/rfis');
  const isProtectedApi = pathname.startsWith('/api') && !pathname.startsWith('/api/auth');

  if (isProtectedPage || isProtectedApi) {
    const token = req.cookies.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;
    if (!session) {
      // redirect to login
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
