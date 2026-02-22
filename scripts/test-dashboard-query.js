const mysql = require('mysql2/promise');

async function testDashboardQuery() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Refe@2808',
    database: 'mrp'
  });

  const fromDate = '2026-01-01';
  const toDate = '2026-12-31';

  try {
    console.log(`=== Dashboard Query Test (${fromDate} to ${toDate}) ===\n`);

    // Revenue query
    const [revRows] = await connection.query(`
      SELECT COALESCE(SUM(je.credit) - SUM(je.debit), 0) as total
      FROM fin_journal_entries je
      JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
      WHERE coa.account_type = 'revenue' AND je.entry_date BETWEEN ? AND ?
    `, [fromDate, toDate]);
    console.log('Revenue:', revRows[0]?.total);

    // Expense query
    const [expRows] = await connection.query(`
      SELECT COALESCE(SUM(je.debit) - SUM(je.credit), 0) as total
      FROM fin_journal_entries je
      JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
      WHERE coa.account_type = 'expense' AND je.entry_date BETWEEN ? AND ?
    `, [fromDate, toDate]);
    console.log('Expenses:', expRows[0]?.total);

    // Check entry dates
    const [dates] = await connection.query(`
      SELECT MIN(entry_date) as min_date, MAX(entry_date) as max_date
      FROM fin_journal_entries
    `);
    console.log('\nJournal entry date range:', dates[0]?.min_date, 'to', dates[0]?.max_date);

    // Check expense entries with dates
    const [expWithDates] = await connection.query(`
      SELECT je.entry_date, je.account_code, coa.account_type, SUM(je.debit) as debit
      FROM fin_journal_entries je
      JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
      WHERE coa.account_type = 'expense'
      GROUP BY je.entry_date, je.account_code, coa.account_type
      LIMIT 5
    `);
    console.log('\nSample expense entries:');
    expWithDates.forEach(r => console.log(`  ${r.entry_date} ${r.account_code} (${r.account_type}): ${r.debit}`));

  } finally {
    await connection.end();
  }
}

testDashboardQuery();
