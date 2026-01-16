const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWorkOrder() {
  try {
    console.log('Testing WorkOrder table access...');
    
    // Test 1: Check if table exists by trying to count
    const count = await prisma.workOrder.count();
    console.log('✅ WorkOrder table exists, count:', count);
    
    // Test 2: Get a building with parts first, then get its project
    const building = await prisma.building.findFirst({
      where: {
        assemblyParts: { some: {} }
      },
      include: { project: true }
    });
    console.log('Building:', building?.id, building?.designation);
    const project = building?.project;
    console.log('Project:', project?.id, project?.name);
    
    // Test 3: Get a user for engineer
    const user = await prisma.user.findFirst();
    console.log('User:', user?.id, user?.name);
    
    // Test 4: Get some assembly parts
    const parts = await prisma.assemblyPart.findMany({
      where: { buildingId: building?.id },
      take: 2
    });
    console.log('Parts found:', parts.length);
    
    if (parts.length === 0) {
      console.log('❌ No parts found for this building');
      return;
    }
    
    // Test 5: Try to create a work order
    console.log('\nAttempting to create work order...');
    
    const workOrder = await prisma.workOrder.create({
      data: {
        workOrderNumber: `WO-TEST-${Date.now()}`,
        name: 'Test Work Order',
        description: 'Test',
        projectId: project.id,
        buildingId: building.id,
        selectedGroups: ['Test Group'],
        productionEngineerId: user.id,
        processingLocation: 'Test Location',
        processingTeam: 'Test Team',
        totalWeight: 100,
        weightPercentage: 10,
        plannedStartDate: new Date(),
        plannedEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Pending',
        progress: 0,
        createdById: user.id,
        parts: {
          create: parts.map(part => ({
            assemblyPartId: part.id,
            partDesignation: part.partDesignation,
            assemblyMark: part.assemblyMark,
            partMark: part.partMark,
            quantity: part.quantity,
            weight: Number(part.netWeightTotal) || 0,
            processedQuantity: 0,
            status: 'Pending',
          })),
        },
      },
      include: {
        parts: true,
      },
    });
    
    console.log('✅ Work order created successfully!');
    console.log('Work Order ID:', workOrder.id);
    console.log('Work Order Number:', workOrder.workOrderNumber);
    console.log('Parts created:', workOrder.parts.length);
    
    // Clean up - delete the test work order
    await prisma.workOrder.delete({
      where: { id: workOrder.id }
    });
    console.log('✅ Test work order deleted');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error meta:', error.meta);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWorkOrder();
