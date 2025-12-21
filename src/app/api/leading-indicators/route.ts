import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { LeadingIndicatorsService } from '@/lib/services/leading-indicators.service';

export async function GET() {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await LeadingIndicatorsService.getAll();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching leading indicators:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch leading indicators',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
