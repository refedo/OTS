import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedKPIs() {
  console.log('🌱 Seeding KPI definitions...');

  // Get admin user (or first user)
  const admin = await prisma.user.findFirst({
    include: { role: true },
  });

  if (!admin) {
    console.error('❌ No users found. Please create users first.');
    return;
  }

  console.log(`✓ Using user: ${admin.name} (${admin.role.name})`);

  // Define sample KPIs
  const kpiDefinitions = [
    {
      code: 'PROD_PRODUCTIVITY',
      name: 'Production Productivity',
      description: 'Tons produced per man-hour - measures production efficiency',
      formula: '{PRODUCTION.PROCESSED_TONS_30D} / {PRODUCTION.MAN_HOURS_30D}',
      sourceModules: ['production'],
      frequency: 'monthly',
      weight: 15,
      target: 0.5,
      unit: 'tons/hr',
      calculationType: 'auto',
      isActive: true,
    },
    {
      code: 'QC_NCR_CLOSURE',
      name: 'NCR Closure Rate',
      description: 'Percentage of NCRs closed within period - measures quality response time',
      formula: '({QC.NCR_CLOSED_COUNT} / {QC.NCR_TOTAL_COUNT}) * 100',
      sourceModules: ['qc'],
      frequency: 'monthly',
      weight: 20,
      target: 90,
      unit: '%',
      calculationType: 'auto',
      isActive: true,
    },
    {
      code: 'PROJECT_ON_TIME',
      name: 'On-Time Project Completion',
      description: 'Percentage of projects completed on schedule - measures project management effectiveness',
      formula: '({PROJECT.COMPLETED_ON_TIME} / {PROJECT.COMPLETED_TOTAL}) * 100',
      sourceModules: ['projects'],
      frequency: 'monthly',
      weight: 25,
      target: 85,
      unit: '%',
      calculationType: 'auto',
      isActive: true,
    },
    {
      code: 'QC_RFI_APPROVAL',
      name: 'RFI Approval Rate',
      description: 'Percentage of RFIs approved - measures quality compliance',
      formula: '({QC.RFI_APPROVED_COUNT} / {QC.RFI_TOTAL_COUNT}) * 100',
      sourceModules: ['qc'],
      frequency: 'weekly',
      weight: 15,
      target: 95,
      unit: '%',
      calculationType: 'auto',
      isActive: true,
    },
    {
      code: 'PLANNING_ADHERENCE',
      name: 'Phase Schedule Adherence',
      description: 'Percentage of phases completed on time - measures planning accuracy',
      formula: '{PLANNING.PHASE_ADHERENCE}',
      sourceModules: ['projects', 'planning'],
      frequency: 'monthly',
      weight: 20,
      target: 80,
      unit: '%',
      calculationType: 'auto',
      isActive: true,
    },
    {
      code: 'PROD_OUTPUT',
      name: 'Production Output',
      description: 'Total production logs created - measures production activity',
      formula: '{PRODUCTION.LOGS_COUNT}',
      sourceModules: ['production'],
      frequency: 'weekly',
      weight: 10,
      target: 100,
      unit: 'logs',
      calculationType: 'auto',
      isActive: true,
    },
    {
      code: 'QC_NCR_RATE',
      name: 'NCR Generation Rate',
      description: 'Number of NCRs opened - lower is better, measures quality issues',
      formula: '{QC.NCR_OPEN_COUNT}',
      sourceModules: ['qc'],
      frequency: 'weekly',
      weight: 15,
      target: 5,
      unit: 'NCRs',
      calculationType: 'auto',
      isActive: true,
    },
    {
      code: 'PROJECT_ACTIVE',
      name: 'Active Projects',
      description: 'Number of active projects - measures workload',
      formula: '{PROJECT.ACTIVE_COUNT}',
      sourceModules: ['projects'],
      frequency: 'daily',
      weight: 5,
      target: 10,
      unit: 'projects',
      calculationType: 'auto',
      isActive: true,
    },
  ];

  // Create KPI definitions
  for (const kpi of kpiDefinitions) {
    try {
      // Check if already exists
      const existing = await prisma.kPIDefinition.findUnique({
        where: { code: kpi.code },
      });

      if (existing) {
        console.log(`⏭️  Skipping ${kpi.code} (already exists)`);
        continue;
      }

      const created = await prisma.kPIDefinition.create({
        data: {
          ...kpi,
          createdById: admin.id,
          updatedById: admin.id,
        },
      });

      // Log creation in history
      await prisma.kPIHistory.create({
        data: {
          kpiId: created.id,
          action: 'definition_created',
          payload: {
            code: created.code,
            name: created.name,
            formula: created.formula,
            seeded: true,
          },
          performedBy: admin.id,
        },
      });

      console.log(`✓ Created KPI: ${kpi.name} (${kpi.code})`);
    } catch (error) {
      console.error(`✗ Failed to create ${kpi.code}:`, error);
    }
  }

  console.log('\n📊 KPI Definitions Summary:');
  const allKPIs = await prisma.kPIDefinition.findMany({
    select: {
      code: true,
      name: true,
      frequency: true,
      target: true,
      unit: true,
      isActive: true,
    },
  });

  console.table(allKPIs);

  console.log('\n✅ KPI seeding complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Trigger initial calculation: POST /api/kpi/recalculate');
  console.log('2. View dashboard: /kpi/dashboard');
  console.log('3. Manage KPIs: /kpi/definitions');
}

seedKPIs()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
