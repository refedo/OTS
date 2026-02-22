const mysql = require('mysql2/promise');

async function generateJournalEntries() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Refe@2808',
    database: 'mrp',
    multipleStatements: true
  });

  try {
    console.log('=== Generating Journal Entries ===\n');

    // Get config values
    const [config] = await connection.query('SELECT config_key, config_value FROM fin_config');
    const configMap = {};
    config.forEach(c => configMap[c.config_key] = c.config_value);
    
    console.log('Config values:');
    console.log('  AR Account:', configMap.default_ar_account);
    console.log('  AP Account:', configMap.default_ap_account);
    console.log('  Revenue Account:', configMap.default_revenue_account);
    console.log('  Expense Account:', configMap.default_expense_account);
    console.log('  VAT Output 15%:', configMap.vat_output_15_account);
    console.log('  VAT Input 15%:', configMap.vat_input_15_account);

    // Clear existing journal entries
    console.log('\nClearing existing journal entries...');
    await connection.query('DELETE FROM fin_journal_entries');

    // Get customer invoices
    const [custInvoices] = await connection.query(`
      SELECT ci.*, 
             COALESCE(SUM(cil.total_ht), ci.total_ht) as line_total_ht,
             COALESCE(SUM(cil.total_tva), ci.total_tva) as line_total_tva
      FROM fin_customer_invoices ci
      LEFT JOIN fin_customer_invoice_lines cil ON cil.invoice_dolibarr_id = ci.dolibarr_id
      WHERE ci.is_active = 1 AND ci.status >= 1
      GROUP BY ci.id
      LIMIT 10000
    `);
    console.log(`\nProcessing ${custInvoices.length} customer invoices...`);

    let pieceNum = 1;
    let entriesCreated = 0;

    for (const inv of custInvoices) {
      const entryDate = inv.date_invoice || new Date().toISOString().slice(0, 10);
      const totalHT = parseFloat(inv.total_ht) || 0;
      const totalTVA = parseFloat(inv.total_tva) || 0;
      const totalTTC = parseFloat(inv.total_ttc) || 0;

      if (totalTTC <= 0) continue;

      // Debit AR
      await connection.query(`
        INSERT INTO fin_journal_entries (entry_date, journal_code, piece_num, account_code, label, debit, credit, source_type, source_id, source_ref, thirdparty_id, currency_code, is_locked)
        VALUES (?, 'VTE', ?, ?, ?, ?, 0, 'customer_invoice', ?, ?, ?, 'SAR', 0)
      `, [entryDate, pieceNum, configMap.default_ar_account || '12003001', `Invoice ${inv.ref}`, totalTTC, inv.dolibarr_id, inv.ref, inv.socid]);
      entriesCreated++;

      // Credit Revenue
      await connection.query(`
        INSERT INTO fin_journal_entries (entry_date, journal_code, piece_num, account_code, label, debit, credit, source_type, source_id, source_ref, thirdparty_id, currency_code, is_locked)
        VALUES (?, 'VTE', ?, ?, ?, 0, ?, 'customer_invoice', ?, ?, ?, 'SAR', 0)
      `, [entryDate, pieceNum, configMap.default_revenue_account || '53001', `Invoice ${inv.ref}`, totalHT, inv.dolibarr_id, inv.ref, inv.socid]);
      entriesCreated++;

      // Credit VAT Output (if any)
      if (totalTVA > 0) {
        await connection.query(`
          INSERT INTO fin_journal_entries (entry_date, journal_code, piece_num, account_code, label, debit, credit, source_type, source_id, source_ref, thirdparty_id, currency_code, is_locked)
          VALUES (?, 'VTE', ?, ?, ?, 0, ?, 'customer_invoice', ?, ?, ?, 'SAR', 0)
        `, [entryDate, pieceNum, configMap.vat_output_15_account || '210201', `VAT Invoice ${inv.ref}`, totalTVA, inv.dolibarr_id, inv.ref, inv.socid]);
        entriesCreated++;
      }

      pieceNum++;
    }

    // Get supplier invoices
    const [suppInvoices] = await connection.query(`
      SELECT si.*
      FROM fin_supplier_invoices si
      WHERE si.is_active = 1 AND si.status >= 1
      LIMIT 10000
    `);
    console.log(`Processing ${suppInvoices.length} supplier invoices...`);

    for (const inv of suppInvoices) {
      const entryDate = inv.date_invoice || new Date().toISOString().slice(0, 10);
      const totalHT = parseFloat(inv.total_ht) || 0;
      const totalTVA = parseFloat(inv.total_tva) || 0;
      const totalTTC = parseFloat(inv.total_ttc) || 0;

      if (totalTTC <= 0) continue;

      // Debit Expense
      await connection.query(`
        INSERT INTO fin_journal_entries (entry_date, journal_code, piece_num, account_code, label, debit, credit, source_type, source_id, source_ref, thirdparty_id, currency_code, is_locked)
        VALUES (?, 'ACH', ?, ?, ?, ?, 0, 'supplier_invoice', ?, ?, ?, 'SAR', 0)
      `, [entryDate, pieceNum, configMap.default_expense_account || '420100', `Supplier Invoice ${inv.ref}`, totalHT, inv.dolibarr_id, inv.ref, inv.socid]);
      entriesCreated++;

      // Debit VAT Input (if any)
      if (totalTVA > 0) {
        await connection.query(`
          INSERT INTO fin_journal_entries (entry_date, journal_code, piece_num, account_code, label, debit, credit, source_type, source_id, source_ref, thirdparty_id, currency_code, is_locked)
          VALUES (?, 'ACH', ?, ?, ?, ?, 0, 'supplier_invoice', ?, ?, ?, 'SAR', 0)
        `, [entryDate, pieceNum, configMap.vat_input_15_account || '128001', `VAT Supplier Invoice ${inv.ref}`, totalTVA, inv.dolibarr_id, inv.ref, inv.socid]);
        entriesCreated++;
      }

      // Credit AP
      await connection.query(`
        INSERT INTO fin_journal_entries (entry_date, journal_code, piece_num, account_code, label, debit, credit, source_type, source_id, source_ref, thirdparty_id, currency_code, is_locked)
        VALUES (?, 'ACH', ?, ?, ?, 0, ?, 'supplier_invoice', ?, ?, ?, 'SAR', 0)
      `, [entryDate, pieceNum, configMap.default_ap_account || '210401', `Supplier Invoice ${inv.ref}`, totalTTC, inv.dolibarr_id, inv.ref, inv.socid]);
      entriesCreated++;

      pieceNum++;
    }

    // Get customer payments
    const [custPayments] = await connection.query(`
      SELECT fp.*, fci.ref as invoice_ref
      FROM fin_payments fp
      JOIN fin_customer_invoices fci ON fci.dolibarr_id = fp.invoice_dolibarr_id
      WHERE fp.payment_type = 'customer'
      LIMIT 10000
    `);
    console.log(`Processing ${custPayments.length} customer payments...`);

    for (const pmt of custPayments) {
      const entryDate = pmt.payment_date || new Date().toISOString().slice(0, 10);
      const amount = parseFloat(pmt.amount) || 0;
      if (amount <= 0) continue;

      // Debit Bank (use a default bank account code)
      await connection.query(`
        INSERT INTO fin_journal_entries (entry_date, journal_code, piece_num, account_code, label, debit, credit, source_type, source_id, source_ref, thirdparty_id, currency_code, is_locked)
        VALUES (?, 'BNK', ?, '1200201001', ?, ?, 0, 'customer_payment', ?, ?, NULL, 'SAR', 0)
      `, [entryDate, pieceNum, `Payment ${pmt.dolibarr_ref || pmt.id}`, amount, pmt.id, pmt.dolibarr_ref]);
      entriesCreated++;

      // Credit AR
      await connection.query(`
        INSERT INTO fin_journal_entries (entry_date, journal_code, piece_num, account_code, label, debit, credit, source_type, source_id, source_ref, thirdparty_id, currency_code, is_locked)
        VALUES (?, 'BNK', ?, ?, ?, 0, ?, 'customer_payment', ?, ?, NULL, 'SAR', 0)
      `, [entryDate, pieceNum, configMap.default_ar_account || '12003001', `Payment ${pmt.dolibarr_ref || pmt.id}`, amount, pmt.id, pmt.dolibarr_ref]);
      entriesCreated++;

      pieceNum++;
    }

    console.log(`\n✓ Created ${entriesCreated} journal entries`);

    // Verify
    const [count] = await connection.query('SELECT COUNT(*) as cnt FROM fin_journal_entries');
    console.log(`\nTotal journal entries in database: ${count[0].cnt}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

generateJournalEntries();
