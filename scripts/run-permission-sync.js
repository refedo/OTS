#!/usr/bin/env node
/**
 * OTS 19.14.0 — Standalone RBAC Sync + PBAC Activation
 * Self-contained: no TypeScript imports, run with:  node scripts/run-permission-sync.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Self-service permissions every linked employee gets via PBAC ──
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

// ── Code-defined role bundles (mirrors DEFAULT_ROLE_PERMISSIONS) ──
const ROLE_BUNDLES = {
  HR: [
    'users.view','departments.view','notifications.view','events.view','ai.use',
    'hr.employee.view','hr.employee.create','hr.employee.edit','hr.employee.delete',
    'hr.employee.viewCompensation','hr.employee.sync',
    'hr.employee.positionHistory.view','hr.employee.positionHistory.manage',
    'hr.employee.salaryHistory.view','hr.employee.salaryHistory.manage','hr.employee.salaryHistory.approveHr',
    'hr.loans.view','hr.loans.manage','hr.custodies.view','hr.custodies.manage',
    'hr.agency.view','hr.agency.manage','hr.manpowerSlot.view','hr.manpowerSlot.manage',
    'hr.attendance.view','hr.attendance.sync','hr.attendance.probe',
    'hr.holiday.view','hr.holiday.manage','hr.section.manage','hr.leaves.sync',
    'hr.payroll.view','hr.payroll.calculate','hr.payroll.approve','hr.payroll.lock',
    'hr.payroll.adjust','hr.payroll.export','hr.payroll.settings',
    'hr.billing.view','hr.billing.manage','hr.billing.push',
    'hr.contracts.view','hr.contracts.manage',
    'hr.letters.view','hr.letters.manage',
    'hr.analytics.view',
    // 19.14.0 self-service
    'hr.employee.viewOwn','hr.loans.viewOwn','hr.custodies.viewOwn',
    'hr.assets.viewOwn','hr.violations.viewOwn','hr.letters.viewOwn',
    'hr.leaves.view','hr.leaves.request','hr.payroll.viewOwn','announcements.view',
  ],
  Employee: [
    'notifications.view','announcements.view',
    'hr.employee.viewOwn','hr.leaves.view','hr.leaves.request','hr.payroll.viewOwn',
    'hr.loans.viewOwn','hr.custodies.viewOwn','hr.assets.viewOwn',
    'hr.violations.viewOwn','hr.letters.viewOwn',
  ],
  Manager: [
    'users.view','users.create','users.edit','departments.view','departments.edit',
    'projects.view','projects.view_all','projects.create','projects.edit','projects.assign',
    'buildings.view','buildings.create','buildings.edit',
    'tasks.view','tasks.view_all','tasks.view_others','tasks.create','tasks.edit',
    'tasks.edit_all','tasks.delete','tasks.delete_all','tasks.assign','tasks.manage',
    'production.view_dashboard','production.view_status','production.view_parts',
    'production.create_parts','production.edit_parts','production.view_logs',
    'production.create_logs','production.edit_logs','production.view_reports','production.export_reports',
    'quality.view_itp','quality.create_itp','quality.edit_itp','quality.approve_itp',
    'quality.view_wps','quality.create_wps','quality.edit_wps','quality.approve_wps',
    'planning.view','planning.create','planning.edit','planning.delete',
    'documents.view','documents.upload','documents.edit','documents.approve','documents.manage_categories',
    'reports.view','reports.export',
    'risk.view_dashboard','risk.view_alerts','risk.manage',
    'operations.view_dashboard','operations.view_intelligence','operations.view_work_units',
    'operations.manage_work_units','operations.view_dependencies','operations.manage_dependencies',
    'operations.view_capacity','operations.ai_digest',
    'business.view_dashboard','business.view_foundation','business.view_swot',
    'business.view_objectives','business.manage_objectives','business.view_kpis','business.manage_kpis',
    'business.view_initiatives','business.manage_initiatives','business.view_dept_plans',
    'business.manage_dept_plans','business.view_issues','business.manage_issues',
    'knowledge.view','knowledge.create','knowledge.edit','knowledge.validate',
    'backlog.view','backlog.create','backlog.edit','backlog.prioritize',
    'notifications.view','notifications.view_all','events.view','governance.view',
    'ai.use','ai.view_history',
    'timeline.view','timeline.edit','timeline.operations','timeline.engineering','timeline.events',
    'financial.view','financial.manage','financial.sync','financial.export',
    'dolibarr.view','dolibarr.sync',
    'supply_chain.view','supply_chain.sync','supply_chain.alias',
    'project_tracker.view','project_tracker.export',
    'executive.view',
    // 19.14.0 self-service
    'hr.employee.viewOwn','hr.leaves.view','hr.leaves.request','hr.payroll.viewOwn',
    'hr.loans.viewOwn','hr.custodies.viewOwn','hr.assets.viewOwn','hr.violations.viewOwn','hr.letters.viewOwn',
  ],
  Engineer: [
    'users.view','departments.view',
    'projects.view','buildings.view',
    'tasks.view','tasks.edit','tasks.delete',
    'production.view_dashboard','production.view_status','production.view_parts',
    'production.create_parts','production.view_logs','production.create_logs','production.view_reports',
    'quality.view_itp','quality.create_itp','quality.edit_itp',
    'quality.view_wps','quality.create_wps','quality.edit_wps',
    'planning.view','documents.view','documents.upload','reports.view',
    'risk.view_dashboard','risk.view_alerts',
    'operations.view_dashboard','operations.view_intelligence','operations.view_work_units',
    'operations.view_dependencies','operations.view_capacity',
    'business.view_dashboard','business.view_foundation','business.view_swot',
    'business.view_objectives','business.view_kpis','business.view_initiatives',
    'knowledge.view','knowledge.create','knowledge.edit',
    'backlog.view','backlog.create','backlog.edit',
    'notifications.view','events.view','ai.use','ai.view_history',
    'timeline.view','timeline.operations','timeline.engineering',
    'project_tracker.view',
    // 19.14.0 self-service
    'hr.employee.viewOwn','hr.leaves.view','hr.leaves.request','hr.payroll.viewOwn',
    'hr.loans.viewOwn','hr.custodies.viewOwn','hr.assets.viewOwn','hr.violations.viewOwn','hr.letters.viewOwn',
  ],
  Operator: [
    'projects.view','buildings.view',
    'tasks.view','tasks.edit','tasks.delete',
    'production.view_dashboard','production.view_status','production.view_parts',
    'production.view_logs','production.create_logs','production.view_reports',
    'quality.view_itp','quality.view_wps',
    'documents.view',
    'risk.view_dashboard','risk.view_alerts',
    'operations.view_dashboard','operations.view_work_units',
    'knowledge.view','notifications.view','ai.use',
    'timeline.view','timeline.operations',
    // 19.14.0 self-service
    'hr.employee.viewOwn','hr.leaves.view','hr.leaves.request','hr.payroll.viewOwn',
    'hr.loans.viewOwn','hr.custodies.viewOwn','hr.assets.viewOwn','hr.violations.viewOwn','hr.letters.viewOwn',
  ],
  'Document Controller': [
    'users.view','departments.view',
    'projects.view','projects.view_all','buildings.view',
    'tasks.view','tasks.view_all','tasks.view_others','tasks.create','tasks.edit',
    'tasks.edit_all','tasks.delete','tasks.delete_all','tasks.assign',
    'documents.view','documents.upload','documents.edit','documents.approve','documents.manage_categories',
    'quality.view_itp','quality.view_wps','quality.view_rfi','quality.view_ncr',
    'planning.view','reports.view','reports.export',
    'knowledge.view','knowledge.create','knowledge.edit',
    'notifications.view','notifications.view_all','events.view','governance.view',
    'ai.use','ai.view_history',
    'timeline.view','timeline.engineering','timeline.events',
    'settings.view','settings.view_cron',
    // 19.14.0 self-service
    'hr.employee.viewOwn','hr.leaves.view','hr.leaves.request','hr.payroll.viewOwn',
    'hr.loans.viewOwn','hr.custodies.viewOwn','hr.assets.viewOwn','hr.violations.viewOwn','hr.letters.viewOwn',
  ],
};

// ── Helpers ──
function parseCustomPermissions(raw) {
  if (!raw) return { grants: [], revokes: [] };
  if (Array.isArray(raw)) return { grants: raw.filter(x => typeof x === 'string'), revokes: [] };
  if (typeof raw === 'object') {
    return {
      grants: Array.isArray(raw.grants) ? raw.grants.filter(x => typeof x === 'string') : [],
      revokes: Array.isArray(raw.revokes) ? raw.revokes.filter(x => typeof x === 'string') : [],
    };
  }
  return { grants: [], revokes: [] };
}

// ── Part 1: RBAC Role Sync ──
async function syncRbacRoles() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PART 1 — RBAC Role Sync');
  console.log('══════════════════════════════════════════════════════\n');

  const allDbRoles = await prisma.role.findMany({ select: { id: true, name: true, permissions: true } });
  let synced = 0, current = 0, unknown = 0;

  for (const dbRole of allDbRoles) {
    const bundle = ROLE_BUNDLES[dbRole.name];
    if (!bundle) {
      console.log(`  ⚠  "${dbRole.name}": no code bundle — skipped`);
      unknown++;
      continue;
    }
    const existing = (dbRole.permissions || []);
    const missing = bundle.filter(p => !existing.includes(p));
    if (missing.length === 0) {
      console.log(`  ✓  ${dbRole.name}: already up to date (${existing.length} permissions)`);
      current++;
      continue;
    }
    const merged = [...new Set([...existing, ...bundle])];
    await prisma.role.update({ where: { id: dbRole.id }, data: { permissions: merged } });
    console.log(`  ✅ ${dbRole.name}: +${missing.length} permissions → total ${merged.length}`);
    for (const p of missing) console.log(`       + ${p}`);
    synced++;
  }

  // Check for Employee role — create it if missing
  const hasEmployee = allDbRoles.some(r => r.name === 'Employee');
  if (!hasEmployee) {
    await prisma.role.create({
      data: {
        name: 'Employee',
        description: 'Base self-service role for OTS-linked employees. Read-only access to own HR data only.',
        permissions: [...new Set(ROLE_BUNDLES.Employee)],
      },
    });
    console.log(`  ✅ Employee: created new role with ${ROLE_BUNDLES.Employee.length} permissions`);
    synced++;
  }

  console.log(`\n  Summary: ${synced} updated/created, ${current} already current, ${unknown} unknown roles skipped`);
}

// ── Part 2: PBAC Activation ──
async function activatePbacForEmployees() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PART 2 — PBAC Activation (linked employees)');
  console.log('══════════════════════════════════════════════════════\n');

  const linkedUsers = await prisma.user.findMany({
    where: { employeeId: { not: null } },
    select: {
      id: true, name: true, email: true, employeeId: true, isAdmin: true,
      customPermissions: true,
      role: { select: { name: true } },
    },
  });

  if (linkedUsers.length === 0) {
    console.log('  ℹ  No users have a linked employee record.');
    console.log('     Use HR Setup → Identity Reconciliation to link accounts first.\n');
    return;
  }
  console.log(`  Found ${linkedUsers.length} user(s) with linked employee records.\n`);

  let activated = 0, alreadyActive = 0, revokeFix = 0;

  for (const user of linkedUsers) {
    const cp = parseCustomPermissions(user.customPermissions);
    const missingGrants = EMPLOYEE_PBAC_GRANTS.filter(p => !cp.grants.includes(p));
    const wrongRevokes = cp.revokes.filter(r => EMPLOYEE_PBAC_GRANTS.includes(r));
    const needsUpdate = missingGrants.length > 0 || wrongRevokes.length > 0;

    if (!needsUpdate) {
      console.log(`  ✓  ${user.name} (${user.email}): PBAC already active`);
      alreadyActive++;
      continue;
    }

    const newGrants = [...new Set([...cp.grants, ...EMPLOYEE_PBAC_GRANTS])];
    const newRevokes = cp.revokes.filter(r => !EMPLOYEE_PBAC_GRANTS.includes(r));
    const newCp = (newGrants.length > 0 || newRevokes.length > 0)
      ? { grants: newGrants, revokes: newRevokes } : null;

    await prisma.user.update({ where: { id: user.id }, data: { customPermissions: newCp } });

    const role = user.role?.name ?? '(no role)';
    const tag = user.isAdmin ? ' [isAdmin]' : '';
    if (missingGrants.length > 0) {
      const preview = missingGrants.length <= 3 ? missingGrants.join(', ') : `${missingGrants.slice(0,3).join(', ')} …+${missingGrants.length-3}`;
      console.log(`  ✅ ${user.name} (${user.email}) [${role}${tag}]: +${missingGrants.length} grants (${preview})`);
    }
    if (wrongRevokes.length > 0) {
      console.log(`     - removed ${wrongRevokes.length} blocking revoke(s): ${wrongRevokes.join(', ')}`);
      revokeFix++;
    }
    activated++;
  }

  console.log(`\n  Summary: ${activated} activated, ${alreadyActive} already active, ${revokeFix} revoke conflicts fixed`);
}

// ── Part 3: Integrity Report ──
async function integrityReport() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PART 3 — Integrity Report');
  console.log('══════════════════════════════════════════════════════\n');

  const allUsers = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, isAdmin: true, employeeId: true,
      customPermissions: true,
      role: { select: { name: true, permissions: true } },
    },
  });

  const blocked = [];
  const roleMap = {};

  for (const u of allUsers) {
    const rn = u.role?.name ?? '(no role)';
    if (!roleMap[rn]) roleMap[rn] = { total: 0, linked: 0 };
    roleMap[rn].total++;
    if (u.employeeId) roleMap[rn].linked++;

    if (!u.employeeId || u.isAdmin) continue;
    const rolePerms = new Set(u.role?.permissions || []);
    const cp = parseCustomPermissions(u.customPermissions);
    const allGrants = new Set([...rolePerms, ...cp.grants]);
    if (!allGrants.has('hr.employee.viewOwn') || cp.revokes.includes('hr.employee.viewOwn')) {
      blocked.push(`  - ${u.name} (${u.email}) [${rn}]`);
    }
  }

  if (blocked.length === 0) {
    console.log('  ✓  All linked employees have effective hr.employee.viewOwn access.\n');
  } else {
    console.log(`  ⚠  ${blocked.length} linked employee(s) still lack hr.employee.viewOwn:`);
    blocked.forEach(b => console.log(b));
    console.log();
  }

  console.log('  Users by role:');
  for (const [name, c] of Object.entries(roleMap).sort(([a],[b]) => a.localeCompare(b))) {
    const linked = c.linked > 0 ? ` (${c.linked} linked to employee record)` : '';
    console.log(`     ${name.padEnd(28)} ${c.total} user(s)${linked}`);
  }
  console.log();
}

// ── Main ──
async function main() {
  console.log('\n🔐 OTS 19.14.0 — RBAC Sync + PBAC Activation');
  console.log('─────────────────────────────────────────────');
  await syncRbacRoles();
  await activatePbacForEmployees();
  await integrityReport();
  console.log('✅ Done. Re-run at any time — fully idempotent.\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
