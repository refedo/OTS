/**
 * API Route Wrapper
 * 
 * Wraps API route handlers with request context for automatic audit logging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { runWithContextAsync, createContextFromSession } from '@/lib/services/governance';

type ApiHandler = (req: NextRequest, context?: any) => Promise<NextResponse>;

/**
 * Wrap an API route handler with request context
 * This enables automatic audit logging via Prisma middleware
 */
export function withAuditContext(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, routeContext?: any) => {
    try {
      // Get session from cookies
      const store = await cookies();
      const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
      const session = token ? verifySession(token) : null;

      // Create request context - map SessionPayload to expected format
      const context = createContextFromSession(
        session ? {
          userId: session.sub,
          name: session.name,
          role: session.role,
        } : null,
        'API'
      );

      // Run the handler within the context
      return await runWithContextAsync(context, async () => await handler(req, routeContext));
    } catch (error) {
      console.error('[API Wrapper] Error:', error);
      // If context creation fails, run handler without context
      return await handler(req, routeContext);
    }
  };
}

/**
 * Quick helper to verify session and return user or 401
 */
export async function getSessionOrUnauthorized() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { session };
}
