/**
 * Update existing roles with financial & dolibarr permissions
 * Run: npx tsx scripts/update-role-permissions.ts
 */
import prisma from '../src/lib/db';

const FINANCIAL_PERMISSIONS = [
  'financial.view',
  'financial.manage',
  'financial.sync',
  'financial.export',
];

const DOLIBARR_PERMISSIONS = [
  'dolibarr.view',
  'dolibarr.sync',
];

const ROLE_ADDITIONS: Record<string, string[]> = {
  // CEO gets everything via code (superadmin), but also add to DB for sidebar
  CEO: [...FINANCIAL_PERMISSIONS, ...DOLIBARR_PERMISSIONS, 'settings.view', 'settings.edit'],
  Admin: [...FINANCIAL_PERMISSIONS, ...DOLIBARR_PERMISSIONS],
  Manager: [...FINANCIAL_PERMISSIONS, ...DOLIBARR_PERMISSIONS],
  // Engineer gets view-only financial access
  Engineer: ['financial.view'],
};

async function main() {
  console.log('Updating role permissions with financial module...\n');

  const roles = await prisma.role.findMany();

  for (const role of roles) {
    const additions = ROLE_ADDITIONS[role.name];
    if (!additions) {
      console.log(`  ⏭ ${role.name} — no changes needed`);
      continue;
    }

    const currentPerms: string[] = Array.isArray(role.permissions) ? (role.permissions as string[]) : [];
    const newPerms = [...new Set([...currentPerms, ...additions])];
    const added = newPerms.length - currentPerms.length;

    if (added === 0) {
      console.log(`  ✓ ${role.name} — already has all permissions (${currentPerms.length})`);
      continue;
    }

    await prisma.role.update({
      where: { id: role.id },
      data: { permissions: newPerms },
    });

    console.log(`  ✅ ${role.name} — added ${added} permissions (${currentPerms.length} → ${newPerms.length})`);
    additions.filter(p => !currentPerms.includes(p)).forEach(p => console.log(`      + ${p}`));
  }

  console.log('\nDone! Roles updated with financial permissions.');
  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
