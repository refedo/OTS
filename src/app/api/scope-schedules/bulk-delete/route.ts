import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

/**
 * DELETE /api/scope-schedules/bulk-delete
 * Delete multiple scope schedules at once
 */
export async function DELETE(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No schedule IDs provided' }, { status: 400 });
    }

    // Delete the schedules
    const result = await prisma.scopeSchedule.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Deleted ${result.count} schedule(s)`,
    });
  } catch (error) {
    console.error('Error deleting schedules:', error);
    return NextResponse.json({
      error: 'Failed to delete schedules',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
