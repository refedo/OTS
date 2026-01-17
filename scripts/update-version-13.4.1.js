const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Updating system version to 13.4.1...');
    
    // Create a new system version record
    const version = await prisma.systemVersion.create({
      data: {
        version: '13.4.1',
        deployedBy: 'System',
        gitCommit: 'Planning enhancements and bug fixes',
        migrationName: 'add_division_to_scope_schedule',
        status: 'SUCCESS',
      }
    });
    
    console.log('✅ System version updated successfully!');
    console.log('Version:', version.version);
    console.log('Deployed at:', version.deployedAt);
    
  } catch (error) {
    console.error('❌ Failed to update system version:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
