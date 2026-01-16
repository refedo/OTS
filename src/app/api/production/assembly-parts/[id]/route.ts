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

    const assemblyPart = await prisma.assemblyPart.findUnique({
      where: { id: params.id },
      include: {
        project: {
          select: { id: true, name: true, projectNumber: true },
        },
        building: {
          select: { id: true, name: true, designation: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        updatedBy: {
          select: { id: true, name: true, email: true },
        },
        productionLogs: {
          include: {
            createdBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { dateProcessed: 'desc' },
        },
      },
    });

    if (!assemblyPart) {
      return NextResponse.json({ error: 'Assembly part not found' }, { status: 404 });
    }

    return NextResponse.json(assemblyPart);
  } catch (error) {
    console.error('Error fetching assembly part:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch assembly part', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session || !['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.assemblyPart.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assembly part:', error);
    return NextResponse.json({ 
      error: 'Failed to delete assembly part', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
