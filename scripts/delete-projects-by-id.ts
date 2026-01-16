import prisma from '../src/lib/db';

// Add project IDs you want to delete here
const PROJECT_IDS_TO_DELETE = [
  '37c076a9-6fa2-4e50-983c-8375838c207d',
  '76257ced-485e-476e-9bae-04c71f0cf034',
  'a6d06934-31d8-4355-97ad-b216b3c8b59a'
];

async function deleteProjectWithAllRelations(projectId: string) {
  console.log(`\n📋 Processing project: ${projectId}`);

  // Check if project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      projectNumber: true,
    }
  });

  if (!project) {
    console.log(`   ⚠️  Project not found, skipping...`);
    return false;
  }

  console.log(`   Project: ${project.name || 'Unnamed'} (${project.projectNumber || 'No number'})`);

  try {
    // Get all building IDs for this project
    const buildings = await prisma.building.findMany({
      where: { projectId },
      select: { id: true, designation: true }
    });
    const buildingIds = buildings.map(b => b.id);
    console.log(`   Found ${buildings.length} buildings`);

    // Delete WPS records (linked to project, not building)
    await prisma.wPSPass.deleteMany({ 
      where: { 
        wps: { projectId } 
      } 
    });
    await prisma.wPS.deleteMany({ where: { projectId } });
    console.log(`   ✓ Deleted WPS records`);

    if (buildingIds.length > 0) {
      // Delete all building-related records
      await prisma.iTP.deleteMany({ where: { buildingId: { in: buildingIds } } });
      await prisma.materialInspection.deleteMany({ where: { buildingId: { in: buildingIds } } });
      await prisma.weldingQC.deleteMany({ where: { buildingId: { in: buildingIds } } });
      await prisma.dimensionalQC.deleteMany({ where: { buildingId: { in: buildingIds } } });
      await prisma.nDTInspection.deleteMany({ where: { buildingId: { in: buildingIds } } });
      await prisma.rFIRequest.deleteMany({ where: { buildingId: { in: buildingIds } } });
      await prisma.nCRReport.deleteMany({ where: { buildingId: { in: buildingIds } } });
      await prisma.assemblyPart.deleteMany({ where: { buildingId: { in: buildingIds } } });
      await prisma.dispatchReport.deleteMany({ where: { buildingId: { in: buildingIds } } });
      console.log(`   ✓ Deleted building-related records`);
    }

    // Delete buildings
    await prisma.building.deleteMany({ where: { projectId } });
    
    // Delete project-related records
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.projectAssignment.deleteMany({ where: { projectId } });
    await prisma.document.deleteMany({ where: { projectId } });
    await prisma.milestone.deleteMany({ where: { projectId } });
    await prisma.projectPlan.deleteMany({ where: { projectId } });
    await prisma.scopeSchedule.deleteMany({ where: { projectId } });
    console.log(`   ✓ Deleted project-related records`);

    // Finally delete the project
    await prisma.project.delete({ where: { id: projectId } });
    console.log(`   ✅ Project deleted successfully!`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ Error deleting project:`, error);
    if (error instanceof Error) {
      console.error(`   Error message: ${error.message}`);
    }
    return false;
  }
}

async function main() {
  console.log('\n🗑️  Starting project deletion...');
  console.log(`   Projects to delete: ${PROJECT_IDS_TO_DELETE.length}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const projectId of PROJECT_IDS_TO_DELETE) {
    const success = await deleteProjectWithAllRelations(projectId);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successfully deleted: ${successCount} projects`);
  console.log(`❌ Failed to delete: ${failCount} projects`);
  console.log('='.repeat(50) + '\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
