// Check what Dolibarr API returns for supplier invoices vs what's in our DB

const mysql = require('mysql2/promise');

async function check() {
  // 1. Check Dolibarr API directly
  const DOLIBARR_API_URL = 'https://www.hexametals.com/erp/api/index.php';
  const DOLIBARR_API_KEY = 'pKY1pUzQO6gXP1882nvS1M75d2lrRvxN';

  console.log('=== Checking Dolibarr API ===');
  
  // Fetch first page of supplier invoices sorted by newest first
  try {
    const url = `${DOLIBARR_API_URL}/supplierinvoices?limit=10&page=0&sortfield=t.rowid&sortorder=DESC&sqlfilters=(t.fk_statut:>:'0')`;
    const res = await fetch(url, {
      headers: { 'DOLAPIKEY': DOLIBARR_API_KEY, 'Accept': 'application/json' }
    });
    
    if (!res.ok) {
      console.log('API Error:', res.status, await res.text());
      return;
    }
    
    const invoices = await res.json();
    console.log(`\nLatest 10 supplier invoices from API:`);
    for (const inv of invoices) {
      const dateVal = inv.date_validation || inv.date || inv.date_creation;
      let dateStr = 'N/A';
      if (dateVal) {
        // Dolibarr returns timestamps as seconds
        const ts = parseInt(dateVal);
        if (!isNaN(ts) && ts > 0) {
          dateStr = new Date(ts * 1000).toISOString().split('T')[0];
        } else {
          dateStr = dateVal;
        }
      }
      console.log(`  id=${inv.id} ref=${inv.ref} date=${dateStr} total_ttc=${inv.total_ttc} status=${inv.statut || inv.status}`);
    }
  } catch (e) {
    console.error('API fetch error:', e.message);
  }

  // Count total from API
  try {
    let total = 0;
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const url = `${DOLIBARR_API_URL}/supplierinvoices?limit=100&page=${page}&sortfield=t.rowid&sortorder=ASC&sqlfilters=(t.fk_statut:>:'0')`;
      const res = await fetch(url, {
        headers: { 'DOLAPIKEY': DOLIBARR_API_KEY, 'Accept': 'application/json' }
      });
      if (!res.ok) break;
      const batch = await res.json();
      total += batch.length;
      hasMore = batch.length >= 100;
      page++;
      if (page % 10 === 0) console.log(`  Fetched ${total} so far (page ${page})...`);
    }
    console.log(`\nTotal supplier invoices from Dolibarr API: ${total}`);
  } catch (e) {
    console.error('Count error:', e.message);
  }

  // 2. Check our database
  const connection = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'Refe@2808', database: 'mrp'
  });

  try {
    console.log('\n=== Checking Local Database ===');
    
    const [totalDb] = await connection.query(`SELECT COUNT(*) as cnt FROM fin_supplier_invoices`);
    console.log(`Total supplier invoices in DB: ${totalDb[0].cnt}`);
    
    const [activeDb] = await connection.query(`SELECT COUNT(*) as cnt FROM fin_supplier_invoices WHERE is_active = 1`);
    console.log(`Active supplier invoices in DB: ${activeDb[0].cnt}`);
    
    const [byYear] = await connection.query(`
      SELECT YEAR(date_invoice) as yr, COUNT(*) as cnt, SUM(total_ttc) as total
      FROM fin_supplier_invoices WHERE is_active = 1
      GROUP BY YEAR(date_invoice) ORDER BY yr DESC
    `);
    console.log('\nSupplier invoices by year (DB):');
    byYear.forEach(r => console.log(`  ${r.yr}: ${r.cnt} invoices, total_ttc=${parseFloat(r.total).toFixed(2)}`));

    // Check latest 10 in DB
    const [latest] = await connection.query(`
      SELECT dolibarr_id, ref, date_invoice, total_ttc, status 
      FROM fin_supplier_invoices 
      ORDER BY dolibarr_id DESC LIMIT 10
    `);
    console.log('\nLatest 10 supplier invoices in DB:');
    latest.forEach(r => console.log(`  dol_id=${r.dolibarr_id} ref=${r.ref} date=${r.date_invoice?.toISOString?.()?.split('T')[0] || r.date_invoice} ttc=${r.total_ttc} status=${r.status}`));

    // Check for 2025/2026 invoices
    const [recent] = await connection.query(`
      SELECT COUNT(*) as cnt FROM fin_supplier_invoices 
      WHERE date_invoice >= '2025-01-01'
    `);
    console.log(`\nSupplier invoices with date >= 2025-01-01: ${recent[0].cnt}`);

  } finally {
    await connection.end();
  }
}

check().catch(console.error);
