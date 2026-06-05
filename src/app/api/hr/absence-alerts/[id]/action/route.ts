/**
 * POST /api/hr/absence-alerts/[id]/action — act on an absence alert (OTS-BL-080).
 *
 * Body: { action: 'acknowledge' | 'resolve' | 'dismiss' | 'create-letter', reason? }
 *  - acknowledge   OPEN → ACKNOWLEDGED
 *  - resolve       → RESOLVED
 *  - dismiss       → DISMISSED (false positive)
 *  - create-letter creates a PENDING_CEO disciplinary letter of the recommended
 *    type for the employee and links it (status → LETTER_LINKED). Recommend-only:
 *    nothing is issued until HR explicitly calls this.
 *
 * Gated by hr.analytics.view.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext, logActivity } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';
import { createAlertLetter } from '@/lib/services/hr/create-alert-letter';

type RouteParams = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  action: z.enum(['acknowledge', 'resolve', 'dismiss', 'create-letter']),
  reason: z.string().max(500).optional(),
});

/** Human-readable subject/body for an auto-suggested disciplinary letter. */
function letterTemplate(windowType: string, thresholdDays: number, anpDays: number): { subject: string; content: string } {
  const windowLabel = windowType === 'CONSECUTIVE' ? 'consecutive' : 'intermittent (over the past 12 months)';
  return {
    subject: `Notice regarding unauthorized absence — ${thresholdDays} ${windowType === 'CONSECUTIVE' ? 'consecutive' : ''} days`.replace('  ', ' ').trim(),
    content:
      `This letter concerns your unauthorized absence from work. Our records show ${anpDays} ${windowLabel} ` +
      `day(s) of absence without permission, which has reached the ${thresholdDays}-day threshold under the company's ` +
      `absence policy and the Saudi Labor Law. You are required to provide a justification. Continued or repeated ` +
      `unauthorized absence may lead to further disciplinary action up to termination in accordance with the policy.`,
  };
}

export const POST = withApiContext(async (req: NextRequest, session, ctx: RouteParams) => {
  if (!(await checkPermission('hr.analytics.view'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body: unknown = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const { action, reason } = parsed.data;
  const userId = session!.userId;

  const alert = await prisma.employeeAbsenceAlert.findFirst({
    where: { id, deletedAt: null },
    include: { employee: { select: { id: true, fullNameEn: true } } },
  });
  if (!alert) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    if (action === 'create-letter') {
      if (!alert.recommendedLetterType) {
        return NextResponse.json({ error: 'This alert has no recommended letter (pre-threshold).' }, { status: 422 });
      }
      if (alert.linkedLetterId) {
        return NextResponse.json({ error: 'A letter is already linked to this alert.' }, { status: 409 });
      }

      const tpl = letterTemplate(alert.windowType, alert.thresholdDays, alert.anpDays);
      const letter = await createAlertLetter({
        employeeId: alert.employeeId,
        letterType: alert.recommendedLetterType,
        subject: tpl.subject,
        content: tpl.content,
        createdById: userId,
      });

      const updated = await prisma.employeeAbsenceAlert.update({
        where: { id },
        data: { linkedLetterId: letter.id, status: 'LETTER_LINKED' },
        include: { linkedLetter: { select: { id: true, letterNumber: true, letterType: true, status: true } } },
      });

      await logActivity({
        action: 'CREATE',
        entityType: 'EmployeeAbsenceAlert',
        entityId: id,
        entityName: `${alert.employee.fullNameEn} — ${alert.recommendedLetterType} (${letter.letterNumber})`,
        userId,
        reason: reason ?? `Letter ${letter.letterNumber} created from absence alert`,
      });

      return NextResponse.json(updated);
    }

    // Status-only transitions
    const data =
      action === 'acknowledge'
        ? { status: 'ACKNOWLEDGED' as const, acknowledgedById: userId, acknowledgedAt: new Date() }
        : action === 'resolve'
          ? { status: 'RESOLVED' as const, resolvedById: userId, resolvedAt: new Date() }
          : { status: 'DISMISSED' as const, resolvedById: userId, resolvedAt: new Date() };

    const updated = await prisma.employeeAbsenceAlert.update({ where: { id }, data });

    await logActivity({
      action: 'UPDATE',
      entityType: 'EmployeeAbsenceAlert',
      entityId: id,
      entityName: `${alert.employee.fullNameEn} — ${action}`,
      userId,
      reason,
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id, action }, '[Absence Alerts] Action failed');
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
});
