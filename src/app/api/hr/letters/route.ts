/**
 * GET  /api/hr/letters  — list letters (optional ?employeeId=, ?type=, ?classification=)
 * POST /api/hr/letters  — create a new letter with auto-number
 *
 * 18.16.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  employeeId: z.string().uuid(),
  letterType: z.enum([
    'QUESTIONING', 'ATTENTION', 'FIRST_WARNING', 'FINAL_WARNING',
    'NON_RENEWAL_NOTICE', 'DISMISSAL', 'CIRCULATION', 'WORK_COMMENCEMENT',
    'SALARY_CERTIFICATE', 'LEAVE_NOTICE', 'RETURN_FROM_LEAVE',
    'PROBATION_EVALUATION', 'PERFORMANCE_APPRAISAL', 'CLEARANCE_FORM',
    'SALARY_NON_DISCLOSURE', 'OTHER',
  ]),
  classification: z.enum(['INTERNAL', 'EXTERNAL']).default('INTERNAL'),
  subject: z.string().min(1).max(500),
  content: z.string().max(50000).optional(),
  attachmentUrl: z.string().max(1000).optional(),
  issuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional(),
});

async function generateLetterNumber(classification: 'INTERNAL' | 'EXTERNAL', attempt = 0): Promise<string> {
  const prefix = classification === 'INTERNAL' ? 'INT' : 'EXT';
  const year = new Date().getFullYear().toString().slice(-2);
  const last = await prisma.hrLetter.findFirst({
    where: { letterNumber: { startsWith: `${prefix}-${year}-` } },
    orderBy: { letterNumber: 'desc' },
    select: { letterNumber: true },
  });
  const seq = (last ? parseInt(last.letterNumber.split('-')[2] ?? '0', 10) : 0) + 1 + attempt;
  return `${prefix}-${year}-${seq.toString().padStart(4, '0')}`;
}

export const GET = withApiContext(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  const type = searchParams.get('type');
  const classification = searchParams.get('classification');

  try {
    const letters = await prisma.hrLetter.findMany({
      where: {
        deletedAt: null,
        ...(employeeId ? { employeeId } : {}),
        ...(type ? { letterType: type as never } : {}),
        ...(classification ? { classification: classification as never } : {}),
      },
      orderBy: { issuedAt: 'desc' },
      include: {
        employee: { select: { id: true, fullNameEn: true, employmentId: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(letters);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch HR letters');
    return NextResponse.json({ error: 'Failed to fetch letters' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  const employee = await prisma.employee.findFirst({
    where: { id: d.employeeId, deletedAt: null },
    select: { id: true },
  });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  for (let attempt = 0; attempt < 5; attempt++) {
  try {
    const letterNumber = await generateLetterNumber(d.classification, attempt);
    const letter = await prisma.hrLetter.create({
      data: {
        letterNumber,
        letterType: d.letterType,
        classification: d.classification,
        employeeId: d.employeeId,
        subject: d.subject,
        content: d.content ?? null,
        attachmentUrl: d.attachmentUrl ?? null,
        issuedAt: new Date(d.issuedAt),
        notes: d.notes ?? null,
        createdById: session!.userId,
      },
      include: {
        employee: { select: { id: true, fullNameEn: true, employmentId: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    logger.info({ letterId: letter.id, letterNumber, employeeId: d.employeeId }, '[Letters] Created');
    return NextResponse.json(letter, { status: 201 });
  } catch (error: unknown) {
    const isPrismaUnique = typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002';
    if (isPrismaUnique && attempt < 4) continue;
    logger.error({ error }, 'Failed to create HR letter');
    return NextResponse.json({ error: 'Failed to create letter' }, { status: 500 });
  }
  }
  return NextResponse.json({ error: 'Failed to generate unique letter number' }, { status: 500 });
});
