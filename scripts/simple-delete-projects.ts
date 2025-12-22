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
    // Delete in correct order to avoid FK constraints
    await prisma.wPSPass.deleteMany({ where: { wps: { projectId } } });
    await prisma.wPS.deleteMany({ where: { projectId } });
    await prisma.iTPActivity.deleteMany({ where: { itp: { projectId } } });
    await prisma.iTP.deleteMany({ where: { projectId } });
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.projectAssignment.deleteMany({ where: { projectId } });
    await prisma.document.deleteMany({ where: { projectId } });
    await prisma.milestone.deleteMany({ where: { projectId } });
    await prisma.projectPlan.deleteMany({ where: { projectId } });
    await prisma.scopeSchedule.deleteMany({ where: { projectId } });
    await prisma.building.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    
    console.log('  ✅ Deleted');
    return true;
  } catch (error: any) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🗑️  Deleting Seeded Projects\n');
  
  let success = 0;
  for (const id of PROJECT_IDS) {
    if (await deleteProject(id)) success++;
  }
  
  console.log(`\n✅ Deleted ${success}/${PROJECT_IDS.length} projects`);
  await prisma.$disconnect();
}

main();
