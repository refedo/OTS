/**
 * GET  /api/hr/letter-serial-configs  — list all serial configs
 * POST /api/hr/letter-serial-configs  — create a new serial config for a letter type
 *
 * 19.1.0
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
  prefix: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/, 'Prefix must be uppercase letters/digits only'),
  mask: z.string().min(1).max(100).default('{PREFIX}-{YY}-{NNNN}'),
  resetYearly: z.boolean().default(true),
});

export const GET = withApiContext(async () => {
  try {
    const configs = await prisma.hrLetterSerialConfig.findMany({
      orderBy: { letterType: 'asc' },
    });
    return NextResponse.json(configs);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch letter serial configs');
    return NextResponse.json({ error: 'Failed to fetch configs' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest) => {
  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  const existing = await prisma.hrLetterSerialConfig.findUnique({ where: { letterType: d.letterType } });
  if (existing) {
    return NextResponse.json({ error: 'Config already exists for this letter type' }, { status: 409 });
  }

  try {
    const config = await prisma.hrLetterSerialConfig.create({
      data: {
        letterType: d.letterType,
        prefix: d.prefix.toUpperCase(),
        mask: d.mask,
        resetYearly: d.resetYearly,
        currentSeq: 0,
      },
    });
    logger.info({ configId: config.id, letterType: d.letterType }, '[LetterSerial] Config created');
    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create letter serial config');
    return NextResponse.json({ error: 'Failed to create config' }, { status: 500 });
  }
});
