const mysql = require('mysql2/promise');

async function diagnose() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Refe@2808',
    database: 'mrp'
  });

  try {
    // Check 2024 supplier invoices
    const [inv2024] = await connection.query(`
      SELECT COUNT(*) as cnt, SUM(total_ht) as total_ht, MIN(date_invoice) as min_date, MAX(date_invoice) as max_date
      FROM fin_supplier_invoices WHERE is_active = 1 AND YEAR(date_invoice) = 2024 AND status >= 1
    `);
    console.log('2024 supplier invoices (status>=1):', inv2024[0]);

    // Check if journal entries exist for 2024 supplier invoices
    const [je2024] = await connection.query(`
      SELECT COUNT(*) as cnt FROM fin_journal_entries 
      WHERE source_type = 'supplier_invoice' AND YEAR(entry_date) = 2024
    `);
    console.log('2024 supplier invoice journal entries:', je2024[0].cnt);

    // Check supplier invoice lines for 2024
    const [lines2024] = await connection.query(`
      SELECT COUNT(*) as cnt FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      WHERE YEAR(si.date_invoice) = 2024
    `);
    console.log('2024 supplier invoice lines:', lines2024[0].cnt);

    // Sample a 2024 supplier invoice
    const [sample] = await connection.query(`
      SELECT dolibarr_id, ref, status, total_ht, total_tva, total_ttc, date_invoice, type
      FROM fin_supplier_invoices WHERE is_active = 1 AND YEAR(date_invoice) = 2024 AND status >= 1
      LIMIT 3
    `);
    console.log('\nSample 2024 invoices:');
    sample.forEach(r => console.log(`  ${r.ref} dol_id=${r.dolibarr_id} status=${r.status} type=${r.type} ht=${r.total_ht} date=${r.date_invoice}`));

    // Check if these have journal entries
    if (sample.length > 0) {
      const [je] = await connection.query(`
        SELECT source_id, account_code, debit, credit, entry_date FROM fin_journal_entries 
        WHERE source_type = 'supplier_invoice' AND source_id = ?
      `, [sample[0].dolibarr_id]);
      console.log(`\nJournal entries for ${sample[0].ref} (dol_id=${sample[0].dolibarr_id}):`, je.length, 'entries');
      je.forEach(r => console.log(`  ${r.account_code} D=${r.debit} C=${r.credit} date=${r.entry_date}`));
    }

    // Total journal entries
    const [totalJE] = await connection.query(`SELECT COUNT(*) as cnt FROM fin_journal_entries`);
    console.log('\nTotal journal entries:', totalJE[0].cnt);

    // Check if generateJournalEntries deletes and recreates
    const [locked] = await connection.query(`SELECT COUNT(*) as cnt FROM fin_journal_entries WHERE is_locked = 1`);
    console.log('Locked journal entries:', locked[0].cnt);

  } finally {
    await connection.end();
  }
}

diagnose();
