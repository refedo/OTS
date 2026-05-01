import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const review = await prisma.imsManagementReview.findFirst({ where: { id, deletedAt: null } });
    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    if (review.status === 'LOCKED') return NextResponse.json({ error: 'Review is locked' }, { status: 400 });

    // Gather live data from OTS modules in parallel
    const [ncrGroups, risks, openDCRs, legalIssues, kpiDefs, auditFindings, prevReview, ohsRisks] = await Promise.allSettled([
      // NCR summary by status
      prisma.nCRReport.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      // High/Critical risks
      prisma.imsRisk.findMany({
        where: { deletedAt: null, currentRiskLevel: { gte: 3 } },
        select: {
          riskNumber: true,
          title: true,
          currentRiskRating: true,
          currentRiskLevel: true,
          status: true,
        },
        orderBy: { currentRiskLevel: 'desc' },
        take: 20,
      }),
      // Open change requests (for DCR count in audit results)
      prisma.imsChangeRequest.count({ where: { deletedAt: null, status: { in: ['OPEN', 'PENDING', 'SUBMITTED'] } } }),
      // Non-compliant legal items
      prisma.imsLegalRegister.findMany({
        where: { deletedAt: null, complianceStatus: { not: 'Compliant' } },
        select: { referenceNumber: true, title: true, complianceStatus: true, isoStandard: true },
      }),
      // KPI summary
      prisma.kPIDefinition.findMany({
        where: { isActive: true },
        select: { id: true, name: true, frequency: true, target: true, unit: true },
        take: 20,
      }),
      // Open audit findings (replaces DCR-only proxy)
      prisma.imsAuditFinding.findMany({
        where: { status: { not: 'CLOSED' } },
        select: { findingNumber: true, type: true, clause: true, description: true, status: true, targetDate: true },
        take: 30,
      }),
      // Most recent prior management review (for §9.3.2 item 1 — previous actions)
      prisma.imsManagementReview.findFirst({
        where: {
          deletedAt: null,
          id: { not: id },
          reviewDate: { lt: review.reviewDate },
        },
        orderBy: { reviewDate: 'desc' },
        select: { reviewNumber: true, outputDecisions: true, reviewDate: true },
      }),
      // All risks by status (used for OH&S performance summary §9.3.2 item 10)
      prisma.imsRisk.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
    ]);

    const inputNcrSummary = ncrGroups.status === 'fulfilled'
      ? ncrGroups.value.map((g: { status: string; _count: { id: number } }) => ({ status: g.status, count: g._count.id }))
      : { error: 'NCR data unavailable' };

    const inputRiskSummary = risks.status === 'fulfilled'
      ? { totalHighCritical: risks.value.length, risks: risks.value }
      : { error: 'Risk data unavailable' };

    const inputAuditResults = (() => {
      const findings = auditFindings.status === 'fulfilled' ? auditFindings.value : [];
      const dcrCount = openDCRs.status === 'fulfilled' ? openDCRs.value : null;
      return { openFindings: findings, openDCRs: dcrCount, note: 'Open audit findings and document change requests' };
    })();

    const inputLegalChanges = legalIssues.status === 'fulfilled'
      ? legalIssues.value
      : { error: 'Legal data unavailable' };

    const inputKpiStatus = kpiDefs.status === 'fulfilled'
      ? { kpis: kpiDefs.value, note: 'KPI current values — refer to Business Planning module for measurements' }
      : { error: 'KPI data unavailable' };

    const inputPreviousActions = prevReview.status === 'fulfilled' && prevReview.value
      ? {
          reviewNumber: prevReview.value.reviewNumber,
          reviewDate: prevReview.value.reviewDate,
          decisions: prevReview.value.outputDecisions,
        }
      : { note: 'No prior management review found' };

    const inputOhsPerformance = ohsRisks.status === 'fulfilled'
      ? { byStatus: ohsRisks.value.map((g: { status: string; _count: { id: number } }) => ({ status: g.status, count: g._count.id })), note: 'All IMS risks by status — review OH&S-specific items in the Risk Register' }
      : { error: 'Risk data unavailable' };

    const populated = await prisma.imsManagementReview.update({
      where: { id },
      data: {
        inputNcrSummary,
        inputRiskSummary,
        inputAuditResults,
        inputLegalChanges,
        inputKpiStatus,
        inputPreviousActions,
        inputOhsPerformance,
      },
    });

    systemEventService.log({
      eventType: 'IMS_MANAGEMENT_REVIEW_POPULATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsManagementReview',
      entityId: id,
      entityName: review.reviewNumber,
      summary: `Management review ${review.reviewNumber} populated from live OTS data`,
      details: {},
    });

    return NextResponse.json(populated);
  } catch (error) {
    logger.error({ error }, 'Failed to populate management review');
    return NextResponse.json({ error: 'Failed to populate review' }, { status: 500 });
  }
}
