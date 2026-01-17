import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getDivisionFromScopeType } from '@/lib/division-helper';

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, buildingId, scopeType, scopeLabel, startDate, endDate } = body;

    if (!projectId || !buildingId || !scopeType || !scopeLabel || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const scopeSchedule = await prisma.scopeSchedule.create({
      data: {
        projectId,
        buildingId,
        scopeType,
        scopeLabel,
        division: getDivisionFromScopeType(scopeType),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return NextResponse.json(scopeSchedule, { status: 201 });
  } catch (error) {
    console.error('Error creating scope schedule:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create scope schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
