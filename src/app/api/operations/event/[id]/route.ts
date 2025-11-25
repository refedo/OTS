import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

// PATCH /api/operations/event/:id - Edit event date/status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (Admin or Project Manager only)
    const userRole = session.role;
    if (userRole !== 'Admin' && userRole !== 'Project Manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const { eventDate, status, description, changeReason } = body;

    // Get existing event
    const existingEvent = await prisma.operationEvent.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Create audit log
    await prisma.operationEventAudit.create({
      data: {
        eventId: id,
        oldStatus: existingEvent.status,
        newStatus: status || existingEvent.status,
        oldDate: existingEvent.eventDate,
        newDate: eventDate ? new Date(eventDate) : existingEvent.eventDate,
        changedBy: session.userId,
        changeReason,
      },
    });

    // Update the event
    const updatedEvent = await prisma.operationEvent.update({
      where: { id },
      data: {
        ...(eventDate && { eventDate: new Date(eventDate) }),
        ...(status && { status }),
        ...(description !== undefined && { description }),
      },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
          },
        },
        building: {
          select: {
            id: true,
            designation: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating operation event:', error);
    return NextResponse.json(
      { error: 'Failed to update operation event' },
      { status: 500 }
    );
  }
}

// DELETE /api/operations/event/:id - Delete an event
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (Admin only)
    const userRole = session.role;
    if (userRole !== 'Admin') {
      return NextResponse.json(
        { error: 'Only Admin can delete events' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Check if event exists
    const event = await prisma.operationEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Delete the event
    await prisma.operationEvent.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting operation event:', error);
    return NextResponse.json(
      { error: 'Failed to delete operation event' },
      { status: 500 }
    );
  }
}
