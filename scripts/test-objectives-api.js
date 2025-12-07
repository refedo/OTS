// Test script to diagnose objectives API issue
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testObjectivesQuery() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✓ Database connected');

    // Test if CompanyObjective table exists
    console.log('\nTesting CompanyObjective table...');
    const count = await prisma.companyObjective.count();
    console.log(`✓ CompanyObjective table exists with ${count} records`);

    // Test the exact query from the API
    console.log('\nTesting full query with includes...');
    const objectives = await prisma.companyObjective.findMany({
      where: { year: 2025 },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        keyResults: {
          include: {
            progressUpdates: {
              orderBy: { recordedDate: 'desc' },
              take: 1,
            },
          },
        },
        _count: {
          select: {
            keyResults: true,
            initiatives: true,
            departmentObjectives: true,
            kpis: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });

    console.log(`✓ Query successful, found ${objectives.length} objectives for 2025`);
    
    if (objectives.length > 0) {
      console.log('\nSample objective:');
      console.log(JSON.stringify(objectives[0], null, 2));
    }

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testObjectivesQuery();
