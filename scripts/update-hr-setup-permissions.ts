import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// One-shot idempotent patch that grants `hr.section.manage` to the CEO and HR
// roles. The HR role was created at runtime through the role-management UI
// (not via prisma/seed.ts), so we merge into whatever permissions the role
// already has instead of overwriting.
const NEW_PERMISSIONS = ['hr.section.manage'];
const TARGET_ROLES = ['CEO', 'HR'];

async function main() {
  for (const roleName of TARGET_ROLES) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      console.warn(`⚠️  Role "${roleName}" not found — skipping`);
      continue;
    }

    const current = Array.isArray(role.permissions) ? (role.permissions as string[]) : [];
    const merged = Array.from(new Set([...current, ...NEW_PERMISSIONS]));
    const added = merged.length - current.length;

    if (added === 0) {
      console.log(`✓ ${roleName} already has all HR setup permissions (${current.length} total)`);
      continue;
    }

    await prisma.role.update({
      where: { id: role.id },
      data: { permissions: merged },
    });

    console.log(`✅ ${roleName}: added ${added} permission(s) → ${merged.length} total`);
  }
}

main()
  .catch((e) => {
    console.error('Error updating HR setup permissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
