import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateRFIToManyToMany() {
  console.log('Starting RFI migration to many-to-many relationship...');

  // Get all existing RFIs with their production logs
  const rfis = await prisma.rFIRequest.findMany({
    include: {
      productionLog: {
        select: {
          id: true,
          processType: true,
        },
      },
    },
  });

  console.log(`Found ${rfis.length} RFIs to migrate`);

  let migratedCount = 0;
  let errorCount = 0;

  for (const rfi of rfis) {
    try {
      // Update processType from production log
      if (rfi.productionLog && !rfi.processType) {
        await prisma.rFIRequest.update({
          where: { id: rfi.id },
          data: {
            processType: rfi.productionLog.processType,
          },
        });
        console.log(`  ✓ Updated RFI ${rfi.rfiNumber || rfi.id} with processType: ${rfi.productionLog.processType}`);
      }

      // Create junction table entry for existing production log
      const existingJunction = await prisma.rFIProductionLog.findFirst({
        where: {
          rfiRequestId: rfi.id,
          productionLogId: rfi.productionLogId,
        },
      });

      if (!existingJunction) {
        await prisma.rFIProductionLog.create({
          data: {
            rfiRequestId: rfi.id,
            productionLogId: rfi.productionLogId,
          },
        });
        console.log(`  ✓ Created junction entry for RFI ${rfi.rfiNumber || rfi.id}`);
      }

      migratedCount++;
    } catch (error) {
      console.error(`  ✗ Error migrating RFI ${rfi.id}:`, error);
      errorCount++;
    }
  }

  console.log(`\n✅ Migration completed!`);
  console.log(`   Successfully migrated: ${migratedCount} RFIs`);
  if (errorCount > 0) {
    console.log(`   Errors: ${errorCount} RFIs`);
  }
}

migrateRFIToManyToMany()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
