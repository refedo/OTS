import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/prisma';

// PATCH - Update individual widget position
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = verifySession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const userId = session.sub;
    const widgetId = params.id;
    const body = await request.json();
    const { position } = body;

    if (position === undefined) {
      return NextResponse.json({ error: 'Position is required' }, { status: 400 });
    }

    // Verify widget belongs to user
    const widget = await prisma.userDashboardWidget.findFirst({
      where: {
        id: widgetId,
        userId,
      },
    });

    if (!widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    // Update widget position
    const updatedWidget = await prisma.userDashboardWidget.update({
      where: { id: widgetId },
      data: { position },
    });

    return NextResponse.json(updatedWidget);

  } catch (error) {
    console.error('Error updating widget position:', error);
    return NextResponse.json(
      { error: 'Failed to update widget position' },
      { status: 500 }
    );
  }
}
