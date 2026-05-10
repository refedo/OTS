import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

interface AuditRow {
  id: string;
  scope: string;
  status: string;
}

interface FindingRow {
  auditId: string;
  type: string;
  clause: string;
}

interface OfiRow {
  status: string;
}

interface CarRow {
  status: string;
  targetDate: Date | null;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const targetYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    // Fetch all audit plans for the year
    const auditPlans = await prisma.imsAuditPlan.findMany({
      where: { year: targetYear },
      select: { id: true },
    });
    const planIds = auditPlans.map((p: { id: string }) => p.id);

    // Fetch all audits for those plans
    const audits: AuditRow[] = await prisma.imsAudit.findMany({
      where: { planId: { in: planIds } },
      select: {
        id: true,
        scope: true,
        status: true,
      },
    });
    const auditIds = audits.map((a: AuditRow) => a.id);

    // Fetch all findings for those audits
    const findings: FindingRow[] = await prisma.imsAuditFinding.findMany({
      where: { auditId: { in: auditIds } },
      select: { auditId: true, type: true, clause: true },
    });

    // Fetch all OFI entries
    const ofiEntries: OfiRow[] = await prisma.imsOfiEntry.findMany({
      select: { status: true },
    });

    // Fetch all CAR records
    const carRecords: CarRow[] = await prisma.imsCarRecord.findMany({
      select: { status: true, targetDate: true },
    });

    // Compute programme completion rate
    const totalAudits = audits.length;
    const completedAudits = audits.filter((a: AuditRow) => a.status === 'COMPLETED').length;
    const programmeCompletionRate = totalAudits > 0 ? (completedAudits / totalAudits) * 100 : 0;

    // Compute auditsByDepartment
    const departmentMap = new Map<string, { total: number; completed: number; ncCount: number; ofiCount: number }>();
    for (const audit of audits) {
      const scope = audit.scope;
      if (!departmentMap.has(scope)) {
        departmentMap.set(scope, { total: 0, completed: 0, ncCount: 0, ofiCount: 0 });
      }
      const entry = departmentMap.get(scope)!;
      entry.total += 1;
      if (audit.status === 'COMPLETED') entry.completed += 1;
    }

    // Count NCs and OFIs per department via findings
    for (const finding of findings) {
      const audit = audits.find((a: AuditRow) => a.id === finding.auditId);
      if (!audit) continue;
      const scope = audit.scope;
      const entry = departmentMap.get(scope);
      if (!entry) continue;
      if (finding.type === 'NC') entry.ncCount += 1;
      if (finding.type === 'OFI' || finding.type === 'Observation') entry.ofiCount += 1;
    }

    const auditsByDepartment = Array.from(departmentMap.entries()).map(([scope, stats]) => ({
      scope,
      ...stats,
    }));

    // Compute ncByClause
    const clauseCountMap = new Map<string, number>();
    for (const finding of findings) {
      if (finding.type === 'NC') {
        clauseCountMap.set(finding.clause, (clauseCountMap.get(finding.clause) ?? 0) + 1);
      }
    }
    const ncByClause = Array.from(clauseCountMap.entries())
      .map(([clause, count]) => ({ clause, count }))
      .sort((a, b) => b.count - a.count);

    // Compute ncByDepartment
    const ncDeptMap = new Map<string, number>();
    for (const finding of findings) {
      if (finding.type === 'NC') {
        const audit = audits.find((a: AuditRow) => a.id === finding.auditId);
        if (!audit) continue;
        const scope = audit.scope;
        ncDeptMap.set(scope, (ncDeptMap.get(scope) ?? 0) + 1);
      }
    }
    const ncByDepartment = Array.from(ncDeptMap.entries()).map(([scope, count]) => ({ scope, count }));

    // Compute open CAR aging
    const now = new Date();
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const closedStatuses = ['Verified Effective', 'Closed'];
    const openCars = carRecords.filter((c: CarRow) => !closedStatuses.includes(c.status));

    let overdue = 0;
    let dueSoon = 0;
    let onTrack = 0;

    for (const car of openCars) {
      if (!car.targetDate) {
        onTrack += 1;
        continue;
      }
      if (car.targetDate < now) {
        overdue += 1;
      } else if (car.targetDate <= fourteenDaysFromNow) {
        dueSoon += 1;
      } else {
        onTrack += 1;
      }
    }

    // Compute OFI adoption rate
    const totalOfis = ofiEntries.length;
    const adoptedOfis = ofiEntries.filter((o: OfiRow) => o.status === 'Adopted').length;
    const ofiAdoptionRate = totalOfis > 0 ? (adoptedOfis / totalOfis) * 100 : 0;

    // Total NCs and OFIs from findings
    const totalNcs = findings.filter((f: FindingRow) => f.type === 'NC').length;
    const totalOfiFindings = findings.filter((f: FindingRow) => f.type === 'OFI' || f.type === 'Observation').length;
    const openCarCount = openCars.length;

    return NextResponse.json({
      year: targetYear,
      programmeCompletionRate,
      auditsByDepartment,
      ncByClause,
      ncByDepartment,
      openCarAging: { overdue, dueSoon, onTrack },
      ofiAdoptionRate,
      totalAudits,
      completedAudits,
      totalNcs,
      totalOfis: totalOfiFindings,
      openCars: openCarCount,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to compute IMS programme dashboard');
    return NextResponse.json({ error: 'Failed to compute programme dashboard' }, { status: 500 });
  }
}
