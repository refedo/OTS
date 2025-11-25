import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillRFINumbers() {
  console.log('Starting RFI number backfill...');

  // Get all RFIs without RFI numbers, ordered by creation date
  const rfis = await prisma.rFIRequest.findMany({
    where: {
      rfiNumber: null,
    },
    orderBy: {
      requestDate: 'asc',
    },
  });

  console.log(`Found ${rfis.length} RFIs without numbers`);

  if (rfis.length === 0) {
    console.log('No RFIs to backfill. All done!');
    return;
  }

  // Group RFIs by year
  const rfisByYear: Record<number, typeof rfis> = {};
  rfis.forEach((rfi) => {
    const year = new Date(rfi.requestDate).getFullYear();
    if (!rfisByYear[year]) {
      rfisByYear[year] = [];
    }
    rfisByYear[year].push(rfi);
  });

  let totalUpdated = 0;

  // Process each year
  for (const [year, yearRfis] of Object.entries(rfisByYear)) {
    console.log(`\nProcessing ${yearRfis.length} RFIs for year ${year}...`);

    // Check if there are already RFIs with numbers for this year
    const lastRFI = await prisma.rFIRequest.findFirst({
      where: {
        rfiNumber: {
          startsWith: `RFI-${year}-`,
        },
      },
      orderBy: {
        rfiNumber: 'desc',
      },
    });

    let startNumber = 1;
    if (lastRFI && lastRFI.rfiNumber) {
      const lastNumber = parseInt(lastRFI.rfiNumber.split('-')[2]);
      startNumber = lastNumber + 1;
      console.log(`Last RFI number for ${year}: ${lastRFI.rfiNumber}, starting from ${startNumber}`);
    }

    // Update each RFI
    for (let i = 0; i < yearRfis.length; i++) {
      const rfi = yearRfis[i];
      const rfiNumber = `RFI-${year}-${(startNumber + i).toString().padStart(4, '0')}`;

      await prisma.rFIRequest.update({
        where: { id: rfi.id },
        data: { rfiNumber },
      });

      console.log(`  ✓ Updated RFI ${rfi.id} -> ${rfiNumber}`);
      totalUpdated++;
    }
  }

  console.log(`\n✅ Successfully backfilled ${totalUpdated} RFI numbers!`);
}

backfillRFINumbers()
  .catch((error) => {
    console.error('Error backfilling RFI numbers:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
