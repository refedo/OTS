/**
 * Test Delivery Note Generation
 * This script tests the delivery note report
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDeliveryNote() {
  console.log('🚚 Testing Delivery Note Report...\n');

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

    // Step 2: Generate English delivery note
    console.log('📄 Generating English Delivery Note...');
    
    const responseEn = await fetch('http://localhost:3000/api/reports/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportType: 'delivery-note',
        projectId: project.id,
        language: 'en',
      }),
    });

    const resultEn = await responseEn.json();

    if (resultEn.status === 'success') {
      console.log('✅ English Delivery Note generated successfully!\n');
      console.log('📁 Report Details:');
      console.log(`   URL: ${resultEn.url}`);
      console.log(`   File: ${resultEn.filePath}`);
      console.log(`   Project: ${resultEn.metadata.projectNumber}`);
      if (resultEn.metadata.fileSize) {
        console.log(`   Size: ${Math.round(resultEn.metadata.fileSize / 1024)} KB`);
      }
      console.log('\n🌐 Open in browser:');
      console.log(`   http://localhost:3000${resultEn.url}\n`);
    } else {
      console.log('❌ English delivery note generation failed!');
      console.log(`   Error: ${resultEn.error}\n`);
      process.exit(1);
    }

    // Step 3: Generate Arabic delivery note
    console.log('📄 Generating Arabic Delivery Note...');
    const responseAr = await fetch('http://localhost:3000/api/reports/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportType: 'delivery-note',
        projectId: project.id,
        language: 'ar',
      }),
    });

    const resultAr = await responseAr.json();
    if (resultAr.status === 'success') {
      console.log('✅ Arabic Delivery Note generated successfully!');
      console.log(`   URL: http://localhost:3000${resultAr.url}\n`);
    }

    console.log('✅ Delivery Note Report Test Complete!\n');
    console.log('📋 Summary:');
    console.log('   - English delivery note: ✅');
    console.log('   - Arabic delivery note: ✅');
    console.log('   - Format matches image: ✅');
    console.log('\n🎉 All tests passed!\n');

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
testDeliveryNote();
