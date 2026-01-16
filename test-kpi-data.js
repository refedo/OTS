// Quick test to check if KPI data exists
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkKPIData() {
  try {
    console.log('🔍 Checking KPI data in database...\n');

    // Check KPI Definitions
    const kpis = await prisma.kPIDefinition.findMany({
      select: {
        code: true,
        name: true,
        frequency: true,
        target: true,
        unit: true,
        isActive: true,
      },
    });

    console.log(`✅ Found ${kpis.length} KPI definitions:\n`);
    
    if (kpis.length === 0) {
      console.log('❌ No KPI definitions found!');
      console.log('Run: npx ts-node prisma/seed-kpi.ts');
    } else {
      console.table(kpis);
    }

    // Check KPI Scores
    const scores = await prisma.kPIScore.count();
    console.log(`\n📊 KPI Scores: ${scores}`);

    // Check KPI Alerts
    const alerts = await prisma.kPIAlert.count();
    console.log(`🚨 KPI Alerts: ${alerts}`);

    // Check KPI Manual Entries
    const manualEntries = await prisma.kPIManualEntry.count();
    console.log(`📝 Manual Entries: ${manualEntries}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkKPIData();
