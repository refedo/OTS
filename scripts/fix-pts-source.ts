/**
 * Script to fix PTS-imported assembly parts that are missing the source field
 * 
 * Run with: npx ts-node scripts/fix-pts-source.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPtsSource() {
  console.log('Starting PTS source fix...');

  // Update all assembly parts that have a part designation matching PTS format (e.g., "254-Z8T-CO2")
  // These are parts imported from PTS that should have source = 'PTS'
  const result = await prisma.assemblyPart.updateMany({
    where: {
      partDesignation: {
        contains: '-',
      },
      OR: [
        { source: null },
        { source: '' },
      ],
    },
    data: {
      source: 'PTS',
    },
  });

  console.log(`Updated ${result.count} assembly parts with source = 'PTS'`);

  // Update production logs that have externalRef starting with PTS- but source is OTS
  const logResult = await prisma.productionLog.updateMany({
    where: {
      externalRef: {
        startsWith: 'PTS-',
      },
      source: 'OTS',
    },
    data: {
      source: 'PTS',
    },
  });

  console.log(`Updated ${logResult.count} production logs with source = 'PTS'`);

  console.log('PTS source fix complete!');
}

fixPtsSource()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
