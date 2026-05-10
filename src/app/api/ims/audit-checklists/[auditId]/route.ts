import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import { z } from 'zod';

const UpsertSchema = z.object({
  // Section A — Audit Brief
  scopeStatement: z.string().optional().nullable(),
  referenceDocs: z.array(z.string()).optional().nullable(),
  notificationDate: z.string().datetime().optional().nullable(),
  notificationMethod: z.enum(['email', 'verbal', 'written']).optional().nullable(),

  // Section B — Opening Meeting
  openingMeetingDate: z.string().datetime().optional().nullable(),
  openingAttendees: z
    .array(z.object({ name: z.string(), role: z.string() }))
    .optional()
    .nullable(),
  openingAgendaItems: z.string().optional().nullable(),
  scopeChangesAgreed: z.string().optional().nullable(),
  auditeeRepOpeningName: z.string().optional().nullable(),
  auditeeRepOpeningDate: z.string().datetime().optional().nullable(),

  // Section D — Closing Meeting
  closingMeetingDate: z.string().datetime().optional().nullable(),
  closingAttendees: z
    .array(z.object({ name: z.string(), role: z.string() }))
    .optional()
    .nullable(),
  preliminaryFindings: z.string().optional().nullable(),
  auditeeAcceptsFindings: z.boolean().optional().nullable(),
  disagreementNature: z.string().optional().nullable(),
  auditeeRepClosingName: z.string().optional().nullable(),
  auditeeRepClosingDate: z.string().datetime().optional().nullable(),

  // Sampling
  recordsReviewed: z
    .array(z.object({ documentName: z.string(), referenceNumber: z.string() }))
    .optional()
    .nullable(),
  personnelInterviewed: z
    .array(z.object({ name: z.string(), role: z.string() }))
    .optional()
    .nullable(),

  status: z.string().optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ auditId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { auditId } = await params;

    const checklist = await prisma.imsAuditChecklist.findUnique({
      where: { auditId },
      include: {
        rows: {
          select: {
            id: true,
            question: {
              select: {
                id: true,
                questionText: true,
                isoClause: true,
                processArea: true,
              },
            },
            questionText: true,
            isoClause: true,
            result: true,
            evidence: true,
            attachmentUrl: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!checklist) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
    }

    return NextResponse.json(checklist);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch audit checklist');
    return NextResponse.json({ error: 'Failed to fetch audit checklist' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ auditId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { auditId } = await params;
    const body = await req.json();
    const parsed = UpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const upsertData = {
      scopeStatement: data.scopeStatement ?? undefined,
      referenceDocs: data.referenceDocs ?? undefined,
      notificationDate: data.notificationDate ? new Date(data.notificationDate) : undefined,
      notificationMethod: data.notificationMethod ?? undefined,
      openingMeetingDate: data.openingMeetingDate ? new Date(data.openingMeetingDate) : undefined,
      openingAttendees: data.openingAttendees ?? undefined,
      openingAgendaItems: data.openingAgendaItems ?? undefined,
      scopeChangesAgreed: data.scopeChangesAgreed ?? undefined,
      auditeeRepOpeningName: data.auditeeRepOpeningName ?? undefined,
      auditeeRepOpeningDate: data.auditeeRepOpeningDate
        ? new Date(data.auditeeRepOpeningDate)
        : undefined,
      closingMeetingDate: data.closingMeetingDate ? new Date(data.closingMeetingDate) : undefined,
      closingAttendees: data.closingAttendees ?? undefined,
      preliminaryFindings: data.preliminaryFindings ?? undefined,
      auditeeAcceptsFindings: data.auditeeAcceptsFindings ?? undefined,
      disagreementNature: data.disagreementNature ?? undefined,
      auditeeRepClosingName: data.auditeeRepClosingName ?? undefined,
      auditeeRepClosingDate: data.auditeeRepClosingDate
        ? new Date(data.auditeeRepClosingDate)
        : undefined,
      recordsReviewed: data.recordsReviewed ?? undefined,
      personnelInterviewed: data.personnelInterviewed ?? undefined,
      status: data.status ?? undefined,
    };

    const checklist = await prisma.imsAuditChecklist.upsert({
      where: { auditId },
      update: upsertData,
      create: {
        auditId,
        createdById: session.sub,
        ...upsertData,
      },
    });

    systemEventService.log({
      eventType: 'IMS_AUDIT_CHECKLIST_UPDATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsAuditChecklist',
      entityId: checklist.id,
      entityName: auditId,
      summary: `Audit checklist saved for audit ${auditId}`,
      details: { auditId, status: checklist.status },
    });

    return NextResponse.json(checklist);
  } catch (error) {
    logger.error({ error }, 'Failed to upsert audit checklist');
    return NextResponse.json({ error: 'Failed to save audit checklist' }, { status: 500 });
  }
}
