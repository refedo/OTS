/**
 * Test Report Generation
 * This script tests the Hexa Reporting Engine by generating a sample report
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testReportGeneration() {
  console.log('🔍 Testing Hexa Reporting Engine...\n');

  try {
    // Step 1: Get a project from database
    console.log('📊 Fetching a project from database...');
    const project = await prisma.project.findFirst({
      select: {
        id: true,
        projectNumber: true,
        name: true,
      },
    });

    if (!project) {
      console.log('❌ No projects found in database');
      console.log('   Please create a project first\n');
      process.exit(1);
    }

    console.log(`✅ Found project: ${project.projectNumber} - ${project.name}`);
    console.log(`   Project ID: ${project.id}\n`);

    // Step 2: Generate report
    console.log('📄 Generating PDF report...');
    
    const response = await fetch('http://localhost:3000/api/reports/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportType: 'project-summary',
        projectId: project.id,
        language: 'en',
      }),
    });

    const result = await response.json();

    if (result.status === 'success') {
      console.log('✅ Report generated successfully!\n');
      console.log('📁 Report Details:');
      console.log(`   URL: ${result.url}`);
      console.log(`   File: ${result.filePath}`);
      console.log(`   Project: ${result.metadata.projectNumber}`);
      console.log(`   Language: ${result.metadata.language}`);
      console.log(`   Generated: ${result.metadata.generatedAt}`);
      if (result.metadata.fileSize) {
        console.log(`   Size: ${Math.round(result.metadata.fileSize / 1024)} KB`);
      }
      console.log('\n🌐 Open in browser:');
      console.log(`   http://localhost:3000${result.url}\n`);
      
      // Test Arabic report
      console.log('📄 Generating Arabic report...');
      const responseAr = await fetch('http://localhost:3000/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: 'project-summary',
          projectId: project.id,
          language: 'ar',
        }),
      });

      const resultAr = await responseAr.json();
      if (resultAr.status === 'success') {
        console.log('✅ Arabic report generated successfully!');
        console.log(`   URL: http://localhost:3000${resultAr.url}\n`);
      }
      
    } else {
      console.log('❌ Report generation failed!');
      console.log(`   Error: ${result.error}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure:');
    console.error('1. Dev server is running (npm run dev)');
    console.error('2. Database is accessible');
    console.error('3. Puppeteer is installed correctly\n');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testReportGeneration();
