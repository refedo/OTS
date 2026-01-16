import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;

    // Fetch work orders for this project
    const workOrders = await prisma.workOrder.findMany({
      where: {
        projectId,
      },
      include: {
        productionEngineer: {
          select: {
            id: true,
            name: true,
          },
        },
        parts: {
          select: {
            id: true,
            partDesignation: true,
            quantity: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Map to match expected format (assignedTo -> productionEngineer)
    const formattedWorkOrders = workOrders.map(wo => ({
      ...wo,
      assignedTo: wo.productionEngineer,
    }));

    return NextResponse.json(formattedWorkOrders);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch work orders' },
      { status: 500 }
    );
  }
}
