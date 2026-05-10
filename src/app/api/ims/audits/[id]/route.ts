import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const UpdateSchema = z.object({
  // Core fields
  scope: z.string().min(1).optional(),
  scheduledDate: z.string().datetime().optional(),
  actualDate: z.string().datetime().optional().nullable(),
  clausesCovered: z.array(z.string()).optional(),
  auditorId: z.string().uuid().optional().nullable(),
  auditeeId: z.string().uuid().optional().nullable(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  // FRM-004 fields
  processArea: z.string().optional().nullable(),
  riskLevel: z.enum(['High', 'Medium', 'Low']).optional().nullable(),
  isoClausesInScope: z.array(z.string()).optional().nullable(),
  auditorIndependenceConfirmed: z.boolean().optional(),
  approvedByImsManagerName: z.string().optional().nullable(),
  approvedByImsManagerDate: z.string().datetime().optional().nullable(),
  approvedByImsManagerSigned: z.boolean().optional(),
  approvedByTopMgmtName: z.string().optional().nullable(),
  approvedByTopMgmtDate: z.string().datetime().optional().nullable(),
  approvedByTopMgmtSigned: z.boolean().optional(),
  // FRM-005 report fields
  reportExecutiveSummary: z.string().optional().nullable(),
  reportAuditMethod: z.array(z.string()).optional().nullable(),
  reportPositiveFindings: z.string().optional().nullable(),
  reportConclusion: z.enum(['Fully conforming', 'Minor NCs identified', 'Major NC identified — re-audit required']).optional().nullable(),
  reportRecommendation: z.string().optional().nullable(),
  reportLeadAuditorName: z.string().optional().nullable(),
  reportLeadAuditorDate: z.string().datetime().optional().nullable(),
  reportLeadAuditorSigned: z.boolean().optional(),
  reportImsMgrName: z.string().optional().nullable(),
  reportImsMgrDate: z.string().datetime().optional().nullable(),
  reportImsMgrSigned: z.boolean().optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const audit = await prisma.imsAudit.findUnique({
      where: { id },
      include: {
        plan: { select: { planNumber: true, auditType: true, year: true } },
        auditor: { select: { id: true, name: true } },
        auditee: { select: { id: true, name: true } },
        findings: {
          include: {
            responsible: { select: { id: true, name: true } },
          },
          orderBy: { findingNumber: 'asc' },
        },
      },
    });

    if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(audit);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch audit');
    return NextResponse.json({ error: 'Failed to fetch audit' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();

    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const updated = await prisma.imsAudit.update({
      where: { id },
      data: {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        actualDate: data.actualDate !== undefined ? (data.actualDate ? new Date(data.actualDate) : null) : undefined,
        approvedByImsManagerDate: data.approvedByImsManagerDate !== undefined
          ? (data.approvedByImsManagerDate ? new Date(data.approvedByImsManagerDate) : null)
          : undefined,
        approvedByTopMgmtDate: data.approvedByTopMgmtDate !== undefined
          ? (data.approvedByTopMgmtDate ? new Date(data.approvedByTopMgmtDate) : null)
          : undefined,
        reportLeadAuditorDate: data.reportLeadAuditorDate !== undefined
          ? (data.reportLeadAuditorDate ? new Date(data.reportLeadAuditorDate) : null)
          : undefined,
        reportImsMgrDate: data.reportImsMgrDate !== undefined
          ? (data.reportImsMgrDate ? new Date(data.reportImsMgrDate) : null)
          : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update audit');
    return NextResponse.json({ error: 'Failed to update audit' }, { status: 500 });
  }
}
