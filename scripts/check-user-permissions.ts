/**
 * Diagnostic script to check user permissions
 * Usage: npx tsx scripts/check-user-permissions.ts <user-email>
 */

import prisma from '../src/lib/db';

async function checkUserPermissions(email: string) {
  console.log(`\n🔍 Checking permissions for user: ${email}\n`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { 
      role: true,
      department: true 
    }
  });

  if (!user) {
    console.error('❌ User not found');
    process.exit(1);
  }

  console.log('👤 User Details:');
  console.log(`   Name: ${user.name}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Role: ${user.role.name}`);
  console.log(`   Department: ${user.department?.name || 'None'}`);
  console.log(`   isAdmin: ${user.isAdmin}`);
  console.log('');

  // Check permissions
  let permissions: string[] = [];

  if (user.isAdmin) {
    console.log('✅ User is Admin - has ALL permissions');
  } else {
    // Check custom permissions
    const customPerms = user.customPermissions as Record<string, unknown> | null;
    if (customPerms && Array.isArray(customPerms.permissions)) {
      permissions = customPerms.permissions as string[];
      console.log('📋 Using CUSTOM permissions:');
    } else if (user.role.permissions && Array.isArray(user.role.permissions)) {
      permissions = user.role.permissions as string[];
      console.log('📋 Using ROLE permissions:');
    } else {
      console.log('⚠️  No permissions found!');
    }

    console.log(`   Total permissions: ${permissions.length}`);
    console.log('');

    // Check for projects.create specifically
    const hasProjectsCreate = permissions.includes('projects.create');
    console.log(`🎯 Has 'projects.create': ${hasProjectsCreate ? '✅ YES' : '❌ NO'}`);
    
    if (!hasProjectsCreate) {
      console.log('\n⚠️  User does NOT have projects.create permission!');
      console.log('   This is why "Create Project" is not showing in the sidebar.\n');
      
      // Show all project-related permissions
      const projectPerms = permissions.filter(p => p.startsWith('projects.'));
      console.log('📦 Project-related permissions user HAS:');
      if (projectPerms.length > 0) {
        projectPerms.forEach(p => console.log(`   - ${p}`));
      } else {
        console.log('   (none)');
      }
    }

    // Check restricted modules
    const restrictedModules = (user.role.restrictedModules as string[]) || [];
    if (restrictedModules.length > 0) {
      console.log('\n🚫 Restricted Modules:');
      restrictedModules.forEach(m => console.log(`   - ${m}`));
    }

    // Show first 20 permissions
    console.log('\n📜 First 20 permissions:');
    permissions.slice(0, 20).forEach(p => console.log(`   - ${p}`));
    if (permissions.length > 20) {
      console.log(`   ... and ${permissions.length - 20} more`);
    }
  }

  await prisma.$disconnect();
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx tsx scripts/check-user-permissions.ts <user-email>');
  process.exit(1);
}

checkUserPermissions(email).catch(console.error);
