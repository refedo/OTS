/**
 * End-of-Service gratuity calculator (KSA Labour Law).
 *
 * Formula for an indefinite-term contract terminated by the employer:
 *   - 0.5 month of last wage × each of the first 5 years
 *   - 1 month of last wage × each year thereafter
 *   - Partial years are prorated
 *
 * The "last wage" for EOS purposes is basic + housing + permanent
 * allowances. For simplicity we use basic + housing here, which is the
 * KSA-standard baseline unless HR overrides via the `deductions` column
 * on the award row.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export type EosCalcInput = {
  employeeId: string;
  serviceEndDate: Date;
  calculatedById: string;
};

export type EosCalcResult = {
  awardId: string;
  serviceYears: number;
  lastMonthlyWage: number;
  firstTierMonths: number;
  secondTierMonths: number;
  grossAward: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function calculateEndOfService(input: EosCalcInput): Promise<EosCalcResult> {
  const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
  if (!employee) throw new Error('Employee not found');

  const start = employee.dateOfJoining;
  const end = input.serviceEndDate;
  if (end < start) throw new Error('End date must be after joining date');

  // Service years as a float with 3 decimals
  const diffMs = end.getTime() - start.getTime();
  const serviceYears = diffMs / (365.25 * 86400_000);
  const yearsFloor = Math.min(5, serviceYears);
  const remainingYears = Math.max(0, serviceYears - 5);

  const basic = Number(employee.basicSalary);
  const housing = Number(employee.housingAllowance);
  const lastMonthlyWage = basic + housing;

  // Tier 1: 0.5 month per year for first 5 years (prorated)
  const firstTierMonths = yearsFloor * 0.5;
  // Tier 2: 1 month per year beyond 5 years (prorated)
  const secondTierMonths = remainingYears;

  const grossAward = round2(lastMonthlyWage * (firstTierMonths + secondTierMonths));

  // Upsert (unique by employeeId)
  const award = await prisma.endOfServiceAward.upsert({
    where: { employeeId: input.employeeId },
    create: {
      employeeId: input.employeeId,
      serviceStartDate: start,
      serviceEndDate: end,
      serviceYears: serviceYears.toFixed(3),
      lastMonthlyWage: lastMonthlyWage.toString(),
      firstTierMonths: firstTierMonths.toFixed(3),
      secondTierMonths: secondTierMonths.toFixed(3),
      grossAward: grossAward.toString(),
      netAward: grossAward.toString(),
      calculatedById: input.calculatedById,
    },
    update: {
      serviceStartDate: start,
      serviceEndDate: end,
      serviceYears: serviceYears.toFixed(3),
      lastMonthlyWage: lastMonthlyWage.toString(),
      firstTierMonths: firstTierMonths.toFixed(3),
      secondTierMonths: secondTierMonths.toFixed(3),
      grossAward: grossAward.toString(),
      netAward: grossAward.toString(),
      calculatedById: input.calculatedById,
      calculatedAt: new Date(),
    },
  });

  logger.info({ employeeId: input.employeeId, serviceYears, grossAward }, '[EOS] Calculated');

  return {
    awardId: award.id,
    serviceYears: round2(serviceYears),
    lastMonthlyWage: round2(lastMonthlyWage),
    firstTierMonths: round2(firstTierMonths),
    secondTierMonths: round2(secondTierMonths),
    grossAward,
  };
}
