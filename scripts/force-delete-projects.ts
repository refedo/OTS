import prisma from '../src/lib/db';

const PROJECT_IDS_TO_DELETE = [
  '37c076a9-6fa2-4e50-983c-8375838c207d',
  '76257ced-485e-476e-9bae-04c71f0cf034',
  'a6d06934-31d8-4355-97ad-b216b3c8b59a'
];

async function forceDeleteProject(projectId: string) {
  console.log(`\n📋 Deleting project: ${projectId}`);

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, projectNumber: true }
    });

    if (!project) {
      console.log(`   ⚠️  Project not found`);
      return false;
    }

    console.log(`   Project: ${project.name || 'Unnamed'} (${project.projectNumber || 'N/A'})`);

    // Since CASCADE DELETE is configured in the schema, we just need to delete the project
    // and all related records will be automatically deleted by the database
    await prisma.project.delete({
      where: { id: projectId }
    });

    console.log(`   ✅ Project and all related data deleted successfully!`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error:`, error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
    }
    return false;
  }
}

async function main() {
  console.log('\n🗑️  Force Delete Projects');
  console.log('='.repeat(50));
  console.log(`Projects to delete: ${PROJECT_IDS_TO_DELETE.length}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const projectId of PROJECT_IDS_TO_DELETE) {
    const success = await forceDeleteProject(projectId);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successfully deleted: ${successCount} projects`);
  console.log(`❌ Failed: ${failCount} projects`);
  console.log('='.repeat(50) + '\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
