const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPermissions() {
  try {
    console.log('Checking and fixing permissions...\n');
    
    // Get all users with their roles
    const users = await prisma.user.findMany({
      include: {
        role: true
      }
    });
    
    console.log(`Found ${users.length} users\n`);
    
    for (const user of users) {
      console.log(`\n📋 User: ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role.name}`);
      console.log(`   Custom Permissions:`, user.customPermissions);
      console.log(`   Type:`, typeof user.customPermissions);
      console.log(`   Is Array?`, Array.isArray(user.customPermissions));
      
      // Fix customPermissions if it's not an array or null
      if (user.customPermissions !== null && !Array.isArray(user.customPermissions)) {
        console.log(`   ⚠️  FIXING: customPermissions is not an array, setting to null`);
        await prisma.user.update({
          where: { id: user.id },
          data: { customPermissions: null }
        });
        console.log(`   ✅ Fixed`);
      }
    }
    
    console.log('\n\n📋 Checking roles...\n');
    
    // Get all roles
    const roles = await prisma.role.findMany();
    
    for (const role of roles) {
      console.log(`\n📋 Role: ${role.name}`);
      console.log(`   Permissions:`, role.permissions);
      console.log(`   Type:`, typeof role.permissions);
      console.log(`   Is Array?`, Array.isArray(role.permissions));
      
      // Fix role permissions if it's not an array
      if (role.permissions !== null && !Array.isArray(role.permissions)) {
        console.log(`   ⚠️  FIXING: permissions is not an array, setting to empty array`);
        await prisma.role.update({
          where: { id: role.id },
          data: { permissions: [] }
        });
        console.log(`   ✅ Fixed`);
      }
    }
    
    console.log('\n\n✅ Done! All permissions have been checked and fixed.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPermissions();
