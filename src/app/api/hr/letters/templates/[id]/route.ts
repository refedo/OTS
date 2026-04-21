/**
 * PUT    /api/hr/letters/templates/[id]  — update template
 * DELETE /api/hr/letters/templates/[id]  — delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  subjectAr: z.string().min(1).max(500).optional(),
  subjectEn: z.string().min(1).max(500).optional(),
  bodyAr: z.string().max(50000).nullable().optional(),
  bodyEn: z.string().max(50000).nullable().optional(),
  reasonCode: z.string().min(1).max(80).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const PUT = withApiContext(async (req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const { checkPermission } = await import('@/lib/permission-checker');
  if (!(await checkPermission('hr.letters.manage'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body: unknown = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const template = await prisma.hrLetterTemplate.update({
      where: { id },
      data: parsed.data,
    });
    logger.info({ templateId: id, userId: session!.userId }, '[LetterTemplates] Updated');
    return NextResponse.json(template);
  } catch (error) {
    logger.error({ error }, 'Failed to update letter template');
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (_req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const { checkPermission } = await import('@/lib/permission-checker');
  if (!(await checkPermission('hr.letters.manage'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.hrLetterTemplate.delete({ where: { id } });
    logger.info({ templateId: id, userId: session!.userId }, '[LetterTemplates] Deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete letter template');
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
});
