import prisma from '../src/lib/db';

const SEEDED_PROJECT_IDS = [
  '37c076a9-6fa2-4e50-983c-8375838c207d',
  '76257ced-485e-476e-9bae-04c71f0cf034',
  'a6d06934-31d8-4355-97ad-b216b3c8b59a'
];

async function deleteSeededProjects() {
  console.log('\n🗑️  Starting deletion of seeded projects...\n');

  for (const projectId of SEEDED_PROJECT_IDS) {
    try {
      console.log(`\n📋 Processing project: ${projectId}`);

      // Check if project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          name: true,
          projectNumber: true,
          _count: {
            select: {
              tasks: true,
              buildings: true,
              assignments: true,
              documents: true,
              milestones: true,
            }
          }
        }
      });

      if (!project) {
        console.log(`   ⚠️  Project not found, skipping...`);
        continue;
      }

      console.log(`   Project: ${project.name} (${project.projectNumber})`);
      console.log(`   Related data:`);
      console.log(`   - Tasks: ${project._count.tasks}`);
      console.log(`   - Buildings: ${project._count.buildings}`);
      console.log(`   - Assignments: ${project._count.assignments}`);
      console.log(`   - Documents: ${project._count.documents}`);
      console.log(`   - Milestones: ${project._count.milestones}`);

      // Delete related data in correct order to avoid foreign key constraints

      // 1. Delete WPS records linked to buildings in this project
      const buildings = await prisma.building.findMany({
        where: { projectId },
        select: { id: true }
      });
      const buildingIds = buildings.map(b => b.id);

      if (buildingIds.length > 0) {
        const wpsDeleted = await prisma.wPS.deleteMany({
          where: { buildingId: { in: buildingIds } }
        });
        console.log(`   ✓ Deleted ${wpsDeleted.count} WPS records`);

        // Delete ITP records
        const itpDeleted = await prisma.iTP.deleteMany({
          where: { buildingId: { in: buildingIds } }
        });
        console.log(`   ✓ Deleted ${itpDeleted.count} ITP records`);

        // Delete QC inspections
        const materialInspectionDeleted = await prisma.materialInspection.deleteMany({
          where: { buildingId: { in: buildingIds } }
        });
        console.log(`   ✓ Deleted ${materialInspectionDeleted.count} Material Inspections`);

        const weldingQCDeleted = await prisma.weldingQC.deleteMany({
          where: { buildingId: { in: buildingIds } }
        });
        console.log(`   ✓ Deleted ${weldingQCDeleted.count} Welding QC records`);

        const dimensionalQCDeleted = await prisma.dimensionalQC.deleteMany({
          where: { buildingId: { in: buildingIds } }
        });
        console.log(`   ✓ Deleted ${dimensionalQCDeleted.count} Dimensional QC records`);

        const ndtInspectionDeleted = await prisma.nDTInspection.deleteMany({
          where: { buildingId: { in: buildingIds } }
        });
        console.log(`   ✓ Deleted ${ndtInspectionDeleted.count} NDT Inspections`);

        // Delete RFI and NCR
        const rfiDeleted = await prisma.rFIRequest.deleteMany({
          where: { buildingId: { in: buildingIds } }
        });
        console.log(`   ✓ Deleted ${rfiDeleted.count} RFI Requests`);

        const ncrDeleted = await prisma.nCRReport.deleteMany({
          where: { buildingId: { in: buildingIds } }
        });
        console.log(`   ✓ Deleted ${ncrDeleted.count} NCR Reports`);

        // Delete production records
        const assemblyPartsDeleted = await prisma.assemblyPart.deleteMany({
          where: { buildingId: { in: buildingIds } }
        });
        console.log(`   ✓ Deleted ${assemblyPartsDeleted.count} Assembly Parts`);

        const dispatchReportsDeleted = await prisma.dispatchReport.deleteMany({
          where: { buildingId: { in: buildingIds } }
        });
        console.log(`   ✓ Deleted ${dispatchReportsDeleted.count} Dispatch Reports`);
      }

      // 2. Delete buildings
      const buildingsDeleted = await prisma.building.deleteMany({
        where: { projectId }
      });
      console.log(`   ✓ Deleted ${buildingsDeleted.count} Buildings`);

      // 3. Delete tasks
      const tasksDeleted = await prisma.task.deleteMany({
        where: { projectId }
      });
      console.log(`   ✓ Deleted ${tasksDeleted.count} Tasks`);

      // 4. Delete project assignments
      const assignmentsDeleted = await prisma.projectAssignment.deleteMany({
        where: { projectId }
      });
      console.log(`   ✓ Deleted ${assignmentsDeleted.count} Project Assignments`);

      // 5. Delete documents
      const documentsDeleted = await prisma.document.deleteMany({
        where: { projectId }
      });
      console.log(`   ✓ Deleted ${documentsDeleted.count} Documents`);

      // 6. Delete milestones
      const milestonesDeleted = await prisma.milestone.deleteMany({
        where: { projectId }
      });
      console.log(`   ✓ Deleted ${milestonesDeleted.count} Milestones`);

      // 7. Delete project plan
      const projectPlanDeleted = await prisma.projectPlan.deleteMany({
        where: { projectId }
      });
      console.log(`   ✓ Deleted ${projectPlanDeleted.count} Project Plans`);

      // 8. Delete scope schedules
      const scopeSchedulesDeleted = await prisma.scopeSchedule.deleteMany({
        where: { projectId }
      });
      console.log(`   ✓ Deleted ${scopeSchedulesDeleted.count} Scope Schedules`);

      // 9. Finally, delete the project itself
      await prisma.project.delete({
        where: { id: projectId }
      });
      console.log(`   ✅ Project deleted successfully!`);

    } catch (error) {
      console.error(`   ❌ Error deleting project ${projectId}:`, error);
      if (error instanceof Error) {
        console.error(`   Error message: ${error.message}`);
      }
    }
  }

  console.log('\n✅ Deletion process completed!\n');
  await prisma.$disconnect();
}

deleteSeededProjects().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
