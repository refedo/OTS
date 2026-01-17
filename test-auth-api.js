const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAuthAPI() {
  try {
    // Get the System Admin user
    const user = await prisma.user.findUnique({
      where: { email: 'admin@hexa.local' },
      include: { role: true, department: true }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User:', user.name);
    console.log('Role:', user.role.name);
    console.log('Custom Permissions:', user.customPermissions);
    console.log('Role Permissions type:', typeof user.role.permissions);
    console.log('Role Permissions is array:', Array.isArray(user.role.permissions));
    console.log('Role Permissions count:', user.role.permissions ? user.role.permissions.length : 0);
    
    // Simulate the API logic
    let permissions = [];
    
    if (user.customPermissions) {
      if (Array.isArray(user.customPermissions)) {
        permissions = user.customPermissions;
      }
    } else if (user.role.permissions) {
      if (Array.isArray(user.role.permissions)) {
        permissions = user.role.permissions;
      }
    }
    
    console.log('\nFinal permissions array:', permissions);
    console.log('Permissions count:', permissions.length);
    console.log('First 5 permissions:', permissions.slice(0, 5));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthAPI();
