const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkEvents() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    console.log('📊 Checking events in database...\n');
    const [events] = await connection.execute(`
      SELECT 
        e.id,
        e.projectId,
        e.stage,
        e.eventDate,
        e.status,
        p.projectNumber,
        p.name as projectName
      FROM operationevent e
      LEFT JOIN project p ON e.projectId = p.id
      ORDER BY e.eventDate DESC
      LIMIT 10
    `);
    
    if (events.length === 0) {
      console.log('❌ No events found in database!');
    } else {
      console.log(`✅ Found ${events.length} events:\n`);
      events.forEach((event, index) => {
        console.log(`${index + 1}. ${event.projectNumber} - ${event.projectName}`);
        console.log(`   Stage: ${event.stage}`);
        console.log(`   Date: ${new Date(event.eventDate).toLocaleDateString()}`);
        console.log(`   Status: ${event.status}\n`);
      });
    }
    
    // Check stages
    console.log('\n📋 Checking stages...');
    const [stages] = await connection.execute('SELECT stageCode, stageName FROM operationstageconfig ORDER BY orderIndex');
    console.log(`Found ${stages.length} stages configured\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkEvents();
