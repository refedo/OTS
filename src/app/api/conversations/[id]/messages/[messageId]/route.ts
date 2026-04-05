import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const EDIT_WINDOW_MS = 60 * 1000;

export const PATCH = withApiContext(async (
  req: NextRequest,
  session,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) => {
  const { id: conversationId, messageId } = await params;
  const body = await req.json();
  const parsed = z.object({ content: z.string().min(1).max(5000) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  try {
    const message = await prisma.conversationMessage.findFirst({
      where: { id: messageId, conversationId },
      select: { id: true, userId: true, createdAt: true },
    });
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    if (message.userId !== session!.userId) return NextResponse.json({ error: 'You can only edit your own messages' }, { status: 403 });
    if (Date.now() - new Date(message.createdAt).getTime() > EDIT_WINDOW_MS) {
      return NextResponse.json({ error: 'Message can only be edited within 1 minute of sending' }, { status: 403 });
    }

    const updated = await prisma.conversationMessage.update({
      where: { id: messageId },
      data: { content: parsed.data.content },
      select: {
        id: true,
        content: true,
        attachments: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, position: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, conversationId, messageId }, 'Failed to edit conversation message');
    return NextResponse.json({ error: 'Failed to edit message' }, { status: 500 });
  }
});
