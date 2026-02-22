const mysql = require('mysql2/promise');

async function checkYears() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Refe@2808',
    database: 'mrp'
  });

  try {
    const [r] = await connection.query(`
      SELECT YEAR(entry_date) as yr, COUNT(*) as cnt, SUM(debit) as total_debit 
      FROM fin_journal_entries 
      GROUP BY YEAR(entry_date) 
      ORDER BY yr DESC
    `);
    console.log('Journal entries by year:');
    r.forEach(row => console.log(`  ${row.yr}: ${row.cnt} entries, ${row.total_debit} SAR debit`));
  } finally {
    await connection.end();
  }
}

checkYears();
