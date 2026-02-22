const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Refe@2808',
    database: 'mrp',
    multipleStatements: true
  });

  try {
    const sqlPath = path.join(__dirname, '..', 'prisma', 'migrations', 'add_financial_module.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running financial module migration...');
    await connection.query(sql);
    console.log('✓ Migration completed successfully!');
    
    // Verify tables were created
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'mrp' 
      AND TABLE_NAME LIKE 'fin_%'
      ORDER BY TABLE_NAME
    `);
    
    console.log('\n✓ Created tables:');
    tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
