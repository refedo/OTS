const mysql = require('mysql2/promise');

// This script replicates the batch journal entry generation logic
// to test it independently of the API auth layer

async function regenJournalEntries() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Refe@2808',
    database: 'mrp'
  });

  const startTime = Date.now();

  try {
    // Load config
    async function getConfig(key, def) {
      const [rows] = await connection.query(`SELECT config_value FROM fin_config WHERE config_key = ?`, [key]);
      return rows.length > 0 ? rows[0].config_value : def;
    }

    const arAccount = await getConfig('default_ar_account', '411000');
    const apAccount = await getConfig('default_ap_account', '401000');
    const defaultRevenue = await getConfig('default_revenue_account', '701000');
    const defaultExpense = await getConfig('default_expense_account', '601000');
    const vatOut15 = await getConfig('vat_output_15_account', '445711');
    const vatOut5 = await getConfig('vat_output_5_account', '445712');
    const vatIn15 = await getConfig('vat_input_15_account', '445661');
    const vatIn5 = await getConfig('vat_input_5_account', '445662');

    console.log('Config loaded:', { arAccount, apAccount, defaultRevenue, defaultExpense, vatOut15, vatOut5, vatIn15, vatIn5 });

    // Bank account map
    const [bankRows] = await connection.query(`SELECT dolibarr_id, account_number FROM fin_bank_accounts`);
    const bankAccountMap = new Map();
    for (const row of bankRows) {
      if (row.account_number) bankAccountMap.set(row.dolibarr_id, row.account_number);
    }

    const entries = [];
    let pieceNum = 1;

    function pf(v) { return parseFloat(v) || 0; }

    function addEntry(entryDate, journalCode, pn, accountCode, label, debit, credit, sourceType, sourceId, sourceRef, thirdpartyId) {
      entries.push([entryDate, journalCode, pn, accountCode, label, debit, credit, sourceType, sourceId, sourceRef, thirdpartyId]);
    }

    // Delete non-locked
    await connection.query(`DELETE FROM fin_journal_entries WHERE is_locked = 0`);
    console.log('Deleted non-locked journal entries');

    // ---- Customer Invoices ----
    const [custInvoices] = await connection.query(`
      SELECT ci.* FROM fin_customer_invoices ci
      WHERE ci.status >= 1 AND ci.is_active = 1
      ORDER BY ci.date_invoice
    `);
    const [allCustLines] = await connection.query(`SELECT * FROM fin_customer_invoice_lines ORDER BY invoice_dolibarr_id`);
    const custLineMap = new Map();
    for (const line of allCustLines) {
      const arr = custLineMap.get(line.invoice_dolibarr_id) || [];
      arr.push(line);
      custLineMap.set(line.invoice_dolibarr_id, arr);
    }

    for (const inv of custInvoices) {
      const isCreditNote = inv.type === 2;
      const entryDate = inv.date_invoice;
      if (!entryDate) continue;

      addEntry(entryDate, 'VTE', pieceNum, arAccount,
        `Customer Invoice ${inv.ref}`, isCreditNote ? 0 : pf(inv.total_ttc), isCreditNote ? pf(inv.total_ttc) : 0,
        'customer_invoice', inv.dolibarr_id, inv.ref, inv.socid);

      const lines = custLineMap.get(inv.dolibarr_id) || [];
      const vatGroups = new Map();
      for (const line of lines) {
        const rate = pf(line.vat_rate);
        const existing = vatGroups.get(rate) || { totalHt: 0, totalTva: 0 };
        existing.totalHt += pf(line.total_ht);
        existing.totalTva += pf(line.total_tva);
        vatGroups.set(rate, existing);
      }

      for (const [rate, group] of vatGroups) {
        addEntry(entryDate, 'VTE', pieceNum, defaultRevenue,
          `Revenue - ${inv.ref} (VAT ${rate}%)`, isCreditNote ? group.totalHt : 0, isCreditNote ? 0 : group.totalHt,
          'customer_invoice', inv.dolibarr_id, inv.ref, inv.socid);
        if (group.totalTva > 0) {
          const vatAccount = rate >= 10 ? vatOut15 : vatOut5;
          addEntry(entryDate, 'VTE', pieceNum, vatAccount,
            `VAT Output ${rate}% - ${inv.ref}`, isCreditNote ? group.totalTva : 0, isCreditNote ? 0 : group.totalTva,
            'customer_invoice', inv.dolibarr_id, inv.ref, inv.socid);
        }
      }

      if (lines.length === 0 && pf(inv.total_ht) > 0) {
        addEntry(entryDate, 'VTE', pieceNum, defaultRevenue,
          `Revenue - ${inv.ref}`, isCreditNote ? pf(inv.total_ht) : 0, isCreditNote ? 0 : pf(inv.total_ht),
          'customer_invoice', inv.dolibarr_id, inv.ref, inv.socid);
        if (pf(inv.total_tva) > 0) {
          addEntry(entryDate, 'VTE', pieceNum, vatOut15,
            `VAT Output - ${inv.ref}`, isCreditNote ? pf(inv.total_tva) : 0, isCreditNote ? 0 : pf(inv.total_tva),
            'customer_invoice', inv.dolibarr_id, inv.ref, inv.socid);
        }
      }
      pieceNum++;
    }
    console.log(`Customer invoices: ${custInvoices.length}, entries so far: ${entries.length}`);

    // ---- Customer Payments ----
    const [custPayments] = await connection.query(`
      SELECT fp.*, fci.ref as invoice_ref, fci.socid
      FROM fin_payments fp
      JOIN fin_customer_invoices fci ON fci.dolibarr_id = fp.invoice_dolibarr_id
      WHERE fp.payment_type = 'customer'
      ORDER BY fp.payment_date
    `);
    for (const pmt of custPayments) {
      const bankCode = pmt.bank_account_id ? (bankAccountMap.get(pmt.bank_account_id) || '120000') : '120000';
      if (!pmt.payment_date) continue;
      addEntry(pmt.payment_date, 'BQ', pieceNum, bankCode,
        `Payment received - ${pmt.invoice_ref || pmt.dolibarr_ref}`, pf(pmt.amount), 0,
        'customer_payment', pmt.id, pmt.dolibarr_ref, pmt.socid);
      addEntry(pmt.payment_date, 'BQ', pieceNum, arAccount,
        `Payment received - ${pmt.invoice_ref || pmt.dolibarr_ref}`, 0, pf(pmt.amount),
        'customer_payment', pmt.id, pmt.dolibarr_ref, pmt.socid);
      pieceNum++;
    }
    console.log(`Customer payments: ${custPayments.length}, entries so far: ${entries.length}`);

    // ---- Supplier Invoices ----
    const [suppInvoices] = await connection.query(`
      SELECT si.* FROM fin_supplier_invoices si
      WHERE si.status >= 1 AND si.is_active = 1
      ORDER BY si.date_invoice
    `);
    const [allSuppLines] = await connection.query(`SELECT * FROM fin_supplier_invoice_lines ORDER BY invoice_dolibarr_id`);
    const suppLineMap = new Map();
    for (const line of allSuppLines) {
      const arr = suppLineMap.get(line.invoice_dolibarr_id) || [];
      arr.push(line);
      suppLineMap.set(line.invoice_dolibarr_id, arr);
    }

    for (const inv of suppInvoices) {
      const isCreditNote = inv.type === 2;
      const entryDate = inv.date_invoice;
      if (!entryDate) continue;

      const lines = suppLineMap.get(inv.dolibarr_id) || [];
      const vatGroups = new Map();
      for (const line of lines) {
        const rate = pf(line.vat_rate);
        const existing = vatGroups.get(rate) || { totalHt: 0, totalTva: 0 };
        existing.totalHt += pf(line.total_ht);
        existing.totalTva += pf(line.total_tva);
        vatGroups.set(rate, existing);
      }

      for (const [rate, group] of vatGroups) {
        addEntry(entryDate, 'ACH', pieceNum, defaultExpense,
          `Expense - ${inv.ref} (VAT ${rate}%)`, isCreditNote ? 0 : group.totalHt, isCreditNote ? group.totalHt : 0,
          'supplier_invoice', inv.dolibarr_id, inv.ref, inv.socid);
        if (group.totalTva > 0) {
          const vatAccount = rate >= 10 ? vatIn15 : vatIn5;
          addEntry(entryDate, 'ACH', pieceNum, vatAccount,
            `VAT Input ${rate}% - ${inv.ref}`, isCreditNote ? 0 : group.totalTva, isCreditNote ? group.totalTva : 0,
            'supplier_invoice', inv.dolibarr_id, inv.ref, inv.socid);
        }
      }

      if (lines.length === 0 && pf(inv.total_ht) > 0) {
        addEntry(entryDate, 'ACH', pieceNum, defaultExpense,
          `Expense - ${inv.ref}`, isCreditNote ? 0 : pf(inv.total_ht), isCreditNote ? pf(inv.total_ht) : 0,
          'supplier_invoice', inv.dolibarr_id, inv.ref, inv.socid);
        if (pf(inv.total_tva) > 0) {
          addEntry(entryDate, 'ACH', pieceNum, vatIn15,
            `VAT Input - ${inv.ref}`, isCreditNote ? 0 : pf(inv.total_tva), isCreditNote ? pf(inv.total_tva) : 0,
            'supplier_invoice', inv.dolibarr_id, inv.ref, inv.socid);
        }
      }

      addEntry(entryDate, 'ACH', pieceNum, apAccount,
        `Supplier Invoice ${inv.ref}`, isCreditNote ? pf(inv.total_ttc) : 0, isCreditNote ? 0 : pf(inv.total_ttc),
        'supplier_invoice', inv.dolibarr_id, inv.ref, inv.socid);
      pieceNum++;
    }
    console.log(`Supplier invoices: ${suppInvoices.length}, entries so far: ${entries.length}`);

    // ---- Supplier Payments ----
    const [suppPayments] = await connection.query(`
      SELECT fp.*, fsi.ref as invoice_ref, fsi.socid
      FROM fin_payments fp
      JOIN fin_supplier_invoices fsi ON fsi.dolibarr_id = fp.invoice_dolibarr_id
      WHERE fp.payment_type = 'supplier'
      ORDER BY fp.payment_date
    `);
    for (const pmt of suppPayments) {
      const bankCode = pmt.bank_account_id ? (bankAccountMap.get(pmt.bank_account_id) || '120000') : '120000';
      if (!pmt.payment_date) continue;
      addEntry(pmt.payment_date, 'BQ', pieceNum, apAccount,
        `Payment made - ${pmt.invoice_ref || pmt.dolibarr_ref}`, pf(pmt.amount), 0,
        'supplier_payment', pmt.id, pmt.dolibarr_ref, pmt.socid);
      addEntry(pmt.payment_date, 'BQ', pieceNum, bankCode,
        `Payment made - ${pmt.invoice_ref || pmt.dolibarr_ref}`, 0, pf(pmt.amount),
        'supplier_payment', pmt.id, pmt.dolibarr_ref, pmt.socid);
      pieceNum++;
    }
    console.log(`Supplier payments: ${suppPayments.length}, entries so far: ${entries.length}`);

    // ---- BATCH INSERT ----
    console.log(`\nBatch inserting ${entries.length} journal entries in batches of 500...`);
    const BATCH_SIZE = 500;
    let inserted = 0;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'SAR\', 0)').join(',\n');
      const params = [];
      for (const e of batch) {
        params.push(e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8], e[9], e[10]);
      }
      await connection.query(
        `INSERT INTO fin_journal_entries (entry_date, journal_code, piece_num, account_code, label,
         debit, credit, source_type, source_id, source_ref, thirdparty_id, currency_code, is_locked)
         VALUES ${placeholders}`,
        params
      );
      inserted += batch.length;
      if (i % 5000 === 0) console.log(`  Inserted ${inserted}/${entries.length}...`);
    }

    const duration = Date.now() - startTime;
    console.log(`\nDone! Inserted ${inserted} journal entries in ${(duration/1000).toFixed(1)}s`);

    // Verify
    const [afterCount] = await connection.query(`SELECT COUNT(*) as cnt FROM fin_journal_entries`);
    console.log(`Total journal entries now: ${afterCount[0].cnt}`);

    const [byYear] = await connection.query(`
      SELECT YEAR(entry_date) as yr, COUNT(*) as cnt, SUM(debit) as total_debit
      FROM fin_journal_entries GROUP BY YEAR(entry_date) ORDER BY yr DESC
    `);
    console.log('\nBy year:');
    byYear.forEach(r => console.log(`  ${r.yr}: ${r.cnt} entries, debit=${parseFloat(r.total_debit).toFixed(2)}`));

    // Check expense entries specifically
    const [expenseEntries] = await connection.query(`
      SELECT YEAR(entry_date) as yr, COUNT(*) as cnt, SUM(debit) as total_debit
      FROM fin_journal_entries
      WHERE source_type = 'supplier_invoice' AND account_code = ?
      GROUP BY YEAR(entry_date) ORDER BY yr DESC
    `, [defaultExpense]);
    console.log('\nExpense entries by year (account ' + defaultExpense + '):');
    expenseEntries.forEach(r => console.log(`  ${r.yr}: ${r.cnt} entries, debit=${parseFloat(r.total_debit).toFixed(2)}`));

    // Log sync
    await connection.query(
      `INSERT INTO fin_sync_log (entity_type, status, records_created, records_updated, records_unchanged, records_total, duration_ms, triggered_by)
       VALUES ('journal_entries', 'success', ?, 0, 0, ?, ?, 'script')`,
      [inserted, inserted, duration]
    );

  } finally {
    await connection.end();
  }
}

regenJournalEntries().catch(console.error);
