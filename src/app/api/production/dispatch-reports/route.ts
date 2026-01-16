import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET() {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all production logs with dispatch process types and report numbers
    const reports = await prisma.productionLog.findMany({
      where: {
        processType: {
          startsWith: 'Dispatched',
        },
        reportNumber: {
          not: null,
        },
      },
      include: {
        assemblyPart: {
          include: {
            project: {
              select: {
                projectNumber: true,
                name: true,
              },
            },
            building: {
              select: {
                designation: true,
                name: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        dateProcessed: 'desc',
      },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching dispatch reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dispatch reports' },
      { status: 500 }
    );
  }
}
