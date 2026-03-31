import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';

type DecisionCategory =
  | 'task_approval'
  | 'payment_action'
  | 'procurement_urgent'
  | 'ncr_critical'
  | 'project_overrun';

interface DecisionItem {
  id: string;
  category: DecisionCategory;
  description: string;
  projectRef: string | null;
  daysOverdue: number;
  actionLink: string;
  urgency: 'critical' | 'high' | 'medium';
}

export const GET = withApiContext(async (_req: NextRequest, _session) => {
  const hasAccess = await checkPermission('executive.view');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const items: DecisionItem[] = [];
  const now = new Date();

  try {
    // ── 1. Tasks in "Waiting for Approval" overdue >3 days ─────────────────
    const approvalCutoff = new Date(now);
    approvalCutoff.setDate(approvalCutoff.getDate() - 3);

    const overdueApprovals = await prisma.task.findMany({
      where: {
        status: 'Waiting for Approval',
        dueDate: { lt: approvalCutoff },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        project: { select: { projectNumber: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    for (const task of overdueApprovals) {
      const daysOverdue = task.dueDate
        ? Math.floor((now.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      items.push({
        id: `task-${task.id}`,
        category: 'task_approval',
        description: `Task awaiting approval: ${task.title}`,
        projectRef: task.project?.projectNumber ?? null,
        daysOverdue,
        actionLink: `/tasks/${task.id}`,
        urgency: daysOverdue > 7 ? 'critical' : daysOverdue > 5 ? 'high' : 'medium',
      });
    }

    // ── 2. Payment schedule actions not yet actioned ───────────────────────
    const paymentActions = await prisma.projectPaymentSchedule.findMany({
      where: {
        actionRequired: { in: ['Stop Shipping', 'Collection Call'] },
        status: { not: 'received' },
      },
      select: {
        id: true,
        actionRequired: true,
        actionNotes: true,
        dueDate: true,
        project: { select: { projectNumber: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    for (const payment of paymentActions) {
      const daysOverdue = payment.dueDate
        ? Math.max(
            0,
            Math.floor((now.getTime() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
          )
        : 0;
      items.push({
        id: `payment-${payment.id}`,
        category: 'payment_action',
        description: `${payment.actionRequired}: ${payment.project.name}${payment.actionNotes ? ` — ${payment.actionNotes}` : ''}`,
        projectRef: payment.project.projectNumber,
        daysOverdue,
        actionLink: `/financial/reports/payment-schedule`,
        urgency: payment.actionRequired === 'Stop Shipping' ? 'critical' : 'high',
      });
    }

    // ── 3. LCR items with no PO, needed within 14 days ────────────────────
    const fourteenDaysOut = new Date(now);
    fourteenDaysOut.setDate(fourteenDaysOut.getDate() + 14);

    const urgentProcurement = await prisma.lcrEntry.findMany({
      where: {
        isDeleted: false,
        poNumber: null,
        neededToDate: { lte: fourteenDaysOut, gte: now },
      },
      select: {
        id: true,
        itemLabel: true,
        neededToDate: true,
        project: { select: { projectNumber: true } },
      },
      orderBy: { neededToDate: 'asc' },
      take: 5,
    });

    for (const lcr of urgentProcurement) {
      const daysUntilDue = lcr.neededToDate
        ? Math.ceil((lcr.neededToDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 14;
      items.push({
        id: `lcr-${lcr.id}`,
        category: 'procurement_urgent',
        description: `No PO raised — ${lcr.itemLabel ?? 'item'} needed in ${daysUntilDue} days`,
        projectRef: lcr.project?.projectNumber ?? null,
        daysOverdue: Math.max(0, 14 - daysUntilDue),
        actionLink: `/supply-chain/lcr`,
        urgency: daysUntilDue <= 3 ? 'critical' : daysUntilDue <= 7 ? 'high' : 'medium',
      });
    }

    // ── 4. Critical NCRs unresolved >7 days ───────────────────────────────
    const ncrCutoff = new Date(now);
    ncrCutoff.setDate(ncrCutoff.getDate() - 7);

    const criticalNcrs = await prisma.nCRReport.findMany({
      where: {
        severity: 'Critical',
        status: { not: 'Closed' },
        createdAt: { lt: ncrCutoff },
      },
      select: {
        id: true,
        ncrNumber: true,
        description: true,
        createdAt: true,
        project: { select: { projectNumber: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    for (const ncr of criticalNcrs) {
      const daysOverdue = Math.floor(
        (now.getTime() - ncr.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      items.push({
        id: `ncr-${ncr.id}`,
        category: 'ncr_critical',
        description: `Critical NCR ${ncr.ncrNumber}: ${ncr.description.slice(0, 80)}${ncr.description.length > 80 ? '…' : ''}`,
        projectRef: ncr.project.projectNumber,
        daysOverdue,
        actionLink: `/qc/ncr/${ncr.id}`,
        urgency: 'critical',
      });
    }

    // ── 5. Projects with passed scope schedule end date, <80% production ──
    const overdueScopes = await prisma.scopeSchedule.findMany({
      where: { endDate: { lt: now } },
      distinct: ['projectId'],
      select: { projectId: true, endDate: true },
    });

    const overdueScopeProjectIds = overdueScopes.map(s => s.projectId);

    if (overdueScopeProjectIds.length > 0) {
      const lowProductionProjects = await prisma.project.findMany({
        where: {
          id: { in: overdueScopeProjectIds },
          status: 'Active',
          deletedAt: null,
        },
        select: {
          id: true,
          projectNumber: true,
          name: true,
          assemblyParts: {
            where: { deletedAt: null },
            select: { netWeightTotal: true, status: true },
          },
        },
        take: 5,
      });

      for (const project of lowProductionProjects) {
        const totalWeight = project.assemblyParts.reduce(
          (sum, p) => sum + (Number(p.netWeightTotal) || 0),
          0,
        );
        const completedWeight = project.assemblyParts
          .filter(p => p.status === 'Completed')
          .reduce((sum, p) => sum + (Number(p.netWeightTotal) || 0), 0);
        const productionPct = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;

        if (productionPct < 80) {
          const scope = overdueScopes.find(s => s.projectId === project.id);
          const daysOverdue = scope?.endDate
            ? Math.floor((now.getTime() - scope.endDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          items.push({
            id: `overrun-${project.id}`,
            category: 'project_overrun',
            description: `${project.name} — schedule passed, ${Math.round(productionPct)}% production complete`,
            projectRef: project.projectNumber,
            daysOverdue,
            actionLink: `/projects/${project.id}`,
            urgency: daysOverdue > 14 ? 'critical' : daysOverdue > 7 ? 'high' : 'medium',
          });
        }
      }
    }

    // Sort by urgency then daysOverdue
    const urgencyOrder = { critical: 0, high: 1, medium: 2 };
    items.sort((a, b) => {
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      return urgencyDiff !== 0 ? urgencyDiff : b.daysOverdue - a.daysOverdue;
    });

    return NextResponse.json({
      data: items.slice(0, 20),
      meta: { generatedAt: new Date().toISOString(), total: items.length },
    });
  } catch (error) {
    logger.error({ error }, '[Executive] Failed to fetch decisions required');
    return NextResponse.json({ error: 'Failed to fetch decisions required' }, { status: 500 });
  }
});
