/**
 * GET  /api/hr/circulations  — list circulations
 * POST /api/hr/circulations  — create a new circulation, notify CEO approvers
 *
 * 19.16.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

const createSchema = z.object({
  subject: z.string().min(1).max(500),
  subjectEn: z.string().max(500).optional(),
  content: z.string().max(100000).optional(),
  contentEn: z.string().max(100000).optional(),
  language: z.enum(['ARABIC', 'ENGLISH', 'BILINGUAL']).default('ARABIC'),
  targetType: z.enum(['ALL', 'DEPARTMENTS', 'EMPLOYEES']).default('ALL'),
  attachmentUrl: z.string().max(1000).optional(),
  issuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional(),
  // Recipient lists (used when targetType is DEPARTMENTS or EMPLOYEES)
  departmentIds: z.array(z.string().uuid()).optional(),
  employeeIds: z.array(z.string().uuid()).optional(),
});

const CIRC_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  rejectedBy: { select: { id: true, name: true } },
  recipients: {
    include: {
      employee: { select: { id: true, fullNameEn: true, fullNameAr: true, employmentId: true } },
      department: { select: { id: true, name: true } },
    },
  },
} as const;

/** Find all users who hold the hr.letters.approveCeo permission (or ALL) */
async function findCeoApprovers(): Promise<{ id: string }[]> {
  const [withPerm, withAll] = await Promise.all([
    prisma.user.findMany({
      where: { status: 'active', role: { permissions: { path: '$', string_contains: 'hr.letters.approveCeo' } } },
      select: { id: true },
    }),
    prisma.user.findMany({
      where: { status: 'active', role: { permissions: { path: '$', string_contains: '"ALL"' } } },
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

/** Generate the next circulation number: CIR-YY-NNNN */
async function resolveCirculationNumber(attempt = 0): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const last = await prisma.hrCirculation.findFirst({
    where: { circulationNumber: { startsWith: `CIR-${year}-` } },
    orderBy: { circulationNumber: 'desc' },
    select: { circulationNumber: true },
  });
  const seq = (last ? parseInt(last.circulationNumber.split('-')[2] ?? '0', 10) : 0) + 1 + attempt;
  return `CIR-${year}-${seq.toString().padStart(4, '0')}`;
}

export const GET = withApiContext(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  try {
    const circulations = await prisma.hrCirculation.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: CIRC_INCLUDE,
    });
    return NextResponse.json(circulations);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch circulations');
    return NextResponse.json({ error: 'Failed to fetch circulations' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  const { checkPermission } = await import('@/lib/permission-checker');
  const canManage = await checkPermission('hr.letters.manage');
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const circulationNumber = await resolveCirculationNumber(attempt);

      const circ = await prisma.$transaction(async (tx) => {
        const created = await tx.hrCirculation.create({
          data: {
            circulationNumber,
            subject: d.subject,
            subjectEn: d.subjectEn ?? null,
            content: d.content ?? null,
            contentEn: d.contentEn ?? null,
            language: d.language,
            status: 'PENDING_CEO',
            targetType: d.targetType,
            attachmentUrl: d.attachmentUrl ?? null,
            issuedAt: new Date(d.issuedAt),
            notes: d.notes ?? null,
            createdById: session!.userId,
          },
        });

        // Create recipients
        const recipientRows: { id: string; circulationId: string; employeeId?: string; departmentId?: string }[] = [];

        if (d.targetType === 'DEPARTMENTS' && d.departmentIds?.length) {
          for (const departmentId of d.departmentIds) {
            recipientRows.push({ id: crypto.randomUUID(), circulationId: created.id, departmentId });
          }
        } else if (d.targetType === 'EMPLOYEES' && d.employeeIds?.length) {
          for (const employeeId of d.employeeIds) {
            recipientRows.push({ id: crypto.randomUUID(), circulationId: created.id, employeeId });
          }
        }

        if (recipientRows.length > 0) {
          await tx.hrCirculationRecipient.createMany({ data: recipientRows });
        }

        return created;
      });

      logger.info({ circId: circ.id, circulationNumber, userId: session!.userId }, '[Circulations] Created');

      // Notify CEO approvers (fire-and-forget)
      findCeoApprovers().then((ceos) => {
        ceos.forEach((ceo) => {
          NotificationService.createNotification({
            userId: ceo.id,
            type: 'APPROVAL_REQUIRED',
            title: 'Circulation Approval Required',
            message: `New circulation "${d.subject}" requires your approval`,
            relatedEntityType: 'hr_circulation',
            relatedEntityId: circ.id,
          }).catch((err) => logger.warn({ err, userId: ceo.id }, 'Failed to notify CEO about circulation'));
        });
      }).catch((err) => logger.warn({ err }, 'Failed to fetch CEO approvers for circulation'));

      return NextResponse.json(circ, { status: 201 });
    } catch (error: unknown) {
      const isPrismaUnique = typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002';
      if (isPrismaUnique && attempt < 4) continue;
      logger.error({ error }, 'Failed to create circulation');
      return NextResponse.json({ error: 'Failed to create circulation' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'Failed to generate unique circulation number' }, { status: 500 });
});
