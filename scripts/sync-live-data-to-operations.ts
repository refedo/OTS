/**
 * Sync Live Data to Operations Control
 * 
 * This script populates WorkUnits, Dependencies, and Capacity from actual
 * live data in Projects, Tasks, WorkOrders, and Production modules.
 * 
 * Run with: npx ts-node scripts/sync-live-data-to-operations.ts
 */

import { PrismaClient, WorkUnitType, WorkUnitStatus, DependencyType, ResourceType, CapacityUnit } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapTaskStatusToWorkUnitStatus(status: string): WorkUnitStatus {
  switch (status?.toLowerCase()) {
    case 'completed':
      return WorkUnitStatus.COMPLETED;
    case 'in progress':
    case 'in-progress':
      return WorkUnitStatus.IN_PROGRESS;
    case 'on hold':
    case 'blocked':
      return WorkUnitStatus.BLOCKED;
    default:
      return WorkUnitStatus.NOT_STARTED;
  }
}

function mapWorkOrderStatusToWorkUnitStatus(status: string): WorkUnitStatus {
  switch (status?.toLowerCase()) {
    case 'completed':
      return WorkUnitStatus.COMPLETED;
    case 'in progress':
    case 'in-progress':
      return WorkUnitStatus.IN_PROGRESS;
    case 'on hold':
    case 'cancelled':
      return WorkUnitStatus.BLOCKED;
    default:
      return WorkUnitStatus.NOT_STARTED;
  }
}

function getWorkUnitTypeFromDepartment(departmentName: string | null): WorkUnitType {
  if (!departmentName) return WorkUnitType.DESIGN;
  
  const name = departmentName.toLowerCase();
  if (name.includes('design') || name.includes('engineering') || name.includes('detailing')) {
    return WorkUnitType.DESIGN;
  }
  if (name.includes('procurement') || name.includes('purchasing') || name.includes('supply')) {
    return WorkUnitType.PROCUREMENT;
  }
  if (name.includes('qc') || name.includes('quality')) {
    return WorkUnitType.QC;
  }
  if (name.includes('document') || name.includes('submittal')) {
    return WorkUnitType.DOCUMENTATION;
  }
  return WorkUnitType.DESIGN;
}

// ============================================
// SYNC FUNCTIONS
// ============================================

async function syncTasksToWorkUnits() {
  console.log('\n📋 Syncing Tasks to WorkUnits...');
  
  const tasks = await prisma.task.findMany({
    where: {
      projectId: { not: null },
      dueDate: { not: null },
    },
    include: {
      department: true,
      assignedTo: true,
      project: true,
    },
  });
  
  let created = 0;
  let skipped = 0;
  
  for (const task of tasks) {
    if (!task.projectId || !task.dueDate) continue;
    
    // Check if WorkUnit already exists
    const existing = await prisma.workUnit.findFirst({
      where: {
        referenceModule: 'Task',
        referenceId: task.id,
      },
    });
    
    if (existing) {
      skipped++;
      continue;
    }
    
    // Get a default owner (assigned user or first admin)
    let ownerId: string | null = task.assignedToId;
    if (!ownerId) {
      const admin = await prisma.user.findFirst({ where: { status: 'active' } });
      ownerId = admin?.id || null;
    }
    if (!ownerId) continue;
    
    const workUnitType = getWorkUnitTypeFromDepartment(task.department?.name || null);
    const startDate = task.taskInputDate || task.createdAt;
    const endDate = task.dueDate;
    
    await prisma.workUnit.create({
      data: {
        projectId: task.projectId,
        type: workUnitType,
        referenceModule: 'Task',
        referenceId: task.id,
        ownerId,
        plannedStart: startDate,
        plannedEnd: endDate,
        status: mapTaskStatusToWorkUnitStatus(task.status),
      },
    });
    created++;
  }
  
  console.log(`   ✓ Created ${created} WorkUnits from Tasks (${skipped} already existed)`);
  return created;
}

async function syncWorkOrdersToWorkUnits() {
  console.log('\n🏭 Syncing WorkOrders to WorkUnits...');
  
  const workOrders = await prisma.workOrder.findMany({
    include: {
      project: true,
      productionEngineer: true,
    },
  });
  
  let created = 0;
  let skipped = 0;
  
  for (const wo of workOrders) {
    // Check if WorkUnit already exists
    const existing = await prisma.workUnit.findFirst({
      where: {
        referenceModule: 'WorkOrder',
        referenceId: wo.id,
      },
    });
    
    if (existing) {
      skipped++;
      continue;
    }
    
    await prisma.workUnit.create({
      data: {
        projectId: wo.projectId,
        type: WorkUnitType.PRODUCTION,
        referenceModule: 'WorkOrder',
        referenceId: wo.id,
        ownerId: wo.productionEngineerId,
        plannedStart: wo.plannedStartDate,
        plannedEnd: wo.plannedEndDate,
        weight: wo.totalWeight ? Number(wo.totalWeight) : null,
        status: mapWorkOrderStatusToWorkUnitStatus(wo.status),
      },
    });
    created++;
  }
  
  console.log(`   ✓ Created ${created} WorkUnits from WorkOrders (${skipped} already existed)`);
  return created;
}

async function syncRFIsToWorkUnits() {
  console.log('\n📝 Syncing RFIs to WorkUnits...');
  
  const rfis = await prisma.rFIRequest.findMany({
    include: {
      project: true,
      building: true,
    },
  });
  
  let created = 0;
  let skipped = 0;
  
  for (const rfi of rfis) {
    if (!rfi.projectId) continue;
    
    // Check if WorkUnit already exists
    const existing = await prisma.workUnit.findFirst({
      where: {
        referenceModule: 'RFI',
        referenceId: rfi.id,
      },
    });
    
    if (existing) {
      skipped++;
      continue;
    }
    
    // Get a default owner
    const admin = await prisma.user.findFirst({ where: { status: 'active' } });
    if (!admin) continue;
    
    const startDate = rfi.createdAt;
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
    
    await prisma.workUnit.create({
      data: {
        projectId: rfi.projectId,
        type: WorkUnitType.QC,
        referenceModule: 'RFI',
        referenceId: rfi.id,
        ownerId: admin.id,
        plannedStart: startDate,
        plannedEnd: endDate,
        status: rfi.status === 'Closed' ? WorkUnitStatus.COMPLETED : 
                rfi.status === 'In Progress' ? WorkUnitStatus.IN_PROGRESS : WorkUnitStatus.NOT_STARTED,
      },
    });
    created++;
  }
  
  console.log(`   ✓ Created ${created} WorkUnits from RFIs (${skipped} already existed)`);
  return created;
}

async function syncDocumentSubmissionsToWorkUnits() {
  console.log('\n📄 Syncing DocumentSubmissions to WorkUnits...');
  
  const docs = await prisma.documentSubmission.findMany({
    include: {
      project: true,
    },
  });
  
  let created = 0;
  let skipped = 0;
  
  for (const doc of docs) {
    // Check if WorkUnit already exists
    const existing = await prisma.workUnit.findFirst({
      where: {
        referenceModule: 'DocumentSubmission',
        referenceId: doc.id,
      },
    });
    
    if (existing) {
      skipped++;
      continue;
    }
    
    // Get a default owner
    let ownerId: string | null = doc.handledBy;
    if (!ownerId) {
      const admin = await prisma.user.findFirst({ where: { status: 'active' } });
      ownerId = admin?.id || null;
    }
    if (!ownerId) continue;
    
    const startDate = doc.submissionDate || doc.createdAt;
    const endDate = doc.reviewDueDate || new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    await prisma.workUnit.create({
      data: {
        projectId: doc.projectId,
        type: WorkUnitType.DOCUMENTATION,
        referenceModule: 'DocumentSubmission',
        referenceId: doc.id,
        ownerId,
        plannedStart: startDate,
        plannedEnd: endDate,
        status: doc.status === 'Approved' ? WorkUnitStatus.COMPLETED :
                doc.status === 'Under Review' ? WorkUnitStatus.IN_PROGRESS : WorkUnitStatus.NOT_STARTED,
      },
    });
    created++;
  }
  
  console.log(`   ✓ Created ${created} WorkUnits from DocumentSubmissions (${skipped} already existed)`);
  return created;
}

async function createDependenciesFromWorkflow() {
  console.log('\n🔗 Creating Dependencies based on workflow logic...');
  
  // Get all projects with WorkUnits
  const projects = await prisma.project.findMany({
    where: {
      workUnits: { some: {} },
    },
    select: { id: true, projectNumber: true },
  });
  
  let created = 0;
  
  for (const project of projects) {
    // Get WorkUnits for this project grouped by type
    const workUnits = await prisma.workUnit.findMany({
      where: { projectId: project.id },
      orderBy: { plannedStart: 'asc' },
    });
    
    const byType: Record<string, typeof workUnits> = {};
    for (const wu of workUnits) {
      if (!byType[wu.type]) byType[wu.type] = [];
      byType[wu.type].push(wu);
    }
    
    // Create dependencies based on workflow:
    // DESIGN → PROCUREMENT → PRODUCTION → QC → DOCUMENTATION
    
    const workflowOrder = ['DESIGN', 'PROCUREMENT', 'PRODUCTION', 'QC', 'DOCUMENTATION'];
    
    for (let i = 0; i < workflowOrder.length - 1; i++) {
      const upstreamType = workflowOrder[i];
      const downstreamType = workflowOrder[i + 1];
      
      const upstreamUnits = byType[upstreamType] || [];
      const downstreamUnits = byType[downstreamType] || [];
      
      // Link each downstream to relevant upstream (limit to avoid explosion)
      for (const downstream of downstreamUnits.slice(0, 5)) {
        for (const upstream of upstreamUnits.slice(0, 3)) {
          // Check if dependency already exists
          const existing = await prisma.workUnitDependency.findFirst({
            where: {
              fromWorkUnitId: upstream.id,
              toWorkUnitId: downstream.id,
            },
          });
          
          if (!existing) {
            await prisma.workUnitDependency.create({
              data: {
                fromWorkUnitId: upstream.id,
                toWorkUnitId: downstream.id,
                dependencyType: DependencyType.FS,
                lagDays: 0,
              },
            });
            created++;
          }
        }
      }
    }
  }
  
  console.log(`   ✓ Created ${created} Dependencies`);
  return created;
}

async function createResourceCapacity() {
  console.log('\n⚙️ Creating Resource Capacity entries...');
  
  // Check if capacity already exists
  const existingCount = await prisma.resourceCapacity.count();
  if (existingCount > 0) {
    console.log(`   ⏭️ Skipped - ${existingCount} capacity entries already exist`);
    return 0;
  }
  
  // Create realistic capacity entries based on typical steel fabrication shop
  const capacities = [
    // Design resources
    { resourceType: ResourceType.DESIGNER, resourceName: 'Design Team', capacityPerDay: 40, unit: CapacityUnit.HOURS },
    { resourceType: ResourceType.DESIGNER, resourceName: 'Detailing Team', capacityPerDay: 60, unit: CapacityUnit.HOURS },
    
    // Production resources
    { resourceType: ResourceType.LASER, resourceName: 'Laser Cutting Machine 1', capacityPerDay: 8, unit: CapacityUnit.TONS },
    { resourceType: ResourceType.LASER, resourceName: 'Laser Cutting Machine 2', capacityPerDay: 6, unit: CapacityUnit.TONS },
    { resourceType: ResourceType.WELDER, resourceName: 'Welding Station A', capacityPerDay: 3, unit: CapacityUnit.TONS },
    { resourceType: ResourceType.WELDER, resourceName: 'Welding Station B', capacityPerDay: 3, unit: CapacityUnit.TONS },
    { resourceType: ResourceType.WELDER, resourceName: 'Welding Station C', capacityPerDay: 2.5, unit: CapacityUnit.TONS },
    
    // QC resources
    { resourceType: ResourceType.QC, resourceName: 'QC Inspector Team', capacityPerDay: 5, unit: CapacityUnit.TONS },
    
    // Procurement
    { resourceType: ResourceType.PROCUREMENT, resourceName: 'Procurement Team', capacityPerDay: 20, unit: CapacityUnit.HOURS },
  ];
  
  for (const cap of capacities) {
    await prisma.resourceCapacity.create({
      data: {
        resourceType: cap.resourceType,
        resourceName: cap.resourceName,
        capacityPerDay: cap.capacityPerDay,
        unit: cap.unit,
        workingDaysPerWeek: 6,
        isActive: true,
      },
    });
  }
  
  console.log(`   ✓ Created ${capacities.length} Resource Capacity entries`);
  return capacities.length;
}

async function calculateResourceLoad() {
  console.log('\n📊 Calculating Resource Load from WorkOrders...');
  
  // Get active work orders with weight
  const activeWorkOrders = await prisma.workOrder.findMany({
    where: {
      status: { in: ['Pending', 'In Progress'] },
    },
    select: {
      id: true,
      workOrderNumber: true,
      totalWeight: true,
      plannedStartDate: true,
      plannedEndDate: true,
    },
  });
  
  // Calculate total load
  let totalWeight = 0;
  for (const wo of activeWorkOrders) {
    totalWeight += Number(wo.totalWeight || 0);
  }
  
  // Get welding capacity
  const weldingCapacity = await prisma.resourceCapacity.findMany({
    where: { resourceType: ResourceType.WELDER },
  });
  
  const totalWeldingCapacityPerDay = weldingCapacity.reduce((sum, c) => sum + c.capacityPerDay, 0);
  
  // Calculate days needed vs available
  const daysNeeded = totalWeldingCapacityPerDay > 0 ? totalWeight / 1000 / totalWeldingCapacityPerDay : 0;
  
  console.log(`   📈 Active WorkOrders: ${activeWorkOrders.length}`);
  console.log(`   📈 Total Weight: ${(totalWeight / 1000).toFixed(2)} tons`);
  console.log(`   📈 Welding Capacity: ${totalWeldingCapacityPerDay} tons/day`);
  console.log(`   📈 Days needed at current load: ${daysNeeded.toFixed(1)} days`);
  
  return { activeWorkOrders: activeWorkOrders.length, totalWeight, totalWeldingCapacityPerDay, daysNeeded };
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🔄 Syncing Live Data to Operations Control');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    // Sync WorkUnits
    const taskUnits = await syncTasksToWorkUnits();
    const woUnits = await syncWorkOrdersToWorkUnits();
    const rfiUnits = await syncRFIsToWorkUnits();
    const docUnits = await syncDocumentSubmissionsToWorkUnits();
    
    // Create Dependencies
    const deps = await createDependenciesFromWorkflow();
    
    // Create Capacity
    const caps = await createResourceCapacity();
    
    // Calculate Load
    const load = await calculateResourceLoad();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ Sync Complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  WorkUnits created: ${taskUnits + woUnits + rfiUnits + docUnits}`);
    console.log(`  Dependencies created: ${deps}`);
    console.log(`  Capacity entries: ${caps}`);
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('Error during sync:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
