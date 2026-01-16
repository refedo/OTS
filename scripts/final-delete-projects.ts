import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PROJECT_IDS = [
  '37c076a9-6fa2-4e50-983c-8375838c207d',
  '76257ced-485e-476e-9bae-04c71f0cf034',
  'a6d06934-31d8-4355-97ad-b216b3c8b59a'
];

async function deleteProject(projectId: string) {
  console.log(`\nDeleting project: ${projectId}`);
  
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, projectNumber: true }
  });

  if (!project) {
    console.log('  ⚠️  Not found');
    return false;
  }

  console.log(`  ${project.name} (${project.projectNumber})`);

  try {
    // Delete WPS and ITP related records (linked to project)
    await prisma.wPSPass.deleteMany({ where: { wps: { projectId } } });
    await prisma.wPS.deleteMany({ where: { projectId } });
    await prisma.iTPActivity.deleteMany({ where: { itp: { projectId } } });
    await prisma.iTP.deleteMany({ where: { projectId } });
    
    // Delete document submissions and revisions
    await prisma.documentRevision.deleteMany({ 
      where: { submission: { projectId } } 
    });
    await prisma.documentSubmission.deleteMany({ where: { projectId } });
    
    // Delete project-related records
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.projectAssignment.deleteMany({ where: { projectId } });
    await prisma.scopeSchedule.deleteMany({ where: { projectId } });
    
    // Delete buildings (CASCADE will handle building-related records)
    await prisma.building.deleteMany({ where: { projectId } });
    
    // Finally delete the project
    await prisma.project.delete({ where: { id: projectId } });
    
    console.log('  ✅ Deleted successfully');
    return true;
  } catch (error: any) {
    console.log('  ❌ Error:', error.message);
    console.log('  Code:', error.code);
    return false;
  }
}

async function main() {
  console.log('🗑️  Deleting Seeded Projects\n');
  console.log('='.repeat(50));
  
  let success = 0;
  for (const id of PROJECT_IDS) {
    if (await deleteProject(id)) success++;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successfully deleted: ${success}/${PROJECT_IDS.length} projects`);
  console.log('='.repeat(50) + '\n');
  
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
