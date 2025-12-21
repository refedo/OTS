/**
 * Operations Control Seed Script
 * 
 * Seeds test data for the Operations Control system:
 * - WorkUnits
 * - WorkUnitDependencies
 * - ResourceCapacity
 * - RiskEvents
 * 
 * Run with: npx ts-node prisma/seeds/operations-control-seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Operations Control seed...\n');

  // Get first project to associate data with (any status)
  const project = await prisma.project.findFirst({
    select: { id: true, projectNumber: true, name: true },
  });

  if (!project) {
    console.log('❌ No project found. Please create a project first.');
    return;
  }

  // Get first user to use as owner
  const user = await prisma.user.findFirst({
    select: { id: true },
  });

  if (!user) {
    console.log('❌ No user found. Please create a user first.');
    return;
  }

  console.log(`📁 Using project: ${project.projectNumber} - ${project.name}\n`);

  // Clean existing test data
  console.log('🧹 Cleaning existing Operations Control data...');
  await prisma.riskEvent.deleteMany({});
  await prisma.workUnitDependency.deleteMany({});
  await prisma.workUnit.deleteMany({});
  await prisma.resourceCapacity.deleteMany({});
  console.log('✓ Cleaned existing data\n');

  // Create WorkUnits
  console.log('📦 Creating WorkUnits...');
  
  const today = new Date();
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // Generate dummy reference IDs
  const dummyRefId = () => crypto.randomUUID();

  const workUnits = await Promise.all([
    // Design phase - completed
    prisma.workUnit.create({
      data: {
        type: 'DESIGN',
        status: 'COMPLETED',
        projectId: project.id,
        ownerId: user.id,
        plannedStart: addDays(today, -30),
        plannedEnd: addDays(today, -20),
        actualStart: addDays(today, -30),
        actualEnd: addDays(today, -18),
        referenceModule: 'Task',
        referenceId: dummyRefId(),
      },
    }),
    // Procurement - in progress, slightly delayed
    prisma.workUnit.create({
      data: {
        type: 'PROCUREMENT',
        status: 'IN_PROGRESS',
        projectId: project.id,
        ownerId: user.id,
        plannedStart: addDays(today, -15),
        plannedEnd: addDays(today, -5),
        actualStart: addDays(today, -12), // Started 3 days late
        referenceModule: 'Task',
        referenceId: dummyRefId(),
      },
    }),
    // Production - blocked due to procurement delay
    prisma.workUnit.create({
      data: {
        type: 'PRODUCTION',
        status: 'BLOCKED',
        projectId: project.id,
        ownerId: user.id,
        plannedStart: addDays(today, -5),
        plannedEnd: addDays(today, 10),
        referenceModule: 'AssemblyPart',
        referenceId: dummyRefId(),
      },
    }),
    // Production - not started, at risk
    prisma.workUnit.create({
      data: {
        type: 'PRODUCTION',
        status: 'NOT_STARTED',
        projectId: project.id,
        ownerId: user.id,
        plannedStart: addDays(today, -2), // Should have started 2 days ago
        plannedEnd: addDays(today, 15),
        referenceModule: 'AssemblyPart',
        referenceId: dummyRefId(),
      },
    }),
    // QC - upcoming
    prisma.workUnit.create({
      data: {
        type: 'QC',
        status: 'NOT_STARTED',
        projectId: project.id,
        ownerId: user.id,
        plannedStart: addDays(today, 5),
        plannedEnd: addDays(today, 8),
        referenceModule: 'WeldingInspection',
        referenceId: dummyRefId(),
      },
    }),
    // Documentation - upcoming
    prisma.workUnit.create({
      data: {
        type: 'DOCUMENTATION',
        status: 'NOT_STARTED',
        projectId: project.id,
        ownerId: user.id,
        plannedStart: addDays(today, 10),
        plannedEnd: addDays(today, 12),
        referenceModule: 'DocumentSubmission',
        referenceId: dummyRefId(),
      },
    }),
  ]);

  console.log(`✓ Created ${workUnits.length} WorkUnits\n`);

  // Create Dependencies
  console.log('🔗 Creating Dependencies...');
  
  const [design, procurement, fabColumns, fabBeams, qcInspection, documentation] = workUnits;

  const dependencies = await Promise.all([
    // Procurement depends on Design (FS)
    prisma.workUnitDependency.create({
      data: {
        fromWorkUnitId: design.id,
        toWorkUnitId: procurement.id,
        dependencyType: 'FS',
        lagDays: 0,
      },
    }),
    // Fabrication Columns depends on Procurement (FS)
    prisma.workUnitDependency.create({
      data: {
        fromWorkUnitId: procurement.id,
        toWorkUnitId: fabColumns.id,
        dependencyType: 'FS',
        lagDays: 0,
      },
    }),
    // Fabrication Beams depends on Procurement (FS)
    prisma.workUnitDependency.create({
      data: {
        fromWorkUnitId: procurement.id,
        toWorkUnitId: fabBeams.id,
        dependencyType: 'FS',
        lagDays: 0,
      },
    }),
    // QC depends on Fabrication Columns (FS)
    prisma.workUnitDependency.create({
      data: {
        fromWorkUnitId: fabColumns.id,
        toWorkUnitId: qcInspection.id,
        dependencyType: 'FS',
        lagDays: 1, // 1 day lag for inspection prep
      },
    }),
    // Documentation depends on QC (FS)
    prisma.workUnitDependency.create({
      data: {
        fromWorkUnitId: qcInspection.id,
        toWorkUnitId: documentation.id,
        dependencyType: 'FS',
        lagDays: 0,
      },
    }),
  ]);

  console.log(`✓ Created ${dependencies.length} Dependencies\n`);

  // Create Resource Capacities
  console.log('⚙️ Creating Resource Capacities...');

  const resources = await Promise.all([
    prisma.resourceCapacity.create({
      data: {
        resourceType: 'WELDER',
        resourceName: 'Welding Team A',
        capacityPerDay: 8,
        unit: 'HOURS',
        workingDaysPerWeek: 6,
        isActive: true,
        notes: 'Primary welding team - 4 welders',
      },
    }),
    prisma.resourceCapacity.create({
      data: {
        resourceType: 'LASER',
        resourceName: 'Laser Cutting Machine 1',
        capacityPerDay: 10,
        unit: 'TONS',
        workingDaysPerWeek: 6,
        isActive: true,
        notes: 'Main laser cutting machine',
      },
    }),
    prisma.resourceCapacity.create({
      data: {
        resourceType: 'DESIGNER',
        resourceName: 'Design Team',
        capacityPerDay: 20,
        unit: 'DRAWINGS',
        workingDaysPerWeek: 5,
        isActive: true,
        notes: 'Shop drawing team - 4 designers',
      },
    }),
    prisma.resourceCapacity.create({
      data: {
        resourceType: 'QC',
        resourceName: 'QC Inspection Team',
        capacityPerDay: 8,
        unit: 'HOURS',
        workingDaysPerWeek: 6,
        isActive: true,
        notes: 'Quality control inspectors',
      },
    }),
  ]);

  console.log(`✓ Created ${resources.length} Resource Capacities\n`);

  // Create Risk Events
  console.log('⚠️ Creating Risk Events...');

  const risks = await Promise.all([
    // Critical delay risk
    prisma.riskEvent.create({
      data: {
        type: 'DELAY',
        severity: 'CRITICAL',
        reason: 'Material procurement delayed by 7 days due to supplier issues',
        recommendedAction: 'Expedite with alternative supplier or adjust downstream schedules',
        affectedProjectIds: [project.id],
        affectedWorkUnitIds: [procurement.id, fabColumns.id, fabBeams.id],
        fingerprint: `DELAY-CRITICAL-${project.id}-procurement-${Date.now()}`,
        metadata: {
          delayDays: 7,
          originalDeadline: addDays(today, -5).toISOString(),
          impactedMilestone: 'Fabrication Start',
        },
      },
    }),
    // High dependency risk
    prisma.riskEvent.create({
      data: {
        type: 'DEPENDENCY',
        severity: 'HIGH',
        reason: 'Fabrication blocked - waiting on material delivery',
        recommendedAction: 'Track material delivery daily, prepare fabrication setup in advance',
        affectedProjectIds: [project.id],
        affectedWorkUnitIds: [fabColumns.id],
        fingerprint: `DEPENDENCY-HIGH-${project.id}-fabColumns-${Date.now()}`,
        metadata: {
          blockedBy: 'Material Procurement',
          waitingDays: 5,
        },
      },
    }),
    // Medium delay risk
    prisma.riskEvent.create({
      data: {
        type: 'DELAY',
        severity: 'MEDIUM',
        reason: 'Beam fabrication has not started - 2 days past planned start',
        recommendedAction: 'Prioritize beam fabrication once materials arrive',
        affectedProjectIds: [project.id],
        affectedWorkUnitIds: [fabBeams.id],
        fingerprint: `DELAY-MEDIUM-${project.id}-fabBeams-${Date.now()}`,
        metadata: {
          delayDays: 2,
          plannedStart: addDays(today, -2).toISOString(),
        },
      },
    }),
    // Low bottleneck risk
    prisma.riskEvent.create({
      data: {
        type: 'BOTTLENECK',
        severity: 'LOW',
        reason: 'Welding team approaching capacity limit next week',
        recommendedAction: 'Consider overtime or additional welders if fabrication catches up',
        affectedProjectIds: [project.id],
        affectedWorkUnitIds: [],
        fingerprint: `BOTTLENECK-LOW-${project.id}-welding-${Date.now()}`,
        metadata: {
          resourceName: 'Welding Team A',
          projectedUtilization: 95,
        },
      },
    }),
  ]);

  console.log(`✓ Created ${risks.length} Risk Events\n`);

  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Operations Control seed completed successfully!\n');
  console.log('Summary:');
  console.log(`  - WorkUnits: ${workUnits.length}`);
  console.log(`  - Dependencies: ${dependencies.length}`);
  console.log(`  - Resource Capacities: ${resources.length}`);
  console.log(`  - Risk Events: ${risks.length}`);
  console.log('\nView the Operations Control dashboard at:');
  console.log('  http://localhost:3000/operations-control');
  console.log('═══════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
