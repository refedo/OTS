/**
 * Script to delete all assembly parts and production logs for testing PTS import
 * 
 * Run with: npx ts-node scripts/clear-pts-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearPtsData() {
  console.log('Starting data cleanup...');

  // Delete production logs first (due to foreign key constraints)
  const logsDeleted = await prisma.productionLog.deleteMany({});
  console.log(`Deleted ${logsDeleted.count} production logs`);

  // Delete assembly parts
  const partsDeleted = await prisma.assemblyPart.deleteMany({});
  console.log(`Deleted ${partsDeleted.count} assembly parts`);

  console.log('Data cleanup complete!');
}

clearPtsData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
