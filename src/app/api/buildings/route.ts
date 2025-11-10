import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const projectId = searchParams.get('projectId') || '';

  const buildings = await prisma.building.findMany({
    where: {
      ...(search && {
        OR: [
          { designation: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(projectId && { projectId }),
    },
    include: {
      project: {
        select: {
          id: true,
          projectNumber: true,
          name: true,
          status: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [
      { project: { projectNumber: 'asc' } },
      { designation: 'asc' },
    ],
  });

  return NextResponse.json(buildings);
}

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, name, designation, description, startDate, endDate } = body;

    if (!projectId || !name || !designation) {
      return NextResponse.json(
        { error: 'Project ID, name, and designation are required' },
        { status: 400 }
      );
    }

    const building = await prisma.building.create({
      data: {
        projectId,
        name,
        designation,
        description: description || null,
      },
    });

    return NextResponse.json(building);
  } catch (error) {
    console.error('Error creating building:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create building',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
