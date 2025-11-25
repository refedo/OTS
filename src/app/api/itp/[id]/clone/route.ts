import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session || !['Admin', 'Manager', 'Engineer'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { projectId, itpNumber } = body;

    if (!projectId || !itpNumber) {
      return NextResponse.json({ 
        error: 'Project ID and ITP Number are required' 
      }, { status: 400 });
    }

    // Fetch the original ITP with activities
    const originalITP = await prisma.iTP.findUnique({
      where: { id: params.id },
      include: {
        activities: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!originalITP) {
      return NextResponse.json({ error: 'ITP not found' }, { status: 404 });
    }

    // Create new ITP (clone)
    const newITP = await prisma.iTP.create({
      data: {
        itpNumber,
        revision: 0,
        projectId,
        type: originalITP.type,
        jobNo: null,
        client: null,
        applicableCodes: originalITP.applicableCodes,
        remarks: `Cloned from ${originalITP.itpNumber}`,
        createdById: session.sub,
        status: 'Draft',
      },
    });

    // Clone activities
    for (const activity of originalITP.activities) {
      await prisma.iTPActivity.create({
        data: {
          itpId: newITP.id,
          sequence: activity.sequence,
          activityDescription: activity.activityDescription,
          verifyingDocument: activity.verifyingDocument,
          inspectionType: activity.inspectionType,
          acceptanceCriteria: activity.acceptanceCriteria,
          reportsReference: activity.reportsReference,
          status: 'Pending',
        },
      });
    }

    return NextResponse.json({ id: newITP.id, itpNumber: newITP.itpNumber }, { status: 201 });
  } catch (error) {
    console.error('Error cloning ITP:', error);
    return NextResponse.json({ 
      error: 'Failed to clone ITP', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
