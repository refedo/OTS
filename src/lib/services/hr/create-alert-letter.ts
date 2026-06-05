/**
 * Create a disciplinary HrLetter from an absence alert (OTS-BL-080).
 *
 * Mirrors the official letter lifecycle used by POST /api/hr/letters: the letter
 * is created as PENDING_CEO with a per-type serial number and the CEO approvers
 * are notified. Nothing is issued without a human action — HR triggers this from
 * the alert's "Create letter" button (recommend-only escalation).
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

const log = logger.child({ module: 'AlertLetter' });

/** Resolve the next per-type serial number inside a transaction (config or INT-YY-NNNN fallback). */
async function resolveLetterNumberInTx(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  letterType: string,
): Promise<{ number: string; configId?: string; newSeq?: number; newYear?: number }> {
  let config = null;
  try {
    config = await tx.hrLetterSerialConfig.findUnique({ where: { letterType: letterType as never } });
  } catch {
    // serial-config table not present — fall through to fallback numbering
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

  // Fallback: INT-YY-NNNN (internal disciplinary letters)
  const year = new Date().getFullYear().toString().slice(-2);
  const pattern = `INT-${year}-%`;
  let maxSeq = 0;
  try {
    const rows = await tx.$queryRaw<{ maxNum: string | null }[]>`
      SELECT MAX(letterNumber) as maxNum FROM HrLetter WHERE letterNumber LIKE ${pattern}
    `;
    const maxNum = rows[0]?.maxNum;
    if (maxNum) maxSeq = parseInt(maxNum.split('-')[2] ?? '0', 10) || 0;
  } catch {
    // HrLetter table not ready — start from 0
  }
  return { number: `INT-${year}-${(maxSeq + 1).toString().padStart(4, '0')}` };
}

/** Active users who can approve CEO-level letters. */
async function findCeoApprovers(): Promise<{ id: string }[]> {
  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: { id: true, isAdmin: true, customPermissions: true, role: { select: { permissions: true } } },
  });
  const out: { id: string }[] = [];
  for (const u of users) {
    const rolePerms = (u.role?.permissions as string[]) || [];
    const custom = u.customPermissions as { grants?: string[]; revokes?: string[] } | null;
    const grants = Array.isArray(custom?.grants) ? custom!.grants! : [];
    const revoked = Array.isArray(custom?.revokes) ? custom!.revokes!.includes('hr.letters.approveCeo') : false;
    const has = rolePerms.includes('hr.letters.approveCeo') || rolePerms.includes('ALL') || grants.includes('hr.letters.approveCeo') || grants.includes('ALL');
    if ((u.isAdmin || has) && !revoked) out.push({ id: u.id });
  }
  return out;
}

export interface CreateAlertLetterParams {
  employeeId: string;
  letterType: string;
  subject: string;
  content: string;
  createdById: string;
}

/** Create a PENDING_CEO disciplinary letter and notify CEO approvers. Returns the new letter id + number. */
export async function createAlertLetter(
  params: CreateAlertLetterParams,
): Promise<{ id: string; letterNumber: string }> {
  const employee = await prisma.employee.findFirst({
    where: { id: params.employeeId, deletedAt: null },
    select: { id: true, fullNameEn: true },
  });
  if (!employee) throw new Error('Employee not found');

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const resolved = await resolveLetterNumberInTx(tx, params.letterType);
        if (resolved.configId && resolved.newSeq !== undefined && resolved.newYear !== undefined) {
          try {
            await tx.hrLetterSerialConfig.update({
              where: { id: resolved.configId },
              data: { currentSeq: resolved.newSeq, lastResetYear: resolved.newYear },
            });
          } catch {
            // serial-config update is best-effort
          }
        }
        const letter = await tx.hrLetter.create({
          data: {
            letterNumber: resolved.number,
            letterType: params.letterType as never,
            classification: 'INTERNAL',
            language: 'ARABIC',
            status: 'PENDING_CEO',
            employeeId: params.employeeId,
            subject: params.subject,
            content: params.content,
            issuedAt: new Date(),
            createdById: params.createdById,
          },
          select: { id: true, letterNumber: true },
        });
        return letter;
      });

      // Notify CEO approvers (fire-and-forget).
      findCeoApprovers()
        .then((ceos) => {
          ceos.forEach((ceo) => {
            NotificationService.createNotification({
              userId: ceo.id,
              type: 'APPROVAL_REQUIRED',
              title: 'Letter Approval Required',
              message: `Disciplinary letter ${result.letterNumber} for ${employee.fullNameEn} — awaiting your approval`,
              relatedEntityType: 'hr_letter',
              relatedEntityId: result.id,
            }).catch((err) => log.warn({ err, userId: ceo.id }, 'Failed to notify CEO about alert letter'));
          });
        })
        .catch((err) => log.warn({ err }, 'Failed to resolve CEO approvers'));

      log.info({ letterId: result.id, letterNumber: result.letterNumber, employeeId: params.employeeId }, 'Alert letter created');
      return result;
    } catch (error: unknown) {
      const isUnique = typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002';
      if (isUnique && attempt < 4) continue;
      throw error;
    }
  }
  throw new Error('Failed to generate a unique letter number');
}
