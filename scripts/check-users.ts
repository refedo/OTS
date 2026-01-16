import prisma from '../src/lib/db';

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        role: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('\n=== Users in Database ===');
    console.log(`Total users: ${users.length}\n`);

    if (users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('Run: npx tsx prisma/seed.ts\n');
    } else {
      users.forEach(user => {
        console.log(`Name: ${user.name}`);
        console.log(`Email: ${user.email}`);
        console.log(`Status: ${user.status}`);
        console.log(`Role: ${user.role?.name || 'No role'}`);
        console.log('---');
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error checking users:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkUsers();
