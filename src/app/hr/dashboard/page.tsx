import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { getHrDashboardStats } from '@/lib/services/hr/hr-dashboard-stats';
import { HrDashboardClient } from '@/components/hr/hr-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function HrDashboardPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('hr.employee.view');
  if (!canView) redirect('/unauthorized?from=/hr/dashboard');

  // Default window: current calendar month.
  const now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today.getTime() + 7 * 86400000);
  const in30Days = new Date(today.getTime() + 30 * 86400000);

  const [
    initialStats,
    departments,
    occupationRows,
    sectionRows,
    contractCounts,
    assetCounts,
    loanStats,
    custodyStats,
    violationStats,
    maintenanceAlerts,
    employeeCounts,
  ] = await Promise.all([
    getHrDashboardStats({ startDate, endDate, groupBy: 'occupation' }),
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.employee.findMany({
      where: { deletedAt: null, occupation: { not: null } },
      select: { occupation: true },
      distinct: ['occupation'],
    }),
    prisma.employee.findMany({
      where: { deletedAt: null, section: { not: null } },
      select: { section: true },
      distinct: ['section'],
    }),
    Promise.all([
      prisma.contract.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      prisma.contract.count({ where: { deletedAt: null, status: 'ACTIVE', expiryDate: { gte: today, lte: in7Days } } }),
      prisma.contract.count({ where: { deletedAt: null, status: 'ACTIVE', expiryDate: { gte: today, lte: in30Days } } }),
      prisma.contract.count({ where: { deletedAt: null, status: 'EXPIRED' } }),
    ]).catch(() => null),

    // Asset stats
    Promise.all([
      prisma.asset.count({ where: { deletedAt: null } }),
      prisma.asset.count({ where: { deletedAt: null, status: 'AVAILABLE' } }),
      prisma.asset.count({ where: { deletedAt: null, status: 'ASSIGNED' } }),
      prisma.asset.count({ where: { deletedAt: null, status: 'UNDER_MAINTENANCE' } }),
      prisma.asset.count({ where: { deletedAt: null, category: 'CAR' } }),
      prisma.asset.count({ where: { deletedAt: null, category: 'LAPTOP' } }),
      prisma.asset.count({ where: { deletedAt: null, category: 'SIM_CARD' } }),
      // Cars with license expiring in 30 days
      prisma.asset.count({
        where: {
          deletedAt: null,
          category: 'CAR',
          licenseExpiryDate: { not: null, lte: in30Days },
        },
      }),
    ]).catch(() => null),

    // Loan stats
    Promise.all([
      prisma.loan.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      prisma.loan.aggregate({
        where: { deletedAt: null, status: 'ACTIVE' },
        _sum: { principal: true },
      }),
      prisma.loan.aggregate({
        where: { deletedAt: null, status: 'ACTIVE' },
        _sum: { installmentAmount: true },
      }),
    ]).catch(() => null),

    // Custody stats
    Promise.all([
      prisma.custody.count({ where: { deletedAt: null, status: 'OPEN' } }),
      prisma.custody.aggregate({
        where: { deletedAt: null, status: { in: ['OPEN', 'PARTIALLY_SETTLED'] } },
        _sum: { amount: true, settledAmount: true },
      }),
    ]).catch(() => null),

    // Violation stats
    Promise.all([
      prisma.trafficViolation.count({ where: { deletedAt: null } }),
      prisma.trafficViolation.count({ where: { deletedAt: null, status: 'PENDING' } }),
      prisma.trafficViolation.count({ where: { deletedAt: null, deductFromPayroll: true, status: 'PENDING' } }),
      prisma.trafficViolation.aggregate({
        where: { deletedAt: null, status: 'PENDING' },
        _sum: { violationAmount: true },
      }),
    ]).catch(() => null),

    // Maintenance alerts: cars due for service (nextServiceDate within 14 days or overdue)
    Promise.all([
      prisma.carMaintenanceRecord.count({
        where: {
          deletedAt: null,
          nextServiceDate: { not: null, lte: in14Days(today) },
        },
      }),
      prisma.carMaintenanceRecord.count({
        where: {
          deletedAt: null,
          nextServiceDate: { not: null, lt: today },
        },
      }),
    ]).catch(() => null),

    // Total employee counts
    Promise.all([
      prisma.employee.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      prisma.employee.count({ where: { deletedAt: null } }),
    ]).catch(() => null),
  ]);

  const occupations = occupationRows
    .map((r) => r.occupation)
    .filter((v): v is string => !!v)
    .sort((a, b) => a.localeCompare(b));
  const sections = sectionRows
    .map((r) => r.section)
    .filter((v): v is string => !!v)
    .sort((a, b) => a.localeCompare(b));

  const contractStats = contractCounts
    ? { totalActive: contractCounts[0], expiringIn7: contractCounts[1], expiringIn30: contractCounts[2], expired: contractCounts[3] }
    : undefined;

  const assetStats = assetCounts
    ? {
        total: assetCounts[0],
        available: assetCounts[1],
        assigned: assetCounts[2],
        maintenance: assetCounts[3],
        cars: assetCounts[4],
        laptops: assetCounts[5],
        simCards: assetCounts[6],
        licensesExpiringSoon: assetCounts[7],
      }
    : undefined;

  const loanSummary = loanStats
    ? {
        activeCount: loanStats[0],
        totalPrincipal: Number(loanStats[1]._sum.principal ?? 0),
        monthlyRepayment: Number(loanStats[2]._sum.installmentAmount ?? 0),
      }
    : undefined;

  const custodySummary = custodyStats
    ? {
        openCount: custodyStats[0],
        totalOutstanding: Math.max(
          0,
          Number(custodyStats[1]._sum.amount ?? 0) - Number(custodyStats[1]._sum.settledAmount ?? 0),
        ),
      }
    : undefined;

  const violationSummary = violationStats
    ? {
        total: violationStats[0],
        open: violationStats[1],
        pendingDeduction: violationStats[2],
        openAmount: Number(violationStats[3]._sum.violationAmount ?? 0),
      }
    : undefined;

  const maintenanceSummary = maintenanceAlerts
    ? {
        dueSoon: maintenanceAlerts[0],
        overdue: maintenanceAlerts[1],
      }
    : undefined;

  const employeeSummary = employeeCounts
    ? { active: employeeCounts[0], total: employeeCounts[1] }
    : undefined;

  return (
    <HrDashboardClient
      initialStats={initialStats}
      departments={departments}
      occupations={occupations}
      sections={sections}
      contractStats={contractStats}
      assetStats={assetStats}
      loanSummary={loanSummary}
      custodySummary={custodySummary}
      violationSummary={violationSummary}
      maintenanceSummary={maintenanceSummary}
      employeeSummary={employeeSummary}
    />
  );
}

function in14Days(today: Date): Date {
  return new Date(today.getTime() + 14 * 86400000);
}
