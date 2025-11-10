// Test the API endpoint
async function testAPI() {
  try {
    console.log('🧪 Testing /api/operations/stages endpoint...\n');
    
    const response = await fetch('http://localhost:3000/api/operations/stages', {
      headers: {
        'Cookie': 'ots_session=your_session_token_here' // You'll need to get this from browser
      }
    });
    
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success! Found ${data.length} stages:\n`);
      data.forEach((stage, index) => {
        console.log(`${index + 1}. ${stage.stageName} (${stage.stageCode})`);
      });
    } else {
      const error = await response.json();
      console.log('❌ Error:', error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
