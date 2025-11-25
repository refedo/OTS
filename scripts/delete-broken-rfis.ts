import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteBrokenRFIs() {
  console.log('Starting deletion of broken RFIs...');

  // Find all RFIs without production log links
  const rfis = await prisma.rFIRequest.findMany({
    include: {
      productionLogs: true,
    },
  });

  console.log(`Found ${rfis.length} total RFIs`);

  const brokenRFIs = rfis.filter(rfi => rfi.productionLogs.length === 0);
  console.log(`Found ${brokenRFIs.length} broken RFIs (no production logs linked)`);

  if (brokenRFIs.length === 0) {
    console.log('No broken RFIs to delete. All RFIs are properly linked!');
    return;
  }

  console.log('\nDeleting broken RFIs...');
  let deletedCount = 0;

  for (const rfi of brokenRFIs) {
    try {
      await prisma.rFIRequest.delete({
        where: { id: rfi.id },
      });
      console.log(`  ✓ Deleted RFI ${rfi.rfiNumber || rfi.id}`);
      deletedCount++;
    } catch (error) {
      console.error(`  ✗ Failed to delete RFI ${rfi.rfiNumber || rfi.id}:`, error);
    }
  }

  console.log(`\n✅ Deletion completed!`);
  console.log(`   Deleted: ${deletedCount} broken RFIs`);
  console.log(`   Remaining: ${rfis.length - deletedCount} valid RFIs`);
}

deleteBrokenRFIs()
  .catch((error) => {
    console.error('Deletion failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
