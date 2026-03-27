const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkEvents() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    console.log('📊 Checking system_events table...\n');
    
    // Check if table exists
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'system_events'
    `);
    
    if (tables.length === 0) {
      console.log('❌ system_events table does not exist!');
      return;
    }
    
    console.log('✅ system_events table exists\n');
    
    // Count total events
    const [countResult] = await connection.execute(`
      SELECT COUNT(*) as total FROM system_events
    `);
    console.log(`Total events: ${countResult[0].total}\n`);
    
    if (countResult[0].total === 0) {
      console.log('❌ No events found in system_events table!');
      console.log('💡 Events should be created automatically on user actions (login, project creation, etc.)');
      return;
    }
    
    // Get recent events
    const [events] = await connection.execute(`
      SELECT 
        id,
        eventType,
        eventCategory,
        severity,
        title,
        summary,
        userName,
        projectNumber,
        createdAt
      FROM system_events
      ORDER BY createdAt DESC
      LIMIT 10
    `);
    
    console.log(`✅ Found ${events.length} recent events:\n`);
    events.forEach((event, index) => {
      console.log(`${index + 1}. [${event.severity}] ${event.eventType}`);
      console.log(`   Title: ${event.title}`);
      console.log(`   User: ${event.userName || 'system'}`);
      console.log(`   Time: ${new Date(event.createdAt).toLocaleString()}\n`);
    });
    
    // Count by severity
    const [bySeverity] = await connection.execute(`
      SELECT severity, COUNT(*) as count
      FROM system_events
      GROUP BY severity
      ORDER BY count DESC
    `);
    
    console.log('📊 Events by severity:');
    bySeverity.forEach(row => {
      console.log(`   ${row.severity}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkEvents();
