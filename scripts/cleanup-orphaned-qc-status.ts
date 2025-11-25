import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOrphanedQCStatus() {
  console.log('Starting cleanup of orphaned QC statuses...');

  // Find all production logs with QC status but no corresponding RFI
  const productionLogs = await prisma.productionLog.findMany({
    where: {
      OR: [
        { qcStatus: 'Pending Inspection' },
        { qcStatus: 'Approved' },
        { qcStatus: 'Rejected' },
      ],
    },
    include: {
      rfiProductionLogs: {
        include: {
          rfiRequest: true,
        },
      },
    },
  });

  console.log(`Found ${productionLogs.length} production logs with QC status`);

  let resetCount = 0;
  let keptCount = 0;

  for (const log of productionLogs) {
    // Check if this production log has any active RFIs
    const hasActiveRFI = log.rfiProductionLogs.length > 0;

    if (!hasActiveRFI) {
      // No RFI found - reset the status
      await prisma.productionLog.update({
        where: { id: log.id },
        data: {
          qcStatus: 'Not Required',
          qcRequired: false,
        },
      });
      console.log(`  ✓ Reset production log ${log.id} (no RFI found)`);
      resetCount++;
    } else {
      console.log(`  ○ Kept production log ${log.id} (has ${log.rfiProductionLogs.length} RFI(s))`);
      keptCount++;
    }
  }

  console.log(`\n✅ Cleanup completed!`);
  console.log(`   Reset: ${resetCount} production logs`);
  console.log(`   Kept: ${keptCount} production logs (with active RFIs)`);
}

cleanupOrphanedQCStatus()
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
