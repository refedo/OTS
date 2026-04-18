/**
 * Typed helpers for reading + writing SystemConfig rows that the HR / payroll
 * module cares about. Every setting has a default that applies if the row is
 * missing so the app never fails when a new key hasn't been seeded yet.
 */

import prisma from '@/lib/db';

export const SYSTEM_CONFIG_KEYS = {
  payrollDailyRateBasis: 'payroll.dailyRateBasis',
  payrollGosiEmployeeRate: 'payroll.gosiEmployeeRate',
  payrollGosiEmployerRate: 'payroll.gosiEmployerRate',
  payrollOvertimeMultiplier: 'payroll.overtimeMultiplier',
  payrollWpsBankCode: 'payroll.wpsBankCode',
  payrollAbsenceWithPermissionMultiplier: 'payroll.absenceWithPermissionMultiplier',
  payrollAbsenceWithoutPermissionMultiplier: 'payroll.absenceWithoutPermissionMultiplier',
  leavesApprovalChain: 'leaves.approvalChain',
  leavesAutoApproveUnderDays: 'leaves.autoApproveUnderDays',
} as const;

export type DailyRateBasis = 'THIRTY' | 'WORKING_DAYS_IN_MONTH' | 'WEEKLY_AVERAGE';
export type ApprovalChain = 'MANAGER_HR_CEO' | 'MANAGER_HR' | 'HR_ONLY';

export type PayrollSettings = {
  dailyRateBasis: DailyRateBasis;
  gosiEmployeeRate: number;
  gosiEmployerRate: number;
  overtimeMultiplier: number;
  wpsBankCode: string;
  absenceWithPermissionMultiplier: number;
  absenceWithoutPermissionMultiplier: number;
};

export type LeavesSettings = {
  approvalChain: ApprovalChain;
  autoApproveUnderDays: number;
};

const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  dailyRateBasis: 'THIRTY',
  gosiEmployeeRate: 0.10,
  gosiEmployerRate: 0.12,
  overtimeMultiplier: 1.5,
  wpsBankCode: 'ALINMA',
  absenceWithPermissionMultiplier: 1.0,
  absenceWithoutPermissionMultiplier: 2.0,
};

const DEFAULT_LEAVES_SETTINGS: LeavesSettings = {
  approvalChain: 'MANAGER_HR_CEO',
  autoApproveUnderDays: 0,
};

async function readRaw(key: string): Promise<string | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function writeRaw(key: string, value: string, userId: string | null): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value, updatedById: userId ?? undefined },
    create: { key, value, updatedById: userId ?? undefined },
  });
}

export async function getPayrollSettings(): Promise<PayrollSettings> {
  const [basis, gosiEmp, gosiEmpr, otMult, bank, absWithPerm, absWithoutPerm] = await Promise.all([
    readRaw(SYSTEM_CONFIG_KEYS.payrollDailyRateBasis),
    readRaw(SYSTEM_CONFIG_KEYS.payrollGosiEmployeeRate),
    readRaw(SYSTEM_CONFIG_KEYS.payrollGosiEmployerRate),
    readRaw(SYSTEM_CONFIG_KEYS.payrollOvertimeMultiplier),
    readRaw(SYSTEM_CONFIG_KEYS.payrollWpsBankCode),
    readRaw(SYSTEM_CONFIG_KEYS.payrollAbsenceWithPermissionMultiplier),
    readRaw(SYSTEM_CONFIG_KEYS.payrollAbsenceWithoutPermissionMultiplier),
  ]);
  return {
    dailyRateBasis: (basis as DailyRateBasis | null) ?? DEFAULT_PAYROLL_SETTINGS.dailyRateBasis,
    gosiEmployeeRate: gosiEmp ? parseFloat(gosiEmp) : DEFAULT_PAYROLL_SETTINGS.gosiEmployeeRate,
    gosiEmployerRate: gosiEmpr ? parseFloat(gosiEmpr) : DEFAULT_PAYROLL_SETTINGS.gosiEmployerRate,
    overtimeMultiplier: otMult ? parseFloat(otMult) : DEFAULT_PAYROLL_SETTINGS.overtimeMultiplier,
    wpsBankCode: bank ?? DEFAULT_PAYROLL_SETTINGS.wpsBankCode,
    absenceWithPermissionMultiplier: absWithPerm ? parseFloat(absWithPerm) : DEFAULT_PAYROLL_SETTINGS.absenceWithPermissionMultiplier,
    absenceWithoutPermissionMultiplier: absWithoutPerm ? parseFloat(absWithoutPerm) : DEFAULT_PAYROLL_SETTINGS.absenceWithoutPermissionMultiplier,
  };
}

export async function savePayrollSettings(patch: Partial<PayrollSettings>, userId: string | null): Promise<PayrollSettings> {
  if (patch.dailyRateBasis !== undefined) {
    await writeRaw(SYSTEM_CONFIG_KEYS.payrollDailyRateBasis, patch.dailyRateBasis, userId);
  }
  if (patch.gosiEmployeeRate !== undefined) {
    await writeRaw(SYSTEM_CONFIG_KEYS.payrollGosiEmployeeRate, String(patch.gosiEmployeeRate), userId);
  }
  if (patch.gosiEmployerRate !== undefined) {
    await writeRaw(SYSTEM_CONFIG_KEYS.payrollGosiEmployerRate, String(patch.gosiEmployerRate), userId);
  }
  if (patch.overtimeMultiplier !== undefined) {
    await writeRaw(SYSTEM_CONFIG_KEYS.payrollOvertimeMultiplier, String(patch.overtimeMultiplier), userId);
  }
  if (patch.wpsBankCode !== undefined) {
    await writeRaw(SYSTEM_CONFIG_KEYS.payrollWpsBankCode, patch.wpsBankCode, userId);
  }
  if (patch.absenceWithPermissionMultiplier !== undefined) {
    await writeRaw(SYSTEM_CONFIG_KEYS.payrollAbsenceWithPermissionMultiplier, String(patch.absenceWithPermissionMultiplier), userId);
  }
  if (patch.absenceWithoutPermissionMultiplier !== undefined) {
    await writeRaw(SYSTEM_CONFIG_KEYS.payrollAbsenceWithoutPermissionMultiplier, String(patch.absenceWithoutPermissionMultiplier), userId);
  }
  return getPayrollSettings();
}

export async function getLeavesSettings(): Promise<LeavesSettings> {
  const [chain, autoDays] = await Promise.all([
    readRaw(SYSTEM_CONFIG_KEYS.leavesApprovalChain),
    readRaw(SYSTEM_CONFIG_KEYS.leavesAutoApproveUnderDays),
  ]);
  return {
    approvalChain: (chain as ApprovalChain | null) ?? DEFAULT_LEAVES_SETTINGS.approvalChain,
    autoApproveUnderDays: autoDays ? parseFloat(autoDays) : DEFAULT_LEAVES_SETTINGS.autoApproveUnderDays,
  };
}

export async function saveLeavesSettings(patch: Partial<LeavesSettings>, userId: string | null): Promise<LeavesSettings> {
  if (patch.approvalChain !== undefined) {
    await writeRaw(SYSTEM_CONFIG_KEYS.leavesApprovalChain, patch.approvalChain, userId);
  }
  if (patch.autoApproveUnderDays !== undefined) {
    await writeRaw(SYSTEM_CONFIG_KEYS.leavesAutoApproveUnderDays, String(patch.autoApproveUnderDays), userId);
  }
  return getLeavesSettings();
}
