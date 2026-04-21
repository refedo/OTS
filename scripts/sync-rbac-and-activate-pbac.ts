/**
 * OTS 19.14.0 — RBAC Sync + PBAC Activation Script
 *
 * What this script does:
 *
 * PART 1 — RBAC Role Sync
 *   Compares every DB role against its definition in DEFAULT_ROLE_PERMISSIONS.
 *   Any permissions present in the code definition but missing from the DB role
 *   are merged in (additive only — existing permissions are never removed).
 *   Roles with no matching code definition are skipped but reported.
 *
 * PART 2 — PBAC Activation for Linked Employees
 *   For every User with a non-null `employeeId` (i.e., the account is linked to
 *   an employee record), the self-service permission set is merged into
 *   `customPermissions.grants`. This makes PBAC explicit and observable for
 *   every employee — they are no longer solely dependent on their role assignment
 *   to access their own HR data.
 *   - Existing grants are preserved; only missing ones are added.
 *   - If any of these permissions appear in the user's `revokes`, they are
 *     removed from revokes (a self-service permission should never be blocked
 *     for a linked employee).
 *   - isAdmin users are also updated so their PBAC layer is consistent with
 *     their employee status.
 *
 * PART 3 — Integrity Check
 *   Reports users whose role name is not in DEFAULT_ROLE_PERMISSIONS (unknown
 *   roles that may need manual review).
 *
 * Usage:
 *   npx tsx scripts/sync-rbac-and-activate-pbac.ts
 *
 * Safe to re-run — fully idempotent. Never removes permissions.
 */

import { PrismaClient } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/lib/permissions';

const prisma = new PrismaClient();

// The self-service permissions that every linked employee should have via PBAC
const EMPLOYEE_PBAC_GRANTS = [
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

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function parseCustomPermissions(raw: unknown): { grants: string[]; revokes: string[] } {
  if (!raw) return { grants: [], revokes: [] };
  if (Array.isArray(raw)) return { grants: raw.filter((x): x is string => typeof x === 'string'), revokes: [] };
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return {
      grants: Array.isArray(obj.grants) ? obj.grants.filter((x): x is string => typeof x === 'string') : [],
      revokes: Array.isArray(obj.revokes) ? obj.revokes.filter((x): x is string => typeof x === 'string') : [],
    };
  }
  return { grants: [], revokes: [] };
}

function mergeGrants(existing: string[], toAdd: string[]): string[] {
  return [...new Set([...existing, ...toAdd])];
}

function removeFromRevokes(revokes: string[], toRemove: string[]): string[] {
  const set = new Set(toRemove);
  return revokes.filter(r => !set.has(r));
}

// ─────────────────────────────────────────────
// Part 1 — RBAC Role Sync
// ─────────────────────────────────────────────

async function syncRbacRoles(): Promise<void> {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PART 1 — RBAC Role Sync (code definition → database)');
  console.log('══════════════════════════════════════════════════════\n');

  const allDbRoles = await prisma.role.findMany({
    select: { id: true, name: true, permissions: true },
  });

  const codeRoleNames = Object.keys(DEFAULT_ROLE_PERMISSIONS);
  let syncedCount = 0;
  let alreadyCurrentCount = 0;
  const unknownRoles: string[] = [];

  for (const dbRole of allDbRoles) {
    const codeDefinition = DEFAULT_ROLE_PERMISSIONS[dbRole.name];

    if (!codeDefinition) {
      unknownRoles.push(dbRole.name);
      continue;
    }

    const dbPerms = (dbRole.permissions as string[]) ?? [];
    const missing = codeDefinition.filter(p => !dbPerms.includes(p));

    if (missing.length === 0) {
      console.log(`  ✓ ${dbRole.name}: already up to date (${dbPerms.length} permissions)`);
      alreadyCurrentCount++;
      continue;
    }

    const merged = [...new Set([...dbPerms, ...codeDefinition])];
    await prisma.role.update({
      where: { id: dbRole.id },
      data: { permissions: merged },
    });

    console.log(`  ✅ ${dbRole.name}: synced — added ${missing.length} missing permission(s):`);
    for (const p of missing) {
      console.log(`       + ${p}`);
    }
    console.log(`     Total: ${dbPerms.length} → ${merged.length} permissions`);
    syncedCount++;
  }

  // Report DB roles without a code definition
  if (unknownRoles.length > 0) {
    console.log(`\n  ⚠  The following DB roles have no entry in DEFAULT_ROLE_PERMISSIONS:`);
    for (const name of unknownRoles) {
      console.log(`     - "${name}" (manual/custom role — not touched)`);
    }
  }

  // Report code roles with no matching DB role
  const dbRoleNames = new Set(allDbRoles.map(r => r.name));
  const missingInDb = codeRoleNames.filter(n => !dbRoleNames.has(n));
  if (missingInDb.length > 0) {
    console.log(`\n  ℹ  The following code-defined roles do not yet exist in the DB:`);
    for (const name of missingInDb) {
      console.log(`     - "${name}" — run grant-self-service-permissions.ts to create the Employee role`);
    }
  }

  console.log(`\n  Summary: ${syncedCount} role(s) updated, ${alreadyCurrentCount} already current, ${unknownRoles.length} unknown role(s) skipped`);
}

// ─────────────────────────────────────────────
// Part 2 — PBAC Activation for Linked Employees
// ─────────────────────────────────────────────

async function activatePbacForEmployees(): Promise<void> {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PART 2 — PBAC Activation (linked employee → grants)');
  console.log('══════════════════════════════════════════════════════\n');

  const linkedUsers = await prisma.user.findMany({
    where: { employeeId: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      employeeId: true,
      isAdmin: true,
      customPermissions: true,
      role: { select: { name: true } },
    },
  });

  if (linkedUsers.length === 0) {
    console.log('  ℹ  No users have a linked employee record. Nothing to activate.');
    console.log('     Run Identity Reconciliation (HR Setup → Identity Reconciliation) to link accounts.');
    return;
  }

  console.log(`  Found ${linkedUsers.length} user(s) with linked employee records.\n`);

  let activatedCount = 0;
  let alreadyActiveCount = 0;
  let revokeFixCount = 0;

  for (const user of linkedUsers) {
    const existing = parseCustomPermissions(user.customPermissions);

    // Determine which grants are missing
    const missingGrants = EMPLOYEE_PBAC_GRANTS.filter(p => !existing.grants.includes(p));

    // Determine which self-service permissions appear in revokes (should not be there)
    const wrongRevokes = existing.revokes.filter(r => EMPLOYEE_PBAC_GRANTS.includes(r));

    const needsUpdate = missingGrants.length > 0 || wrongRevokes.length > 0;

    if (!needsUpdate) {
      const grantCount = existing.grants.filter(g => EMPLOYEE_PBAC_GRANTS.includes(g)).length;
      console.log(`  ✓ ${user.name} (${user.email}): PBAC already active (${grantCount}/${EMPLOYEE_PBAC_GRANTS.length} self-service grants)`);
      alreadyActiveCount++;
      continue;
    }

    const newGrants = mergeGrants(existing.grants, EMPLOYEE_PBAC_GRANTS);
    const newRevokes = removeFromRevokes(existing.revokes, EMPLOYEE_PBAC_GRANTS);

    const newCustomPermissions = (newGrants.length > 0 || newRevokes.length > 0)
      ? { grants: newGrants, revokes: newRevokes }
      : null;

    await prisma.user.update({
      where: { id: user.id },
      data: { customPermissions: newCustomPermissions as object },
    });

    const roleName = user.role?.name ?? '(no role)';
    const adminTag = user.isAdmin ? ' [isAdmin]' : '';

    if (missingGrants.length > 0 && wrongRevokes.length > 0) {
      console.log(`  ✅ ${user.name} (${user.email}) [${roleName}${adminTag}]:`);
      console.log(`     + Added ${missingGrants.length} grant(s): ${missingGrants.join(', ')}`);
      console.log(`     - Removed ${wrongRevokes.length} incorrect revoke(s): ${wrongRevokes.join(', ')}`);
      revokeFixCount++;
    } else if (missingGrants.length > 0) {
      console.log(`  ✅ ${user.name} (${user.email}) [${roleName}${adminTag}]: activated PBAC — added ${missingGrants.length} grant(s)`);
      if (missingGrants.length <= 5) {
        console.log(`     + ${missingGrants.join(', ')}`);
      } else {
        console.log(`     + ${missingGrants.slice(0, 4).join(', ')} ... and ${missingGrants.length - 4} more`);
      }
    } else if (wrongRevokes.length > 0) {
      console.log(`  ✅ ${user.name} (${user.email}) [${roleName}${adminTag}]: removed ${wrongRevokes.length} blocking revoke(s): ${wrongRevokes.join(', ')}`);
      revokeFixCount++;
    }

    activatedCount++;
  }

  console.log(`\n  Summary: ${activatedCount} user(s) updated, ${alreadyActiveCount} already active, ${revokeFixCount} revoke conflict(s) fixed`);
}

// ─────────────────────────────────────────────
// Part 3 — Integrity Report
// ─────────────────────────────────────────────

async function integrityReport(): Promise<void> {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PART 3 — Integrity Report');
  console.log('══════════════════════════════════════════════════════\n');

  // Find users with employeeId but without hr.employee.viewOwn in their final PBAC state
  const linkedUsers = await prisma.user.findMany({
    where: { employeeId: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      employeeId: true,
      isAdmin: true,
      customPermissions: true,
      role: { select: { name: true, permissions: true } },
    },
  });

  const withoutSelfAccess: string[] = [];

  for (const user of linkedUsers) {
    if (user.isAdmin) continue; // admins always have all permissions
    const rolePerms = (user.role?.permissions as string[]) ?? [];
    const custom = parseCustomPermissions(user.customPermissions);
    const allGrants = new Set([...rolePerms, ...custom.grants]);
    if (!allGrants.has('hr.employee.viewOwn') || custom.revokes.includes('hr.employee.viewOwn')) {
      withoutSelfAccess.push(`${user.name} (${user.email}) [${user.role?.name ?? '(no role)'}]`);
    }
  }

  if (withoutSelfAccess.length === 0) {
    console.log('  ✓ All linked employees have effective access to hr.employee.viewOwn.\n');
  } else {
    console.log(`  ⚠  ${withoutSelfAccess.length} linked employee(s) still lack effective hr.employee.viewOwn:`);
    for (const entry of withoutSelfAccess) {
      console.log(`     - ${entry}`);
    }
    console.log('\n  → Their role may need to be updated, or run grant-self-service-permissions.ts first.\n');
  }

  // Summary of all users by role
  const allUsers = await prisma.user.findMany({
    select: { role: { select: { name: true } }, employeeId: true, isAdmin: true },
  });

  const roleMap: Record<string, { total: number; linked: number }> = {};
  for (const u of allUsers) {
    const rn = u.role?.name ?? '(no role)';
    if (!roleMap[rn]) roleMap[rn] = { total: 0, linked: 0 };
    roleMap[rn].total++;
    if (u.employeeId) roleMap[rn].linked++;
  }

  console.log('  User distribution by role:');
  for (const [roleName, counts] of Object.entries(roleMap).sort(([a], [b]) => a.localeCompare(b))) {
    const linkedNote = counts.linked > 0 ? ` (${counts.linked} linked to employee record)` : '';
    console.log(`     ${roleName.padEnd(25)} ${counts.total} user(s)${linkedNote}`);
  }
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  console.log('\n🔐 OTS 19.14.0 — RBAC Sync + PBAC Activation');
  console.log('─────────────────────────────────────────────\n');

  await syncRbacRoles();
  await activatePbacForEmployees();
  await integrityReport();

  console.log('\n✅ All done.\n');
  console.log('Post-run checklist:');
  console.log('  • Any users now showing in Part 3 warnings need their role reviewed in HR Setup');
  console.log('  • For users without a linked employee record, run Identity Reconciliation');
  console.log('    (HR Setup → Identity Reconciliation) then re-run this script');
  console.log('  • This script is safe to re-run at any time — it is fully idempotent');
  console.log('');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
