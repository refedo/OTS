/**
 * GET  /api/hr/letters/templates   — list templates (optionally filter by ?letterType=)
 * POST /api/hr/letters/templates   — create a template (requires hr.letters.manage)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const LETTER_TYPES = [
  'QUESTIONING', 'ATTENTION', 'FIRST_WARNING', 'FINAL_WARNING',
  'NON_RENEWAL_NOTICE', 'DISMISSAL', 'CIRCULATION', 'WORK_COMMENCEMENT',
  'SALARY_CERTIFICATE', 'LEAVE_NOTICE', 'RETURN_FROM_LEAVE',
  'PROBATION_EVALUATION', 'PERFORMANCE_APPRAISAL', 'CLEARANCE_FORM',
  'SALARY_NON_DISCLOSURE', 'OTHER',
] as const;

const createSchema = z.object({
  letterType: z.enum(LETTER_TYPES),
  reasonCode: z.string().min(1).max(80),
  subjectAr: z.string().min(1).max(500),
  subjectEn: z.string().min(1).max(500),
  bodyAr: z.string().max(50000).optional(),
  bodyEn: z.string().max(50000).optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const GET = withApiContext(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const letterType = searchParams.get('letterType');

  try {
    const templates = await prisma.hrLetterTemplate.findMany({
      where: {
        ...(letterType ? { letterType: letterType as never } : {}),
        isActive: true,
      },
      orderBy: [{ letterType: 'asc' }, { sortOrder: 'asc' }],
    });
    return NextResponse.json(templates);
  } catch (error) {
    // Table may not exist yet if startup migration hasn't run — return empty array
    const errMsg = String(error);
    if (errMsg.includes("doesn't exist") || errMsg.includes('P2021') || errMsg.toLowerCase().includes('table')) {
      logger.warn({}, 'HrLetterTemplate table not ready — migration pending');
      return NextResponse.json([]);
    }
    logger.error({ error }, 'Failed to fetch letter templates');
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  const { checkPermission } = await import('@/lib/permission-checker');
  if (!(await checkPermission('hr.letters.manage'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const template = await prisma.hrLetterTemplate.create({ data: parsed.data });
    logger.info({ templateId: template.id, userId: session!.userId }, '[LetterTemplates] Created');
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create letter template');
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
});
