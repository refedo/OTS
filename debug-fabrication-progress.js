const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugFabricationProgress() {
  try {
    // Find project 300
    const project = await prisma.project.findFirst({
      where: { projectNumber: '300' },
      include: {
        buildings: {
          include: {
            assemblyParts: {
              include: {
                productionLogs: true
              }
            }
          }
        }
      }
    });

    if (!project) {
      console.log('Project 300 not found');
      return;
    }

    console.log('Project:', project.projectNumber, project.name);
    console.log('Buildings:', project.buildings.length);

    project.buildings.forEach(building => {
      console.log('\n=== Building:', building.designation, building.name);
      console.log('Parts:', building.assemblyParts.length);
      
      const totalQty = building.assemblyParts.reduce((sum, p) => sum + (p.quantity || 0), 0);
      console.log('Total Quantity:', totalQty);

      // Calculate for each process
      ['Fit-up', 'Welding', 'Visualization'].forEach(processType => {
        const processedQty = building.assemblyParts.reduce((sum, part) => {
          const logs = part.productionLogs.filter(log => log.processType === processType);
          const partProcessed = logs.reduce((s, log) => s + (log.quantityProcessed || 0), 0);
          const capped = Math.min(partProcessed, part.quantity || 0);
          
          if (logs.length > 0) {
            console.log(`  Part ${part.designation}: ${processType} - ${partProcessed}/${part.quantity} (capped: ${capped})`);
          }
          
          return sum + capped;
        }, 0);
        
        const progress = totalQty > 0 ? (processedQty / totalQty) * 100 : 0;
        console.log(`${processType}: ${processedQty}/${totalQty} = ${progress.toFixed(1)}%`);
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugFabricationProgress();
