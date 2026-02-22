const mysql = require('mysql2/promise');

async function testSyncStatus() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Refe@2808',
    database: 'mrp'
  });

  try {
    console.log('=== Testing Sync Status Queries ===\n');

    // Test each query that getSyncStatus uses
    console.log('1. Customer Invoices count:');
    const [ci] = await connection.query('SELECT COUNT(*) as cnt FROM fin_customer_invoices WHERE is_active = 1');
    console.log(`   ${ci[0].cnt} records`);

    console.log('2. Supplier Invoices count:');
    const [si] = await connection.query('SELECT COUNT(*) as cnt FROM fin_supplier_invoices WHERE is_active = 1');
    console.log(`   ${si[0].cnt} records`);

    console.log('3. Payments count:');
    const [pm] = await connection.query('SELECT COUNT(*) as cnt FROM fin_payments');
    console.log(`   ${pm[0].cnt} records`);

    console.log('4. Bank Accounts count:');
    const [ba] = await connection.query('SELECT COUNT(*) as cnt FROM fin_bank_accounts');
    console.log(`   ${ba[0].cnt} records`);

    console.log('5. Journal Entries count:');
    const [je] = await connection.query('SELECT COUNT(*) as cnt FROM fin_journal_entries');
    console.log(`   ${je[0].cnt} records`);

    console.log('\n6. Recent Sync Logs:');
    const [logs] = await connection.query('SELECT * FROM fin_sync_log ORDER BY created_at DESC LIMIT 10');
    console.log(`   ${logs.length} logs found`);
    logs.forEach(log => {
      console.log(`   - ${log.entity_type}: ${log.status} (${log.records_created} created)`);
    });

    console.log('\n7. Config - last_full_sync:');
    const [config] = await connection.query("SELECT config_value FROM fin_config WHERE config_key = 'last_full_sync'");
    console.log(`   ${config[0]?.config_value || 'Not set'}`);

    console.log('\n=== All queries successful ===');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

testSyncStatus();
