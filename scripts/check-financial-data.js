const mysql = require('mysql2/promise');

async function checkData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Refe@2808',
    database: 'mrp'
  });

  try {
    console.log('=== Financial Module Data Status ===\n');

    const tables = [
      'fin_bank_accounts',
      'fin_customer_invoices',
      'fin_customer_invoice_lines',
      'fin_supplier_invoices',
      'fin_supplier_invoice_lines',
      'fin_payments',
      'fin_journal_entries',
      'fin_chart_of_accounts',
      'fin_config',
      'fin_sync_log'
    ];

    for (const table of tables) {
      const [rows] = await connection.query(`SELECT COUNT(*) as cnt FROM ${table}`);
      console.log(`${table}: ${rows[0].cnt} records`);
    }

    // Check recent sync logs
    console.log('\n--- Recent Sync Logs ---');
    const [logs] = await connection.query(`
      SELECT entity_type, status, records_created, records_updated, duration_ms, error_message, created_at
      FROM fin_sync_log 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    if (logs.length === 0) {
      console.log('No sync logs found');
    } else {
      logs.forEach(log => {
        console.log(`  ${log.entity_type}: ${log.status} (${log.records_created} created, ${log.records_updated} updated) - ${log.duration_ms}ms`);
        if (log.error_message) console.log(`    Error: ${log.error_message}`);
      });
    }

  } finally {
    await connection.end();
  }
}

checkData();
