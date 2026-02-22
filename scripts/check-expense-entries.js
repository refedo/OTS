const mysql = require('mysql2/promise');

async function checkExpenseEntries() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Refe@2808',
    database: 'mrp'
  });

  try {
    console.log('=== Checking Expense Journal Entries ===\n');

    // Check journal entries by source type
    const [sourceTypes] = await connection.query(`
      SELECT source_type, COUNT(*) as cnt 
      FROM fin_journal_entries 
      GROUP BY source_type
    `);
    console.log('Journal entries by source type:');
    sourceTypes.forEach(r => console.log(`  ${r.source_type}: ${r.cnt}`));

    // Check expense account entries
    const [expenseEntries] = await connection.query(`
      SELECT je.account_code, coa.account_name, SUM(je.debit) as total_debit, COUNT(*) as cnt
      FROM fin_journal_entries je
      JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
      WHERE coa.account_type = 'expense'
      GROUP BY je.account_code, coa.account_name
      ORDER BY total_debit DESC
      LIMIT 10
    `);
    console.log('\nTop expense account entries:');
    expenseEntries.forEach(r => console.log(`  ${r.account_code} ${r.account_name}: ${r.total_debit} SAR (${r.cnt} entries)`));

    // Check if supplier invoice journal entries exist
    const [supplierJE] = await connection.query(`
      SELECT COUNT(*) as cnt FROM fin_journal_entries WHERE source_type = 'supplier_invoice'
    `);
    console.log(`\nSupplier invoice journal entries: ${supplierJE[0].cnt}`);

    // Check supplier invoices status
    const [supplierStatus] = await connection.query(`
      SELECT status, COUNT(*) as cnt FROM fin_supplier_invoices GROUP BY status
    `);
    console.log('\nSupplier invoices by status:');
    supplierStatus.forEach(r => console.log(`  Status ${r.status}: ${r.cnt}`));

    // Check default expense account config
    const [expenseConfig] = await connection.query(`
      SELECT config_key, config_value FROM fin_config WHERE config_key LIKE '%expense%'
    `);
    console.log('\nExpense account config:');
    expenseConfig.forEach(r => console.log(`  ${r.config_key}: ${r.config_value}`));

  } finally {
    await connection.end();
  }
}

checkExpenseEntries();
