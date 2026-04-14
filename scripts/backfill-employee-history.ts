/**
 * 18.9.0 — Backfill the employment + salary history timeline for every
 * existing Employee row.
 *
 * For each non-deleted Employee that has no EmployeePositionHistory yet:
 *   - Insert ONE open position row (effectiveTo=null) dated from dateOfJoining,
 *     reason=HIRED, mirroring occupation / section / division / departmentId.
 *
 * For each non-deleted Employee that has no EmployeeSalaryHistory yet:
 *   - Insert ONE open salary row (effectiveTo=null, status=APPROVED) dated
 *     from dateOfJoining, reason=HIRED, mirroring basicSalary + all
 *     allowances as they stand on Employee today.
 *
 * Idempotent — safe to re-run. Skips any employee that already has at least
 * one row in the target table. This is the "anchor" for every future raise
 * and promotion cycle, so the payroll calculator can always resolve the
 * effective compensation on any given date.
 *
 * Needs a User ID to stamp as createdById. Uses the first CEO user found; if
 * none exists, falls back to the first admin-ish user.
 *
 * Usage:
 *   npx tsx scripts/backfill-employee-history.ts
 */

import { PrismaClient, EmployeePositionChangeReason, EmployeeSalaryChangeReason, EmployeeSalaryApprovalStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function findSystemUserId(): Promise<string> {
  const ceo = await prisma.user.findFirst({
    where: { role: { name: 'CEO' } },
    select: { id: true },
  });
  if (ceo) return ceo.id;
  const admin = await prisma.user.findFirst({
    where: { role: { name: { in: ['Admin', 'HR'] } } },
    select: { id: true },
  });
  if (admin) return admin.id;
  const any = await prisma.user.findFirst({ select: { id: true } });
  if (!any) throw new Error('No users exist — cannot stamp createdById on backfill rows');
  return any.id;
}

async function main() {
  const systemUserId = await findSystemUserId();
  console.log(`[backfill] Using systemUserId=${systemUserId}`);

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      employmentId: true,
      fullNameEn: true,
      dateOfJoining: true,
      occupation: true,
      section: true,
      division: true,
      departmentId: true,
      basicSalary: true,
      housingAllowance: true,
      transportAllowance: true,
      mobileAllowance: true,
      foodAllowance: true,
      otherAllowances: true,
    },
  });

  let positionInserted = 0;
  let positionSkipped = 0;
  let salaryInserted = 0;
  let salarySkipped = 0;

  for (const emp of employees) {
    // Position history anchor
    const existingPos = await prisma.employeePositionHistory.count({
      where: { employeeId: emp.id },
    });
    if (existingPos > 0) {
      positionSkipped++;
    } else {
      await prisma.employeePositionHistory.create({
        data: {
          employeeId: emp.id,
          effectiveFrom: emp.dateOfJoining,
          effectiveTo: null,
          positionTitle: emp.occupation ?? 'Unassigned',
          section: emp.section,
          division: emp.division,
          departmentId: emp.departmentId,
          reason: EmployeePositionChangeReason.HIRED,
          notes: 'Backfilled by scripts/backfill-employee-history.ts (18.9.0)',
          createdById: systemUserId,
        },
      });
      positionInserted++;
    }

    // Salary history anchor
    const existingSal = await prisma.employeeSalaryHistory.count({
      where: { employeeId: emp.id },
    });
    if (existingSal > 0) {
      salarySkipped++;
    } else {
      await prisma.employeeSalaryHistory.create({
        data: {
          employeeId: emp.id,
          effectiveFrom: emp.dateOfJoining,
          effectiveTo: null,
          basicSalary: emp.basicSalary,
          housingAllowance: emp.housingAllowance,
          transportAllowance: emp.transportAllowance,
          mobileAllowance: emp.mobileAllowance,
          foodAllowance: emp.foodAllowance,
          otherAllowances: emp.otherAllowances,
          reason: EmployeeSalaryChangeReason.HIRED,
          notes: 'Backfilled by scripts/backfill-employee-history.ts (18.9.0)',
          status: EmployeeSalaryApprovalStatus.APPROVED,
          submittedAt: new Date(),
          submittedById: systemUserId,
          hrApprovedAt: new Date(),
          hrApprovedById: systemUserId,
          ceoApprovedAt: new Date(),
          ceoApprovedById: systemUserId,
          createdById: systemUserId,
        },
      });
      salaryInserted++;
    }
  }

  console.log(`[backfill] Employees scanned: ${employees.length}`);
  console.log(`[backfill] Position rows inserted: ${positionInserted}, skipped: ${positionSkipped}`);
  console.log(`[backfill] Salary rows inserted: ${salaryInserted}, skipped: ${salarySkipped}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
