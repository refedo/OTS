import { PrismaClient } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/lib/permissions';

const prisma = new PrismaClient();

async function updateDocumentControllerPermissions() {
  try {
    console.log('Updating Document Controller role permissions...');

    const documentControllerPermissions = DEFAULT_ROLE_PERMISSIONS['Document Controller'];

    if (!documentControllerPermissions) {
      console.error('Document Controller permissions not found in DEFAULT_ROLE_PERMISSIONS');
      process.exit(1);
    }

    // Find or create Document Controller role
    const role = await prisma.role.upsert({
      where: { name: 'Document Controller' },
      update: {
        permissions: documentControllerPermissions,
        description: 'Document Controller with task creation permissions',
      },
      create: {
        name: 'Document Controller',
        description: 'Document Controller with task creation permissions',
        permissions: documentControllerPermissions,
      },
    });

    console.log('✅ Document Controller role updated successfully');
    console.log(`   Role ID: ${role.id}`);
    console.log(`   Permissions count: ${documentControllerPermissions.length}`);
    console.log(`   Includes tasks.create: ${documentControllerPermissions.includes('tasks.create')}`);

  } catch (error) {
    console.error('Error updating Document Controller permissions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateDocumentControllerPermissions();
