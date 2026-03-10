import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';

export async function POST(
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

    const userPermissions = await getCurrentUserPermissions();
    if (!userPermissions.includes('quality.edit_itp')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the ITP to mark it as a STANDARD template
    const itp = await prisma.iTP.update({
      where: { id: params.id },
      data: {
        type: 'STANDARD',
      },
      include: {
        activities: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    return NextResponse.json(itp);
  } catch (error) {
    console.error('Error saving as template:', error);
    return NextResponse.json({ 
      error: 'Failed to save as template', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
