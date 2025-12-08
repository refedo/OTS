/**
 * Quick test script to verify API routes are working
 * Run with: node test-api-routes.js
 * 
 * Make sure your dev server is running first!
 */

const projectId = '558f59cf-cfe8-4cac-acd7-416d98054f15'; // Replace with actual project ID

const endpoints = [
  'summary',
  'wps',
  'itp',
  'production',
  'qc',
  'buildings',
  'documents',
  'tasks'
];

async function testEndpoint(endpoint) {
  const url = `http://localhost:3000/api/projects/${projectId}/${endpoint}`;
  try {
    const response = await fetch(url);
    const status = response.status;
    const statusText = response.statusText;
    
    if (response.ok) {
      console.log(`✅ ${endpoint.padEnd(15)} - ${status} ${statusText}`);
    } else {
      console.log(`❌ ${endpoint.padEnd(15)} - ${status} ${statusText}`);
    }
  } catch (error) {
    console.log(`❌ ${endpoint.padEnd(15)} - ERROR: ${error.message}`);
  }
}

async function testAll() {
  console.log('\n🧪 Testing Project Dashboard API Routes...\n');
  console.log(`Project ID: ${projectId}\n`);
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n✨ Test complete!\n');
}

testAll();
