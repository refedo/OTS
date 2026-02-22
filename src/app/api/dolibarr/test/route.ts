import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const client = createDolibarrClient();
    const result = await client.testConnection();

    return NextResponse.json({
      ...result,
      apiUrl: process.env.DOLIBARR_API_URL ? '***configured***' : 'NOT SET',
      apiKey: process.env.DOLIBARR_API_KEY ? '***configured***' : 'NOT SET',
      timeout: process.env.DOLIBARR_API_TIMEOUT || '30000',
      retries: process.env.DOLIBARR_API_RETRIES || '3',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to test connection',
    }, { status: 500 });
  }
}
