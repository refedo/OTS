const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function seedFinancialData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Refe@2808',
    database: 'mrp',
    multipleStatements: true
  });

  try {
    console.log('=== Seeding Financial Module Data ===\n');

    // 1. Clear existing chart of accounts and seed new data
    console.log('1. Seeding Chart of Accounts...');
    await connection.query('DELETE FROM fin_chart_of_accounts');
    
    const coaSqlPath = path.join('C:', 'Users', 'Walid', 'Desktop', '002_chart_of_accounts_seed.sql');
    const coaSql = fs.readFileSync(coaSqlPath, 'utf8');
    await connection.query(coaSql);
    
    const [coaCount] = await connection.query('SELECT COUNT(*) as count FROM fin_chart_of_accounts');
    console.log(`   ✓ Inserted ${coaCount[0].count} accounts\n`);

    // 2. Pre-populate fin_config with default account mappings
    console.log('2. Seeding Default Account Mappings...');
    
    const configValues = [
      ['default_ar_account', '12003001', 'Receivables - Local Customers'],
      ['default_ap_account', '210401', 'Accounts Payable - Local Suppliers Materials'],
      ['default_revenue_account', '53001', 'Products Sales Revenue'],
      ['default_expense_account', '420100', 'Cost of Goods Sold COGS'],
      ['vat_output_15_account', '210201', 'VAT Sales 15%'],
      ['vat_output_5_account', '210202', 'VAT Sales 5%'],
      ['vat_input_15_account', '128001', 'VAT Purchases 15%'],
      ['vat_input_5_account', '128002', 'VAT Purchases 5%'],
      ['vat_settlement_account', '2109', 'VAT Settlement'],
    ];

    for (const [key, value, description] of configValues) {
      await connection.query(`
        INSERT INTO fin_config (config_key, config_value, description, updated_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), description = VALUES(description), updated_at = NOW()
      `, [key, value, description]);
      console.log(`   ✓ ${key} = ${value}`);
    }

    console.log('\n3. Verifying data...');
    
    // Verify chart of accounts by type
    const [typeStats] = await connection.query(`
      SELECT account_type, COUNT(*) as count 
      FROM fin_chart_of_accounts 
      GROUP BY account_type 
      ORDER BY account_type
    `);
    console.log('   Chart of Accounts by type:');
    typeStats.forEach(t => console.log(`     - ${t.account_type}: ${t.count} accounts`));

    // Verify config
    const [configs] = await connection.query('SELECT config_key, config_value FROM fin_config ORDER BY config_key');
    console.log('\n   Config values:');
    configs.forEach(c => console.log(`     - ${c.config_key}: ${c.config_value}`));

    console.log('\n=== Seeding Complete ===');

  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedFinancialData();
