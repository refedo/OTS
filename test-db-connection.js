// Quick test to check database connection and data
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('Testing database connection...\n');
    
    // Test Projects
    const projectCount = await prisma.project.count();
    console.log(`✓ Projects table accessible: ${projectCount} records found`);
    
    if (projectCount > 0) {
      const sampleProject = await prisma.project.findFirst({
        select: { id: true, projectNumber: true, name: true }
      });
      console.log(`  Sample: ${sampleProject.projectNumber} - ${sampleProject.name}`);
    }
    
    // Test Assembly Parts
    const partsCount = await prisma.assemblyPart.count();
    console.log(`✓ AssemblyPart table accessible: ${partsCount} records found`);
    
    if (partsCount > 0) {
      const samplePart = await prisma.assemblyPart.findFirst({
        select: { id: true, partDesignation: true, name: true }
      });
      console.log(`  Sample: ${samplePart.partDesignation} - ${samplePart.name}`);
    }
    
    // Test Initiatives
    const initiativesCount = await prisma.initiative.count();
    console.log(`✓ Initiative table accessible: ${initiativesCount} records found`);
    
    console.log('\n✅ Database connection successful!');
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
