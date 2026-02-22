// Full re-sync of supplier invoices, customer invoices, and journal entries
// Bypasses API auth by calling Dolibarr directly and writing to DB

const mysql = require('mysql2/promise');
const crypto = require('crypto');

const DOLIBARR_API_URL = 'https://www.hexametals.com/erp/api/index.php';
const DOLIBARR_API_KEY = 'pKY1pUzQO6gXP1882nvS1M75d2lrRvxN';

function pf(v) { return parseFloat(v) || 0; }
function pi(v) { return parseInt(v) || 0; }
function computeHash(obj) { return crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex'); }

function parseDolibarrDate(val) {
  if (!val) return null;
  const ts = parseInt(val);
  if (!isNaN(ts) && ts > 0) return new Date(ts * 1000);
  return null;
}

function formatDate(d) {
  if (!d) return null;
  return d.toISOString().split('T')[0];
}

function formatDateTime(d) {
  if (!d) return null;
  return d.toISOString().replace('T', ' ').replace('Z', '');
}

async function dolibarrFetch(endpoint, params = {}) {
  const url = new URL(`${DOLIBARR_API_URL}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), {
    headers: { 'DOLAPIKEY': DOLIBARR_API_KEY, 'Accept': 'application/json' }
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    if (res.status === 404) return [];
    throw new Error(`API ${res.status}: ${txt.substring(0, 200)}`);
  }
  return res.json();
}

async function fetchAllPaginated(endpoint, batchSize = 100) {
  const all = [];
  let page = 0;
  let hasMore = true;
  while (hasMore) {
    const batch = await dolibarrFetch(endpoint, {
      limit: batchSize, page, sortfield: 't.rowid', sortorder: 'ASC',
      sqlfilters: "(t.fk_statut:>:'0')"
    });
    if (!Array.isArray(batch)) break;
    all.push(...batch);
    hasMore = batch.length >= batchSize;
    page++;
    if (page % 10 === 0) console.log(`  ... fetched ${all.length} (page ${page})`);
  }
  return all;
}

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'Refe@2808', database: 'mrp'
  });

  const startTime = Date.now();

  try {
    // ============ SUPPLIER INVOICES ============
    console.log('=== Syncing Supplier Invoices from Dolibarr ===');
    const suppInvoices = await fetchAllPaginated('supplierinvoices', 100);
    console.log(`Fetched ${suppInvoices.length} supplier invoices from Dolibarr API`);

    let sCreated = 0, sUpdated = 0, sUnchanged = 0;
    for (const inv of suppInvoices) {
      const dolibarrId = pi(inv.id);
      if (!dolibarrId) continue;

      const hashFields = {
        ref: inv.ref, status: inv.statut || inv.status, paye: inv.paye || inv.paid,
        total_ht: inv.total_ht, total_tva: inv.total_tva, total_ttc: inv.total_ttc,
        date_echeance: inv.date_echeance,
      };
      const newHash = computeHash(hashFields);

      const invoiceDate = formatDate(parseDolibarrDate(inv.date_validation || inv.date || inv.date_creation));
      const dueDate = formatDate(parseDolibarrDate(inv.date_echeance));
      const creationDate = formatDateTime(parseDolibarrDate(inv.date_creation));
      const rawJson = JSON.stringify(inv);

      const [existing] = await connection.query(
        `SELECT sync_hash FROM fin_supplier_invoices WHERE dolibarr_id = ?`, [dolibarrId]
      );

      if (existing.length > 0) {
        if (existing[0].sync_hash === newHash) { sUnchanged++; continue; }
        await connection.query(
          `UPDATE fin_supplier_invoices SET ref=?, ref_supplier=?, socid=?, type=?, status=?, is_paid=?,
           total_ht=?, total_tva=?, total_ttc=?, date_invoice=?, date_due=?, date_creation=?,
           dolibarr_raw=?, last_synced_at=NOW(), sync_hash=?, is_active=1
           WHERE dolibarr_id=?`,
          [inv.ref, inv.ref_supplier, pi(inv.socid), pi(inv.type),
           pi(inv.statut || inv.status), (inv.paye === '1' || inv.paid === '1') ? 1 : 0,
           pf(inv.total_ht), pf(inv.total_tva), pf(inv.total_ttc),
           invoiceDate, dueDate, creationDate, rawJson, newHash, dolibarrId]
        );
        sUpdated++;
      } else {
        await connection.query(
          `INSERT INTO fin_supplier_invoices (dolibarr_id, ref, ref_supplier, socid, type, status, is_paid,
           total_ht, total_tva, total_ttc, date_invoice, date_due, date_creation, dolibarr_raw,
           first_synced_at, last_synced_at, sync_hash, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, 1)`,
          [dolibarrId, inv.ref, inv.ref_supplier, pi(inv.socid), pi(inv.type),
           pi(inv.statut || inv.status), (inv.paye === '1' || inv.paid === '1') ? 1 : 0,
           pf(inv.total_ht), pf(inv.total_tva), pf(inv.total_ttc),
           invoiceDate, dueDate, creationDate, rawJson, newHash]
        );
        sCreated++;
      }

      // Sync invoice lines
      await connection.query(`DELETE FROM fin_supplier_invoice_lines WHERE invoice_dolibarr_id = ?`, [dolibarrId]);
      if (inv.lines && Array.isArray(inv.lines)) {
        for (const line of inv.lines) {
          await connection.query(
            `INSERT INTO fin_supplier_invoice_lines (invoice_dolibarr_id, line_id, fk_product, product_ref,
             product_label, qty, unit_price_ht, vat_rate, total_ht, total_tva, total_ttc, accounting_code)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [dolibarrId, pi(line.rowid), pi(line.fk_product),
             line.product_ref || null, line.product_label || line.label || null,
             pf(line.qty), pf(line.subprice), pf(line.tva_tx),
             pf(line.total_ht), pf(line.total_tva), pf(line.total_ttc),
             line.fk_accounting_account ? String(line.fk_accounting_account) : null]
          );
        }
      }

      if ((sCreated + sUpdated + sUnchanged) % 500 === 0) {
        console.log(`  Supplier invoices: ${sCreated} created, ${sUpdated} updated, ${sUnchanged} unchanged`);
      }
    }
    console.log(`Supplier invoices DONE: ${sCreated} created, ${sUpdated} updated, ${sUnchanged} unchanged (total: ${suppInvoices.length})`);

    // Log sync
    await connection.query(
      `INSERT INTO fin_sync_log (entity_type, status, records_created, records_updated, records_unchanged, records_total, duration_ms, triggered_by)
       VALUES ('supplier_invoices', 'success', ?, ?, ?, ?, ?, 'script-resync')`,
      [sCreated, sUpdated, sUnchanged, suppInvoices.length, Date.now() - startTime]
    );

    // ============ CUSTOMER INVOICES ============
    const custStart = Date.now();
    console.log('\n=== Syncing Customer Invoices from Dolibarr ===');
    const custInvoices = await fetchAllPaginated('invoices', 100);
    console.log(`Fetched ${custInvoices.length} customer invoices from Dolibarr API`);

    let cCreated = 0, cUpdated = 0, cUnchanged = 0;
    for (const inv of custInvoices) {
      const dolibarrId = pi(inv.id);
      if (!dolibarrId) continue;

      const hashFields = {
        ref: inv.ref, status: inv.statut || inv.status, paye: inv.paye,
        total_ht: inv.total_ht, total_tva: inv.total_tva, total_ttc: inv.total_ttc,
        date_echeance: inv.date_echeance,
      };
      const newHash = computeHash(hashFields);

      const invoiceDate = formatDate(parseDolibarrDate(inv.date_validation || inv.date || inv.date_creation));
      const dueDate = formatDate(parseDolibarrDate(inv.date_echeance));
      const creationDate = formatDateTime(parseDolibarrDate(inv.date_creation));
      const rawJson = JSON.stringify(inv);

      const [existing] = await connection.query(
        `SELECT sync_hash FROM fin_customer_invoices WHERE dolibarr_id = ?`, [dolibarrId]
      );

      if (existing.length > 0) {
        if (existing[0].sync_hash === newHash) { cUnchanged++; continue; }
        await connection.query(
          `UPDATE fin_customer_invoices SET ref=?, ref_client=?, socid=?, type=?, status=?, is_paid=?,
           total_ht=?, total_tva=?, total_ttc=?, date_invoice=?, date_due=?, date_creation=?,
           dolibarr_raw=?, last_synced_at=NOW(), sync_hash=?, is_active=1
           WHERE dolibarr_id=?`,
          [inv.ref, inv.ref_client, pi(inv.socid), pi(inv.type),
           pi(inv.statut || inv.status), inv.paye === '1' ? 1 : 0,
           pf(inv.total_ht), pf(inv.total_tva), pf(inv.total_ttc),
           invoiceDate, dueDate, creationDate, rawJson, newHash, dolibarrId]
        );
        cUpdated++;
      } else {
        await connection.query(
          `INSERT INTO fin_customer_invoices (dolibarr_id, ref, ref_client, socid, type, status, is_paid,
           total_ht, total_tva, total_ttc, date_invoice, date_due, date_creation, dolibarr_raw,
           first_synced_at, last_synced_at, sync_hash, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, 1)`,
          [dolibarrId, inv.ref, inv.ref_client, pi(inv.socid), pi(inv.type),
           pi(inv.statut || inv.status), inv.paye === '1' ? 1 : 0,
           pf(inv.total_ht), pf(inv.total_tva), pf(inv.total_ttc),
           invoiceDate, dueDate, creationDate, rawJson, newHash]
        );
        cCreated++;
      }

      // Sync invoice lines
      await connection.query(`DELETE FROM fin_customer_invoice_lines WHERE invoice_dolibarr_id = ?`, [dolibarrId]);
      if (inv.lines && Array.isArray(inv.lines)) {
        for (const line of inv.lines) {
          await connection.query(
            `INSERT INTO fin_customer_invoice_lines (invoice_dolibarr_id, line_id, fk_product, product_ref,
             product_label, qty, unit_price_ht, vat_rate, total_ht, total_tva, total_ttc, accounting_code)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [dolibarrId, pi(line.rowid), pi(line.fk_product),
             line.product_ref || null, line.product_label || line.label || null,
             pf(line.qty), pf(line.subprice), pf(line.tva_tx),
             pf(line.total_ht), pf(line.total_tva), pf(line.total_ttc),
             line.fk_accounting_account ? String(line.fk_accounting_account) : null]
          );
        }
      }

      if ((cCreated + cUpdated + cUnchanged) % 200 === 0) {
        console.log(`  Customer invoices: ${cCreated} created, ${cUpdated} updated, ${cUnchanged} unchanged`);
      }
    }
    console.log(`Customer invoices DONE: ${cCreated} created, ${cUpdated} updated, ${cUnchanged} unchanged (total: ${custInvoices.length})`);

    await connection.query(
      `INSERT INTO fin_sync_log (entity_type, status, records_created, records_updated, records_unchanged, records_total, duration_ms, triggered_by)
       VALUES ('customer_invoices', 'success', ?, ?, ?, ?, ?, 'script-resync')`,
      [cCreated, cUpdated, cUnchanged, custInvoices.length, Date.now() - custStart]
    );

    // ============ VERIFY ============
    console.log('\n=== Verification ===');
    const [suppCount] = await connection.query(`SELECT COUNT(*) as cnt FROM fin_supplier_invoices WHERE is_active = 1`);
    const [custCount] = await connection.query(`SELECT COUNT(*) as cnt FROM fin_customer_invoices WHERE is_active = 1`);
    console.log(`Supplier invoices in DB: ${suppCount[0].cnt}`);
    console.log(`Customer invoices in DB: ${custCount[0].cnt}`);

    const [suppByYear] = await connection.query(`
      SELECT YEAR(date_invoice) as yr, COUNT(*) as cnt, SUM(total_ttc) as total
      FROM fin_supplier_invoices WHERE is_active = 1
      GROUP BY YEAR(date_invoice) ORDER BY yr DESC
    `);
    console.log('\nSupplier invoices by year:');
    suppByYear.forEach(r => console.log(`  ${r.yr}: ${r.cnt} invoices, total_ttc=${parseFloat(r.total).toFixed(2)}`));

    const [custByYear] = await connection.query(`
      SELECT YEAR(date_invoice) as yr, COUNT(*) as cnt, SUM(total_ttc) as total
      FROM fin_customer_invoices WHERE is_active = 1
      GROUP BY YEAR(date_invoice) ORDER BY yr DESC
    `);
    console.log('\nCustomer invoices by year:');
    custByYear.forEach(r => console.log(`  ${r.yr}: ${r.cnt} invoices, total_ttc=${parseFloat(r.total).toFixed(2)}`));

    const totalDuration = Date.now() - startTime;
    console.log(`\nTotal sync time: ${(totalDuration / 1000).toFixed(1)}s`);

  } finally {
    await connection.end();
  }
}

main().catch(console.error);
