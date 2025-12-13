const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const now = new Date();
  console.log('Current date:', now);
  
  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      status: { not: 'Completed' }
    },
    take: 10
  });
  
  console.log('Delayed tasks found:', tasks.length);
  tasks.forEach(t => {
    console.log('-', t.title);
    console.log('  Due:', t.dueDate);
    console.log('  Status:', t.status);
  });
  
  await prisma.$disconnect();
}

test();
