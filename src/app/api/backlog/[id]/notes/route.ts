import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import NotificationService from '@/lib/services/notification.service';
import { randomUUID } from 'crypto';

const noteSchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const item = await prisma.productBacklogItem.findUnique({
      where: { id },
      select: { id: true, code: true, title: true, createdById: true, notes: true },
    });
    if (!item) return NextResponse.json({ error: 'Backlog item not found' }, { status: 404 });

    const author = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, name: true },
    });

    const existingNotes = Array.isArray(item.notes) ? item.notes as Array<Record<string, string>> : [];
    const newNote = {
      id: randomUUID(),
      content: parsed.data.content,
      authorId: session.sub,
      authorName: author?.name ?? 'Unknown',
      createdAt: new Date().toISOString(),
    };

    await prisma.productBacklogItem.update({
      where: { id },
      data: { notes: [...existingNotes, newNote] },
    });

    // Notify the raiser if different from the author
    if (item.createdById !== session.sub) {
      await NotificationService.createNotification({
        userId: item.createdById,
        type: 'SYSTEM',
        title: `Note on backlog item ${item.code}`,
        message: `${author?.name ?? 'Someone'}: ${parsed.data.content.slice(0, 150)}${parsed.data.content.length > 150 ? '…' : ''}`,
        relatedEntityType: 'backlog',
        relatedEntityId: item.id,
        metadata: { backlogId: item.id, backlogCode: item.code, backlogTitle: item.title, authorId: session.userId, authorName: author?.name },
      });
    }

    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to add backlog note');
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}
