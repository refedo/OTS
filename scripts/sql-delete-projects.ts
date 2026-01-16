import prisma from '../src/lib/db';

const PROJECT_IDS_TO_DELETE = [
  '37c076a9-6fa2-4e50-983c-8375838c207d',
  '76257ced-485e-476e-9bae-04c71f0cf034',
  'a6d06934-31d8-4355-97ad-b216b3c8b59a'
];

async function sqlDeleteProjects() {
  console.log('\n🗑️  SQL-Based Project Deletion');
  console.log('='.repeat(50));
  console.log(`Projects to delete: ${PROJECT_IDS_TO_DELETE.length}\n`);

  for (const projectId of PROJECT_IDS_TO_DELETE) {
    try {
      console.log(`\n📋 Deleting project: ${projectId}`);

      // Get project info first
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, projectNumber: true }
      });

      if (!project) {
        console.log(`   ⚠️  Project not found`);
        continue;
      }

      console.log(`   Project: ${project.name || 'Unnamed'} (${project.projectNumber || 'N/A'})`);

      // Use raw SQL to delete with CASCADE
      // First, disable foreign key checks temporarily
      await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;

      // Delete from all related tables
      await prisma.$executeRaw`DELETE FROM WPSPass WHERE wpsId IN (SELECT id FROM WPS WHERE projectId = ${projectId})`;
      await prisma.$executeRaw`DELETE FROM WPS WHERE projectId = ${projectId}`;
      await prisma.$executeRaw`DELETE FROM ITPActivity WHERE itpId IN (SELECT id FROM ITP WHERE projectId = ${projectId})`;
      await prisma.$executeRaw`DELETE FROM ITP WHERE projectId = ${projectId}`;
      await prisma.$executeRaw`DELETE FROM Task WHERE projectId = ${projectId}`;
      await prisma.$executeRaw`DELETE FROM ProjectAssignment WHERE projectId = ${projectId}`;
      await prisma.$executeRaw`DELETE FROM Document WHERE projectId = ${projectId}`;
      await prisma.$executeRaw`DELETE FROM Milestone WHERE projectId = ${projectId}`;
      await prisma.$executeRaw`DELETE FROM ProjectPlan WHERE projectId = ${projectId}`;
      await prisma.$executeRaw`DELETE FROM ScopeSchedule WHERE projectId = ${projectId}`;
      
      // Delete building-related records
      await prisma.$executeRaw`DELETE FROM MaterialInspection WHERE buildingId IN (SELECT id FROM Building WHERE projectId = ${projectId})`;
      await prisma.$executeRaw`DELETE FROM WeldingQC WHERE buildingId IN (SELECT id FROM Building WHERE projectId = ${projectId})`;
      await prisma.$executeRaw`DELETE FROM DimensionalQC WHERE buildingId IN (SELECT id FROM Building WHERE projectId = ${projectId})`;
      await prisma.$executeRaw`DELETE FROM NDTInspection WHERE buildingId IN (SELECT id FROM Building WHERE projectId = ${projectId})`;
      await prisma.$executeRaw`DELETE FROM RFIRequest WHERE buildingId IN (SELECT id FROM Building WHERE projectId = ${projectId})`;
      await prisma.$executeRaw`DELETE FROM NCRReport WHERE buildingId IN (SELECT id FROM Building WHERE projectId = ${projectId})`;
      await prisma.$executeRaw`DELETE FROM AssemblyPart WHERE buildingId IN (SELECT id FROM Building WHERE projectId = ${projectId})`;
      await prisma.$executeRaw`DELETE FROM DispatchReport WHERE buildingId IN (SELECT id FROM Building WHERE projectId = ${projectId})`;
      
      // Delete buildings
      await prisma.$executeRaw`DELETE FROM Building WHERE projectId = ${projectId}`;
      
      // Finally delete the project
      await prisma.$executeRaw`DELETE FROM Project WHERE id = ${projectId}`;

      // Re-enable foreign key checks
      await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;

      console.log(`   ✅ Project deleted successfully!`);
    } catch (error) {
      console.error(`   ❌ Error:`, error);
      if (error instanceof Error) {
        console.error(`   Message: ${error.message}`);
      }
      // Re-enable foreign key checks even on error
      try {
        await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;
      } catch (e) {
        // Ignore
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Deletion process completed!');
  console.log('='.repeat(50) + '\n');

  await prisma.$disconnect();
}

sqlDeleteProjects().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
