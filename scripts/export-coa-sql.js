const mysql = require('mysql2/promise');
const fs = require('fs');

async function main() {
  const c = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'Refe@2808', database: 'mrp'
  });

  const [rows] = await c.query(
    'SELECT account_code, account_name, account_name_ar, account_type, account_category, parent_code, display_order FROM fin_chart_of_accounts ORDER BY display_order, account_code'
  );

  let sql = '';
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const vals = batch.map(r => {
      const esc = (v) => v === null || v === undefined ? 'NULL' : c.escape(v);
      return `(${esc(r.account_code)}, ${esc(r.account_name)}, ${esc(r.account_name_ar)}, ${esc(r.account_type)}, ${esc(r.account_category)}, ${esc(r.parent_code)}, ${r.display_order})`;
    }).join(',\n  ');
    sql += `INSERT IGNORE INTO fin_chart_of_accounts (account_code, account_name, account_name_ar, account_type, account_category, parent_code, display_order) VALUES\n  ${vals};\n\n`;
  }

  fs.writeFileSync('prisma/migrations/coa_seed_data.sql', sql);
  console.log('Written', rows.length, 'rows to prisma/migrations/coa_seed_data.sql');
  await c.end();
}

main().catch(console.error);
