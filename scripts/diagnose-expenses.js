const mysql = require('mysql2/promise');

async function diagnose() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Refe@2808',
    database: 'mrp'
  });

  try {
    console.log('=== Supplier Invoice Diagnosis ===\n');

    // 1. Total supplier invoices
    const [total] = await connection.query(`SELECT COUNT(*) as cnt FROM fin_supplier_invoices WHERE is_active = 1`);
    console.log(`Total active supplier invoices: ${total[0].cnt}`);

    // 2. Supplier invoices by year
    const [byYear] = await connection.query(`
      SELECT YEAR(date_invoice) as yr, COUNT(*) as cnt, SUM(total_ttc) as total_ttc, SUM(total_ht) as total_ht
      FROM fin_supplier_invoices WHERE is_active = 1
      GROUP BY YEAR(date_invoice) ORDER BY yr DESC
    `);
    console.log('\nSupplier invoices by year:');
    byYear.forEach(r => console.log(`  ${r.yr}: ${r.cnt} invoices, total_ht=${r.total_ht}, total_ttc=${r.total_ttc}`));

    // 3. 2026 supplier invoices specifically
    const [inv2026] = await connection.query(`
      SELECT COUNT(*) as cnt, SUM(total_ht) as total_ht, SUM(total_ttc) as total_ttc, SUM(total_tva) as total_tva
      FROM fin_supplier_invoices WHERE is_active = 1 AND YEAR(date_invoice) = 2026
    `);
    console.log(`\n2026 supplier invoices: ${inv2026[0].cnt}, total_ht=${inv2026[0].total_ht}, total_ttc=${inv2026[0].total_ttc}, total_tva=${inv2026[0].total_tva}`);

    // 4. Journal entries for supplier_invoice by year
    const [jeByYear] = await connection.query(`
      SELECT YEAR(entry_date) as yr, COUNT(*) as cnt, SUM(debit) as total_debit, SUM(credit) as total_credit
      FROM fin_journal_entries WHERE source_type = 'supplier_invoice'
      GROUP BY YEAR(entry_date) ORDER BY yr DESC
    `);
    console.log('\nSupplier invoice journal entries by year:');
    jeByYear.forEach(r => console.log(`  ${r.yr}: ${r.cnt} entries, debit=${r.total_debit}, credit=${r.total_credit}`));

    // 5. Expense journal entries by year (from chart of accounts)
    const [expByYear] = await connection.query(`
      SELECT YEAR(je.entry_date) as yr, COUNT(*) as cnt, SUM(je.debit) as total_debit
      FROM fin_journal_entries je
      JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
      WHERE coa.account_type = 'expense'
      GROUP BY YEAR(je.entry_date) ORDER BY yr DESC
    `);
    console.log('\nExpense journal entries by year (from chart_of_accounts):');
    expByYear.forEach(r => console.log(`  ${r.yr}: ${r.cnt} entries, total_debit=${r.total_debit}`));

    // 6. Check what account_code the supplier invoice JEs use
    const [jeCodes] = await connection.query(`
      SELECT je.account_code, coa.account_name, coa.account_type, COUNT(*) as cnt
      FROM fin_journal_entries je
      LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
      WHERE je.source_type = 'supplier_invoice'
      GROUP BY je.account_code, coa.account_name, coa.account_type
      ORDER BY cnt DESC
    `);
    console.log('\nAccount codes used by supplier invoice journal entries:');
    jeCodes.forEach(r => console.log(`  ${r.account_code} (${r.account_name || 'MISSING'}) type=${r.account_type || 'NULL'}: ${r.cnt} entries`));

    // 7. Check default_expense_account config
    const [config] = await connection.query(`SELECT config_key, config_value FROM fin_config WHERE config_key = 'default_expense_account'`);
    console.log('\nDefault expense account config:', config[0]?.config_value || 'NOT SET');

    // 8. Check if that account exists in chart_of_accounts
    const expCode = config[0]?.config_value || '601000';
    const [coaCheck] = await connection.query(`SELECT * FROM fin_chart_of_accounts WHERE account_code = ?`, [expCode]);
    console.log(`Chart of accounts entry for ${expCode}:`, coaCheck.length > 0 ? `${coaCheck[0].account_name} (type=${coaCheck[0].account_type})` : 'NOT FOUND');

    // 9. Dashboard expense query simulation
    const [dashExp] = await connection.query(`
      SELECT COALESCE(SUM(je.debit) - SUM(je.credit), 0) as total
      FROM fin_journal_entries je
      JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
      WHERE coa.account_type = 'expense' AND je.entry_date BETWEEN '2026-01-01' AND '2026-12-31'
    `);
    console.log(`\nDashboard expense query (2026): ${dashExp[0].total}`);

  } finally {
    await connection.end();
  }
}

diagnose();
