// Test API endpoints to see if they're working
const http = require('http');

async function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`\n${description}`);
        console.log(`Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            if (Array.isArray(json)) {
              console.log(`✓ Returned ${json.length} items`);
            } else {
              console.log(`✓ Returned data:`, Object.keys(json));
            }
          } catch (e) {
            console.log(`Response: ${data.substring(0, 200)}`);
          }
        } else {
          console.log(`❌ Error: ${data.substring(0, 200)}`);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`\n${description}`);
      console.log(`❌ Connection error: ${error.message}`);
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing API Endpoints...');
  console.log('Note: These tests will fail with 401 if not authenticated\n');
  
  await testEndpoint('/api/projects', 'Test 1: GET /api/projects');
  await testEndpoint('/api/production/assembly-parts', 'Test 2: GET /api/production/assembly-parts');
  await testEndpoint('/api/initiatives', 'Test 3: GET /api/initiatives');
  
  console.log('\n✅ Tests complete!');
  console.log('\nIf you see 401 errors, the API requires authentication.');
  console.log('Try accessing these URLs in your browser while logged in:');
  console.log('  - http://localhost:3000/api/projects');
  console.log('  - http://localhost:3000/api/production/assembly-parts');
}

runTests();
