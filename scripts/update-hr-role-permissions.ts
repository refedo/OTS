/**
 * Update HR & CEO role permissions for the HR Foundation module (Phase 1
 * of OTS-MSS-HR-PAYROLL-v1). Idempotent — safe to re-run any number of
 * times. Follows the same pattern as `update-document-controller-permissions.ts`.
 *
 * What it does:
 *   1. Finds the existing HR role (which was created at runtime in OTS via
 *      the role-management UI) and merges the new `hr.*` permission IDs into
 *      its existing permissions JSON array, preserving anything HR already had.
 *   2. Adds `admin.identity.reconcile` and `hr.employee.resetToDolibarr` to
 *      the CEO role (super-admin escape hatches, not granted to HR).
 *   3. If the HR role does NOT exist yet, creates it with the default HR
 *      permission set from `DEFAULT_ROLE_PERMISSIONS.HR`.
 *
 * Usage:
 *   npx tsx scripts/update-hr-role-permissions.ts
 */

import { PrismaClient } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/lib/permissions';

const prisma = new PrismaClient();

const HR_CEO_ONLY_PERMISSIONS = [
  'admin.identity.reconcile',
  'hr.employee.resetToDolibarr',
  // 18.9.0 — final sign-off on raises belongs only to CEO.
  'hr.employee.salaryHistory.approveCeo',
];

// Regular HR permissions (non-escape-hatch). CEO gets these too so the
// HR section is visible in the sidebar (sidebar visibility uses the role's
// navPermissions JSON directly, not the isAdmin-expanded permission set).
const HR_BASE_PERMISSIONS = [
  // Phase 1 — Master data
  'hr.employee.view',
  'hr.employee.create',
  'hr.employee.edit',
  'hr.employee.delete',
  'hr.employee.viewCompensation',
  'hr.employee.sync',
  // 18.9.0 — Employment & salary history
  'hr.employee.positionHistory.view',
  'hr.employee.positionHistory.manage',
  'hr.employee.salaryHistory.view',
  'hr.employee.salaryHistory.manage',
  'hr.employee.salaryHistory.approveHr',
  'hr.agency.view',
  'hr.agency.manage',
  'hr.manpowerSlot.view',
  'hr.manpowerSlot.manage',
  // Phase 2 — Attendance / Leaves / Overtime
  'hr.attendance.view',
  'hr.attendance.sync',
  'hr.attendance.probe',
  'hr.holiday.view',
  'hr.holiday.manage',
  'hr.section.manage',
  'hr.leaves.sync',
  // Phase 3 — Payroll
  'hr.payroll.view',
  'hr.payroll.calculate',
  'hr.payroll.approve',
  'hr.payroll.lock',
  'hr.payroll.adjust',
  'hr.payroll.export',
  'hr.payroll.settings',
  // 18.10.0 — Loans & Custodies
  'hr.loans.view',
  'hr.loans.manage',
  'hr.custodies.view',
  'hr.custodies.manage',
  // 18.13.0 — Manpower Billing
  'hr.billing.view',
  'hr.billing.manage',
  'hr.billing.push',
  // 18.14.0 — Contracts & Documents
  'hr.contracts.view',
  'hr.contracts.manage',
];

function mergePermissions(existing: unknown, additions: string[]): string[] {
  const current = Array.isArray(existing) ? (existing as string[]) : [];
  const merged = new Set<string>(current);
  for (const perm of additions) merged.add(perm);
  return Array.from(merged);
}

async function main() {
  const hrDefaults = DEFAULT_ROLE_PERMISSIONS.HR;
  if (!hrDefaults) {
    console.error('HR permissions missing from DEFAULT_ROLE_PERMISSIONS');
    process.exit(1);
  }

  // ---- HR role ----
  const existingHr = await prisma.role.findUnique({ where: { name: 'HR' } });
  if (existingHr) {
    const merged = mergePermissions(existingHr.permissions, hrDefaults);
    await prisma.role.update({
      where: { id: existingHr.id },
      data: { permissions: merged },
    });
    console.log(`[HR] Updated existing HR role (${existingHr.id}): ${merged.length} permissions total`);
  } else {
    const created = await prisma.role.create({
      data: {
        name: 'HR',
        description: 'Human Resources — manages employee master, agencies, and manpower slots',
        permissions: hrDefaults,
      },
    });
    console.log(`[HR] Created new HR role (${created.id}): ${hrDefaults.length} permissions`);
  }

  // ---- CEO role: add the super-admin HR escape hatches ----
  const existingCeo = await prisma.role.findUnique({ where: { name: 'CEO' } });
  if (existingCeo) {
    const merged = mergePermissions(existingCeo.permissions, [
      ...HR_BASE_PERMISSIONS,
      ...HR_CEO_ONLY_PERMISSIONS,
    ]);
    await prisma.role.update({
      where: { id: existingCeo.id },
      data: { permissions: merged },
    });
    console.log(`[CEO] Added HR super-admin permissions to CEO role (${existingCeo.id}): ${merged.length} permissions total`);
  } else {
    console.warn('[CEO] CEO role not found — skipping. Create the CEO role first via the role-management UI, then re-run.');
  }

  console.log('Done.');
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
