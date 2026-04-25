import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const attachmentSchema = z.object({
  fileName: z.string(),
  filePath: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  uploadedAt: z.string(),
});

const createSchema = z.object({
  titleEn: z.string().min(1),
  titleAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  category: z.string().min(1).default('General'),
  durationHours: z.number().int().min(0).default(0),
  targetAudience: z.string().optional(),
  scheduledDate: z.string().optional(),
  status: z.enum(['PLANNED', 'UPCOMING', 'ONGOING', 'COMPLETED']).default('PLANNED'),
  notes: z.string().optional(),
  attachments: z.array(attachmentSchema).nullish(),
});

export const GET = withApiContext(async (_req: NextRequest, _session) => {
  const programs = await prisma.hrTrainingProgram.findMany({
    where: { deletedAt: null },
    orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true, titleEn: true, titleAr: true, descriptionEn: true, descriptionAr: true,
      category: true, durationHours: true, targetAudience: true,
      scheduledDate: true, status: true, notes: true, attachments: true, createdAt: true,
    },
  });
  const serialized = programs.map(p => ({
    ...p,
    scheduledDate: p.scheduledDate ? p.scheduledDate.toISOString().slice(0, 10) : null,
    createdAt: p.createdAt.toISOString(),
  }));
  return NextResponse.json(serialized);
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const program = await prisma.hrTrainingProgram.create({
    data: {
      titleEn: d.titleEn,
      titleAr: d.titleAr || null,
      descriptionEn: d.descriptionEn || null,
      descriptionAr: d.descriptionAr || null,
      category: d.category,
      durationHours: d.durationHours,
      targetAudience: d.targetAudience || null,
      scheduledDate: d.scheduledDate ? new Date(d.scheduledDate) : null,
      status: d.status,
      notes: d.notes || null,
      attachments: d.attachments && d.attachments.length > 0 ? d.attachments : null,
      createdById: session!.userId,
    },
  });
  logger.info({ id: program.id }, '[HR] Training program created');
  return NextResponse.json({ id: program.id }, { status: 201 });
});
