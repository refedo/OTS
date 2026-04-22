/**
 * GET  /api/hr/letters  — list letters (optional ?employeeId=, ?type=, ?classification=, ?status=)
 * POST /api/hr/letters  — create a new letter with per-type serial number, notify CEO
 *
 * 19.1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

const LETTER_TYPES = [
  'QUESTIONING', 'ATTENTION', 'FIRST_WARNING', 'FINAL_WARNING',
  'NON_RENEWAL_NOTICE', 'DISMISSAL', 'CIRCULATION', 'WORK_COMMENCEMENT',
  'SALARY_CERTIFICATE', 'LEAVE_NOTICE', 'RETURN_FROM_LEAVE',
  'PROBATION_EVALUATION', 'PERFORMANCE_APPRAISAL', 'CLEARANCE_FORM',
  'SALARY_NON_DISCLOSURE', 'OTHER',
] as const;

const createSchema = z.object({
  employeeId: z.string().uuid(),
  letterType: z.enum(LETTER_TYPES),
  classification: z.enum(['INTERNAL', 'EXTERNAL']).default('INTERNAL'),
  language: z.enum(['ARABIC', 'ENGLISH', 'BILINGUAL']).default('ARABIC'),
  subject: z.string().min(1).max(500),
  content: z.string().max(50000).optional(),
  contentEn: z.string().max(50000).optional(),
  attachmentUrl: z.string().max(1000).optional(),
  issuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional(),
});

/** Generate next number from per-type serial config, or fall back to INT/EXT-YY-NNNN */
async function resolveLetterNumber(
  letterType: string,
  classification: 'INTERNAL' | 'EXTERNAL',
  attempt = 0,
): Promise<{ number: string; configId?: string; newSeq?: number; newYear?: number }> {
  // Wrap in try-catch: HrLetterSerialConfig table may not exist yet if the
  // startup migration hasn't run (e.g. first deploy). Fall through to fallback.
  let config = null;
  try {
    config = await prisma.hrLetterSerialConfig.findUnique({
      where: { letterType: letterType as never },
    });
  } catch {
    // Table not ready — use fallback numbering
  }

  if (config) {
    const year = new Date().getFullYear();
    const twoDigitYear = year.toString().slice(-2);
    const needsReset = config.resetYearly && config.lastResetYear !== null && config.lastResetYear !== year;
    const newSeq = needsReset ? 1 + attempt : config.currentSeq + 1 + attempt;

    // Apply mask: replace {PREFIX}, {YY}, {YYYY}, and any run of N chars
    const nCount = (config.mask.match(/N+/) ?? ['NNNN'])[0].length;
    const numStr = newSeq.toString().padStart(nCount, '0');
    const number = config.mask
      .replace('{PREFIX}', config.prefix)
      .replace('{YYYY}', year.toString())
      .replace('{YY}', twoDigitYear)
      .replace(/N+/, numStr);

    return { number, configId: config.id, newSeq, newYear: year };
  }

  // Fallback: INT/EXT-YY-NNNN (original behaviour)
  const prefix = classification === 'INTERNAL' ? 'INT' : 'EXT';
  const year = new Date().getFullYear().toString().slice(-2);
  const last = await prisma.hrLetter.findFirst({
    where: { letterNumber: { startsWith: `${prefix}-${year}-` } },
    orderBy: { letterNumber: 'desc' },
    select: { letterNumber: true },
  });
  const seq = (last ? parseInt(last.letterNumber.split('-')[2] ?? '0', 10) : 0) + 1 + attempt;
  return { number: `${prefix}-${year}-${seq.toString().padStart(4, '0')}` };
}

/** Resolve letter number INSIDE a transaction — reads actual max from DB to avoid race conditions */
async function resolveLetterNumberInTx(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  letterType: string,
  classification: 'INTERNAL' | 'EXTERNAL',
): Promise<{ number: string; configId?: string; newSeq?: number; newYear?: number }> {
  // Try serial config table first
  let config = null;
  try {
    config = await tx.hrLetterSerialConfig.findUnique({
      where: { letterType: letterType as never },
    });
  } catch {
    // Table not ready — use fallback
  }

  if (config) {
    const year = new Date().getFullYear();
    const twoDigitYear = year.toString().slice(-2);
    const needsReset = config.resetYearly && config.lastResetYear !== null && config.lastResetYear !== year;
    const newSeq = needsReset ? 1 : config.currentSeq + 1;
    const nCount = (config.mask.match(/N+/) ?? ['NNNN'])[0].length;
    const numStr = newSeq.toString().padStart(nCount, '0');
    const number = config.mask
      .replace('{PREFIX}', config.prefix)
      .replace('{YYYY}', year.toString())
      .replace('{YY}', twoDigitYear)
      .replace(/N+/, numStr);
    return { number, configId: config.id, newSeq, newYear: year };
  }

  // Fallback: query actual max inside tx using raw SQL to get correct current count
  const prefix = classification === 'INTERNAL' ? 'INT' : 'EXT';
  const year = new Date().getFullYear().toString().slice(-2);
  const pattern = `${prefix}-${year}-%`;
  type MaxRow = { maxNum: string | null };
  let maxSeq = 0;
  try {
    const rows = await tx.$queryRaw<MaxRow[]>`
      SELECT MAX(letterNumber) as maxNum FROM HrLetter
      WHERE letterNumber LIKE ${pattern}
    `;
    const maxNum = rows[0]?.maxNum;
    if (maxNum) {
      const parts = maxNum.split('-');
      maxSeq = parseInt(parts[2] ?? '0', 10) || 0;
    }
  } catch {
    // HrLetter table might not exist on first deploy — start from 0
  }
  const seq = maxSeq + 1;
  return { number: `${prefix}-${year}-${seq.toString().padStart(4, '0')}` };
}

/** Find all users who hold the hr.letters.approveCeo permission (or ALL) */
async function findCeoApprovers(): Promise<{ id: string }[]> {
  const [withPerm, withAll] = await Promise.all([
    prisma.user.findMany({
      where: {
        status: 'active',
        role: { permissions: { path: '$', string_contains: 'hr.letters.approveCeo' } },
      },
      select: { id: true },
    }),
    prisma.user.findMany({
      where: {
        status: 'active',
        role: { permissions: { path: '$', string_contains: '"ALL"' } },
      },
      select: { id: true },
    }),
  ]);
  const seen = new Set<string>();
  return [...withPerm, ...withAll].filter((u) => {
    if (seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });
}

const LETTER_INCLUDE = {
  employee: { select: { id: true, fullNameEn: true, fullNameAr: true, employmentId: true, department: true, occupation: true } },
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  rejectedBy: { select: { id: true, name: true } },
} as const;

// Minimal include for the POST create response — only uses original columns
// that existed before the add_hr_letter_enhancements migration. Avoids FK-column
// errors if the migration hasn't run yet on first deploy.
const LETTER_INCLUDE_SAFE = {
  employee: { select: { id: true, fullNameEn: true, fullNameAr: true, employmentId: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

// Explicit select for the tier-2 fallback (add_letter_bilingual_ceo_sig not yet applied).
// Must use select (not include) so Prisma does NOT try to read contentEn from the DB.
const LETTER_SELECT_NO_CONTENT_EN = {
  id: true, letterNumber: true, letterType: true, classification: true,
  language: true, status: true, subject: true, content: true,
  attachmentUrl: true, issuedAt: true, notes: true,
  createdAt: true, updatedAt: true, deletedAt: true,
  employeeId: true, createdById: true,
  employee: { select: { id: true, fullNameEn: true, fullNameAr: true, employmentId: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

// Tier-3 fallback: no enhancement fields (add_hr_letter_enhancements not yet applied).
const LETTER_SELECT_MINIMAL = {
  id: true, letterNumber: true, letterType: true, classification: true,
  subject: true, content: true, attachmentUrl: true, issuedAt: true, notes: true,
  createdAt: true, updatedAt: true, deletedAt: true,
  employeeId: true, createdById: true,
  employee: { select: { id: true, fullNameEn: true, fullNameAr: true, employmentId: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

export const GET = withApiContext(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  const type = searchParams.get('type');
  const classification = searchParams.get('classification');
  const status = searchParams.get('status');

  try {
    const letters = await prisma.hrLetter.findMany({
      where: {
        deletedAt: null,
        ...(employeeId ? { employeeId } : {}),
        ...(type ? { letterType: type as never } : {}),
        ...(classification ? { classification: classification as never } : {}),
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { issuedAt: 'desc' },
      include: LETTER_INCLUDE,
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
    select: { id: true, fullNameEn: true },
  });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { letter, letterNumber } = await prisma.$transaction(async (tx) => {
        // Resolve letter number INSIDE the transaction to avoid race conditions.
        // Re-query the actual current max seq from the DB while holding the tx lock.
        const resolved = await resolveLetterNumberInTx(tx, d.letterType, d.classification);

        // If using a serial config, atomically update its sequence
        if (resolved.configId && resolved.newSeq !== undefined && resolved.newYear !== undefined) {
          try {
            await tx.hrLetterSerialConfig.update({
              where: { id: resolved.configId },
              data: { currentSeq: resolved.newSeq, lastResetYear: resolved.newYear },
            });
          } catch {
            // Non-fatal — table not ready, skip serial update
          }
        }

        // Tier-1: Full create with all current fields (contentEn, language, status).
        // Tier-2: Without contentEn — add_letter_bilingual_ceo_sig not yet applied.
        // Tier-3: Without any enhancement fields — add_hr_letter_enhancements not yet applied.
        try {
          const l1 = await tx.hrLetter.create({
            data: {
              letterNumber: resolved.number,
              letterType: d.letterType,
              classification: d.classification,
              language: d.language,
              status: 'PENDING_CEO',
              employeeId: d.employeeId,
              subject: d.subject,
              content: d.content ?? null,
              contentEn: d.contentEn ?? null,
              attachmentUrl: d.attachmentUrl ?? null,
              issuedAt: new Date(d.issuedAt),
              notes: d.notes ?? null,
              createdById: session!.userId,
            },
            include: LETTER_INCLUDE_SAFE,
          });
          return { letter: l1, letterNumber: resolved.number };
        } catch (err1: unknown) {
          const isUnique1 = typeof err1 === 'object' && err1 !== null && 'code' in err1 && (err1 as { code: string }).code === 'P2002';
          if (isUnique1) throw err1;
          try {
            // Tier-2: contentEn column missing — skip it but keep status/language
            const l2 = await tx.hrLetter.create({
              data: {
                letterNumber: resolved.number,
                letterType: d.letterType,
                classification: d.classification,
                language: d.language,
                status: 'PENDING_CEO',
                employeeId: d.employeeId,
                subject: d.subject,
                content: d.content ?? null,
                attachmentUrl: d.attachmentUrl ?? null,
                issuedAt: new Date(d.issuedAt),
                notes: d.notes ?? null,
                createdById: session!.userId,
              },
              select: LETTER_SELECT_NO_CONTENT_EN,
            });
            return { letter: l2, letterNumber: resolved.number };
          } catch (err2: unknown) {
            const isUnique2 = typeof err2 === 'object' && err2 !== null && 'code' in err2 && (err2 as { code: string }).code === 'P2002';
            if (isUnique2) throw err2;
            // Tier-3: no enhancement fields at all
            const l3 = await tx.hrLetter.create({
              data: {
                letterNumber: resolved.number,
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
              select: LETTER_SELECT_MINIMAL,
            });
            return { letter: l3, letterNumber: resolved.number };
          }
        }
      });

      logger.info({ letterId: letter.id, letterNumber, employeeId: d.employeeId }, '[Letters] Created');

      // Notify all CEO approvers (fire-and-forget)
      findCeoApprovers().then((ceos) => {
        const creatorName = letter.createdBy?.name ?? 'HR';
        ceos.forEach((ceo) => {
          NotificationService.createNotification({
            userId: ceo.id,
            type: 'APPROVAL_REQUIRED',
            title: 'Letter Approval Required',
            message: `${creatorName} issued letter ${letterNumber} for ${employee.fullNameEn} — awaiting your approval`,
            relatedEntityType: 'hr_letter',
            relatedEntityId: letter.id,
          }).catch((err) => logger.warn({ err, userId: ceo.id }, 'Failed to notify CEO about letter'));
        });
      }).catch((err) => logger.warn({ err }, 'Failed to fetch CEO approvers'));

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
