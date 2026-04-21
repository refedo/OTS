/**
 * Grant HR self-service (viewOwn) permissions to existing roles in the live DB.
 * Safe to re-run — idempotent merge, never removes existing permissions.
 *
 * What it does:
 *   1. Adds the 9 self-service permissions to Engineer, Operator, Manager,
 *      Document Controller, and HR roles (so HR can test as an employee).
 *   2. Creates an "Employee" role if it doesn't already exist, seeded with
 *      the Employee bundle from DEFAULT_ROLE_PERMISSIONS.
 *
 * Usage:
 *   npx tsx scripts/grant-self-service-permissions.ts
 */

import { PrismaClient } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/lib/permissions';

const prisma = new PrismaClient();

const SELF_SERVICE_PERMISSIONS = [
  'notifications.view',
  'announcements.view',
  'hr.employee.viewOwn',
  'hr.leaves.view',
  'hr.leaves.request',
  'hr.payroll.viewOwn',
  'hr.loans.viewOwn',
  'hr.custodies.viewOwn',
  'hr.assets.viewOwn',
  'hr.violations.viewOwn',
  'hr.letters.viewOwn',
];

const ROLES_TO_PATCH = ['Engineer', 'Operator', 'Manager', 'Document Controller', 'HR'];

async function mergePermissions(roleId: string, roleName: string, existing: string[], toAdd: string[]) {
  const before = existing.length;
  const merged = [...new Set([...existing, ...toAdd])];
  if (merged.length === before) {
    console.log(`  ✓ ${roleName}: already has all self-service permissions (no change)`);
    return;
  }
  await prisma.role.update({ where: { id: roleId }, data: { permissions: merged } });
  const added = merged.filter(p => !existing.includes(p));
  console.log(`  ✓ ${roleName}: added ${added.length} permission(s): ${added.join(', ')}`);
}

async function main() {
  console.log('\n🔑 OTS 19.14.0 — Employee Self-Service Permission Grant\n');

  // 1. Patch existing roles
  for (const roleName of ROLES_TO_PATCH) {
    const role = await prisma.role.findFirst({ where: { name: roleName } });
    if (!role) {
      console.log(`  ⚠  ${roleName}: role not found in DB — skipping`);
      continue;
    }
    const existing = (role.permissions as string[]) ?? [];
    await mergePermissions(role.id, roleName, existing, SELF_SERVICE_PERMISSIONS);
  }

  // 2. Create or update the Employee role
  const employeeBundle = DEFAULT_ROLE_PERMISSIONS['Employee'] ?? SELF_SERVICE_PERMISSIONS;
  const existingEmployee = await prisma.role.findFirst({ where: { name: 'Employee' } });

  if (existingEmployee) {
    const existing = (existingEmployee.permissions as string[]) ?? [];
    await mergePermissions(existingEmployee.id, 'Employee', existing, employeeBundle);
  } else {
    await prisma.role.create({
      data: {
        name: 'Employee',
        description: 'Base self-service role for any OTS-linked employee. Read-only access to own HR data only.',
        permissions: [...new Set(employeeBundle)],
      },
    });
    console.log(`  ✓ Employee: created new role with ${employeeBundle.length} permissions`);
  }

  console.log('\n✅ Done.\n');
  console.log('Next steps:');
  console.log('  • Assign the "Employee" role to users who only need self-service access');
  console.log('  • Users with Engineer/Operator/Manager/Document Controller roles now');
  console.log('    automatically have self-service access via their existing role');
  console.log('  • Link user accounts to employee records via HR Setup → Identity Reconciliation');
  console.log('');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
