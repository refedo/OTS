import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/prisma';

// GET user's dashboard widgets
export async function GET(request: NextRequest) {
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

    // Get user's widgets
    const widgets = await prisma.userDashboardWidget.findMany({
      where: {
        userId,
        isVisible: true,
      },
      orderBy: {
        position: 'asc',
      },
    });

    // If no widgets exist, create default layout
    if (widgets.length === 0) {
      const defaultWidgets = [
        { widgetType: 'PROJECT_SUMMARY', widgetSize: 'medium', position: 0 },
        { widgetType: 'TASK_SUMMARY', widgetSize: 'medium', position: 1 },
        { widgetType: 'KPI_SUMMARY', widgetSize: 'large', position: 2 },
        { widgetType: 'OBJECTIVE_SUMMARY', widgetSize: 'medium', position: 3 },
        { widgetType: 'WEEKLY_PRODUCTION', widgetSize: 'large', position: 4 },
      ];

      const createdWidgets = await Promise.all(
        defaultWidgets.map(widget =>
          prisma.userDashboardWidget.create({
            data: {
              userId,
              ...widget,
            },
          })
        )
      );

      return NextResponse.json(createdWidgets);
    }

    return NextResponse.json(widgets);

  } catch (error) {
    console.error('Error fetching dashboard widgets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard widgets' },
      { status: 500 }
    );
  }
}

// POST - Add new widget
export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { widgetType, widgetSize = 'medium', settings } = body;

    if (!widgetType) {
      return NextResponse.json({ error: 'Widget type is required' }, { status: 400 });
    }

    // Get current max position
    const maxPosition = await prisma.userDashboardWidget.findFirst({
      where: { userId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const newPosition = (maxPosition?.position ?? -1) + 1;

    // Create new widget
    const widget = await prisma.userDashboardWidget.create({
      data: {
        userId,
        widgetType,
        widgetSize,
        position: newPosition,
        settings: settings || null,
      },
    });

    return NextResponse.json(widget);

  } catch (error) {
    console.error('Error adding widget:', error);
    return NextResponse.json(
      { error: 'Failed to add widget' },
      { status: 500 }
    );
  }
}

// PATCH - Update widget
export async function PATCH(request: NextRequest) {
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
    const body = await request.json();
    const { widgetId, widgetSize, position, isVisible, settings } = body;

    if (!widgetId) {
      return NextResponse.json({ error: 'Widget ID is required' }, { status: 400 });
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

    // Update widget
    const updatedWidget = await prisma.userDashboardWidget.update({
      where: { id: widgetId },
      data: {
        ...(widgetSize && { widgetSize }),
        ...(position !== undefined && { position }),
        ...(isVisible !== undefined && { isVisible }),
        ...(settings && { settings }),
      },
    });

    return NextResponse.json(updatedWidget);

  } catch (error) {
    console.error('Error updating widget:', error);
    return NextResponse.json(
      { error: 'Failed to update widget' },
      { status: 500 }
    );
  }
}

// DELETE - Remove widget
export async function DELETE(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const widgetId = searchParams.get('widgetId');

    if (!widgetId) {
      return NextResponse.json({ error: 'Widget ID is required' }, { status: 400 });
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

    // Delete widget
    await prisma.userDashboardWidget.delete({
      where: { id: widgetId },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting widget:', error);
    return NextResponse.json(
      { error: 'Failed to delete widget' },
      { status: 500 }
    );
  }
}
