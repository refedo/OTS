import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const editSchema = z.object({
  content: z.string().min(1).max(2000),
});

type NoteRecord = { id: string; content: string; authorId: string; authorName: string; createdAt: string };

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id, noteId } = await params;
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const item = await prisma.productBacklogItem.findUnique({
      where: { id },
      select: { id: true, notes: true },
    });
    if (!item) return NextResponse.json({ error: 'Backlog item not found' }, { status: 404 });

    const notes = Array.isArray(item.notes) ? (item.notes as NoteRecord[]) : [];
    const noteIndex = notes.findIndex(n => n.id === noteId);
    if (noteIndex === -1) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

    const note = notes[noteIndex];
    if (note.authorId !== session.sub) {
      return NextResponse.json({ error: 'Forbidden: you can only edit your own notes' }, { status: 403 });
    }

    const updatedNote = { ...note, content: parsed.data.content };
    notes[noteIndex] = updatedNote;

    await prisma.productBacklogItem.update({
      where: { id },
      data: { notes },
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    logger.error({ error }, 'Failed to edit backlog note');
    return NextResponse.json({ error: 'Failed to edit note' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id, noteId } = await params;
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const item = await prisma.productBacklogItem.findUnique({
      where: { id },
      select: { id: true, notes: true },
    });
    if (!item) return NextResponse.json({ error: 'Backlog item not found' }, { status: 404 });

    const notes = Array.isArray(item.notes) ? (item.notes as NoteRecord[]) : [];
    const note = notes.find(n => n.id === noteId);
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

    if (note.authorId !== session.sub) {
      return NextResponse.json({ error: 'Forbidden: you can only delete your own notes' }, { status: 403 });
    }

    await prisma.productBacklogItem.update({
      where: { id },
      data: { notes: notes.filter(n => n.id !== noteId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete backlog note');
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
