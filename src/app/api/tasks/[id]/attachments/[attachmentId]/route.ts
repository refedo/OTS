import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId, attachmentId } = await params;

  const attachment = await prisma.taskAttachment.findUnique({
    where: { id: attachmentId },
    select: { id: true, taskId: true, filePath: true, uploadedById: true },
  });

  if (!attachment || attachment.taskId !== taskId) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
  }

  // Only the uploader or admins can delete
  const isUploader = attachment.uploadedById === session.sub;
  if (!isUploader) {
    const currentUser = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { isAdmin: true },
    });
    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    // Delete file from disk
    const absolutePath = path.join(process.cwd(), 'public', attachment.filePath);
    if (existsSync(absolutePath)) {
      await unlink(absolutePath);
    }

    await prisma.taskAttachment.delete({ where: { id: attachmentId } });

    logger.info({ taskId, attachmentId }, 'Task attachment deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, taskId, attachmentId }, 'Failed to delete task attachment');
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}
