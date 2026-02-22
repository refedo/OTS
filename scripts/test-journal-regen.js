const mysql = require('mysql2/promise');

async function testJournalRegen() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Refe@2808',
    database: 'mrp'
  });

  try {
    // Before stats
    const [before] = await connection.query(`SELECT COUNT(*) as cnt FROM fin_journal_entries`);
    console.log(`Before: ${before[0].cnt} journal entries`);

    const [beforeByYear] = await connection.query(`
      SELECT YEAR(entry_date) as yr, COUNT(*) as cnt 
      FROM fin_journal_entries 
      GROUP BY YEAR(entry_date) ORDER BY yr DESC
    `);
    console.log('Before by year:');
    beforeByYear.forEach(r => console.log(`  ${r.yr}: ${r.cnt}`));

    // Check supplier invoices with status >= 1
    const [suppCount] = await connection.query(`
      SELECT COUNT(*) as cnt FROM fin_supplier_invoices WHERE status >= 1 AND is_active = 1
    `);
    console.log(`\nActive supplier invoices (status>=1): ${suppCount[0].cnt}`);

    // Check supplier invoices with NULL date_invoice
    const [nullDates] = await connection.query(`
      SELECT COUNT(*) as cnt FROM fin_supplier_invoices WHERE date_invoice IS NULL AND status >= 1 AND is_active = 1
    `);
    console.log(`Supplier invoices with NULL date: ${nullDates[0].cnt}`);

    // Check supplier invoice lines count
    const [lineCount] = await connection.query(`SELECT COUNT(*) as cnt FROM fin_supplier_invoice_lines`);
    console.log(`Supplier invoice lines: ${lineCount[0].cnt}`);

    // Check customer invoices
    const [custCount] = await connection.query(`
      SELECT COUNT(*) as cnt FROM fin_customer_invoices WHERE status >= 1 AND is_active = 1
    `);
    console.log(`Active customer invoices (status>=1): ${custCount[0].cnt}`);

    // Check payments
    const [pmtCount] = await connection.query(`SELECT COUNT(*) as cnt FROM fin_payments`);
    console.log(`Payments: ${pmtCount[0].cnt}`);

    // Estimate expected journal entries
    // Each customer invoice: 1 AR + ~1 revenue + ~1 VAT = ~3
    // Each supplier invoice: ~1 expense + ~1 VAT + 1 AP = ~3
    // Each payment: 2 (bank + AR/AP)
    const estCust = custCount[0].cnt * 3;
    const estSupp = suppCount[0].cnt * 3;
    const estPmt = pmtCount[0].cnt * 2;
    console.log(`\nEstimated entries: ~${estCust + estSupp + estPmt} (cust ~${estCust}, supp ~${estSupp}, pmt ~${estPmt})`);

  } finally {
    await connection.end();
  }
}

testJournalRegen();
