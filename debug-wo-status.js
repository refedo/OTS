const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  try {
    const wo = await prisma.workOrder.findFirst({ 
      include: { parts: true } 
    });
    
    console.log('Work Order:', wo?.id);
    console.log('Status:', wo?.status);
    console.log('Progress:', wo?.progress);
    console.log('Parts count:', wo?.parts?.length);
    console.log('');
    
    for (const part of wo?.parts || []) {
      const logs = await prisma.productionLog.findMany({ 
        where: { assemblyPartId: part.assemblyPartId } 
      });
      
      console.log('Part:', part.partDesignation);
      console.log('  Part Qty:', part.quantity);
      console.log('  AssemblyPartId:', part.assemblyPartId);
      console.log('  Logs found:', logs.length);
      
      logs.forEach(l => {
        console.log('    -', l.processType, '| Processed:', l.processedQty);
      });
      console.log('');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
