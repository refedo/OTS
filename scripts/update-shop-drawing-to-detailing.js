const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Updating "Shop Drawing" to "Detailing" in database...');
    
    // Update ScopeSchedule records
    console.log('\n1. Updating ScopeSchedule records...');
    const scopeScheduleResult = await prisma.scopeSchedule.updateMany({
      where: {
        scopeLabel: 'Shop Drawing'
      },
      data: {
        scopeLabel: 'Detailing'
      }
    });
    console.log(`   ✓ Updated ${scopeScheduleResult.count} ScopeSchedule records`);
    
    // Update Project scopeOfWork field (it's stored as text)
    console.log('\n2. Updating Project scopeOfWork field...');
    const projects = await prisma.project.findMany({
      where: {
        scopeOfWork: {
          contains: 'Shop Drawing'
        }
      }
    });
    
    let projectUpdateCount = 0;
    for (const project of projects) {
      if (project.scopeOfWork) {
        const updatedScope = project.scopeOfWork.replace(/Shop Drawing/g, 'Detailing');
        await prisma.project.update({
          where: { id: project.id },
          data: { scopeOfWork: updatedScope }
        });
        projectUpdateCount++;
      }
    }
    console.log(`   ✓ Updated ${projectUpdateCount} Project records`);
    
    // Update DocumentSubmission records if they use "Shop Drawing" as documentType
    console.log('\n3. Updating DocumentSubmission records...');
    const documentResult = await prisma.documentSubmission.updateMany({
      where: {
        documentType: 'Shop Drawing'
      },
      data: {
        documentType: 'Detailing'
      }
    });
    console.log(`   ✓ Updated ${documentResult.count} DocumentSubmission records`);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nSummary:');
    console.log(`- ScopeSchedule: ${scopeScheduleResult.count} records`);
    console.log(`- Project: ${projectUpdateCount} records`);
    console.log(`- DocumentSubmission: ${documentResult.count} records`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
