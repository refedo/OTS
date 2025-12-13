const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProductionLogs() {
  try {
    // Find project 300
    const project = await prisma.project.findFirst({
      where: { projectNumber: '300' }
    });

    if (!project) {
      console.log('Project 300 not found');
      return;
    }

    // Get production logs for this project
    const logs = await prisma.productionLog.findMany({
      where: {
        assemblyPart: {
          building: {
            projectId: project.id
          }
        }
      },
      include: {
        assemblyPart: {
          select: {
            partDesignation: true,
            quantity: true,
            building: {
              select: {
                designation: true
              }
            }
          }
        }
      },
      take: 20
    });

    console.log('Production logs found:', logs.length);
    logs.forEach(log => {
      console.log('\n---');
      console.log('Building:', log.assemblyPart.building.designation);
      console.log('Part:', log.assemblyPart.partDesignation);
      console.log('Part Qty:', log.assemblyPart.quantity);
      console.log('Process:', log.processType);
      console.log('Qty Processed:', log.quantityProcessed);
      console.log('Date:', log.productionDate);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductionLogs();
