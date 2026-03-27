const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function testSystemEvents() {
  try {
    console.log('Creating test system events...\n');

    // Create a few test events
    const events = [
      {
        id: uuidv4(),
        eventType: 'SYSTEM_TEST',
        eventCategory: 'SYSTEM',
        category: 'system',
        severity: 'INFO',
        title: 'System Events Test',
        summary: 'Testing system events functionality',
        details: { test: true, timestamp: new Date().toISOString() },
        userId: null,
        userName: null,
      },
      {
        id: uuidv4(),
        eventType: 'AUTH_LOGIN_SUCCESS',
        eventCategory: 'AUTH',
        category: 'auth',
        severity: 'INFO',
        title: 'Test login event',
        summary: 'User test logged in successfully',
        userName: 'Test User',
        userId: null,
      },
      {
        id: uuidv4(),
        eventType: 'PROJECT_CREATED',
        eventCategory: 'PROJECT',
        category: 'project',
        severity: 'INFO',
        title: 'Test project created',
        summary: 'Project TEST-001 was created',
        projectNumber: 'TEST-001',
        userName: 'Test User',
        userId: null,
      },
    ];

    for (const event of events) {
      await prisma.systemEvent.create({ data: event });
      console.log(`✓ Created: ${event.eventType}`);
    }

    console.log('\n✅ Test events created successfully!');
    console.log('\nFetching events...\n');

    const allEvents = await prisma.systemEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log(`Found ${allEvents.length} events:\n`);
    allEvents.forEach((e, i) => {
      console.log(`${i + 1}. [${e.severity}] ${e.eventType}`);
      console.log(`   ${e.title}`);
      console.log(`   ${new Date(e.createdAt).toLocaleString()}\n`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testSystemEvents();
