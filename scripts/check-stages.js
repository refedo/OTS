const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkStages() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    console.log('📊 Checking stages in database...\n');
    const [rows] = await connection.execute('SELECT * FROM operationstageconfig ORDER BY orderIndex ASC');
    
    if (rows.length === 0) {
      console.log('❌ No stages found in database!');
    } else {
      console.log(`✅ Found ${rows.length} stages:\n`);
      rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.stageName} (${row.stageCode}) - Order: ${row.orderIndex}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkStages();
