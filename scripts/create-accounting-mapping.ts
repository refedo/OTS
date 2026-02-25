import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Create the mapping table for Dolibarr accounting account rowids -> OTS cost categories
  console.log('=== CREATING fin_dolibarr_account_mapping TABLE ===');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS fin_dolibarr_account_mapping (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dolibarr_account_id VARCHAR(20) NOT NULL COMMENT 'Dolibarr fk_accounting_account rowid (e.g. 107317231)',
      dolibarr_account_code VARCHAR(20) NULL COMMENT 'Dolibarr account code if known',
      dolibarr_account_label VARCHAR(255) NULL COMMENT 'Dolibarr account label if known',
      ots_cost_category VARCHAR(100) NOT NULL COMMENT 'OTS cost category for reporting',
      ots_coa_code VARCHAR(20) NULL COMMENT 'Maps to fin_chart_of_accounts.account_code',
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_dolibarr_acct (dolibarr_account_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('Table created.');

  // 2. Get all distinct accounting_code values with sample product info
  console.log('\n=== POPULATING MAPPING FROM EXISTING DATA ===');
  const codes: any[] = await prisma.$queryRawUnsafe(`
    SELECT 
      sil.accounting_code,
      COUNT(*) as line_count,
      ROUND(SUM(sil.total_ht), 2) as total_ht,
      GROUP_CONCAT(DISTINCT SUBSTRING(sil.product_label, 1, 60) ORDER BY sil.total_ht DESC SEPARATOR ' | ') as sample_products
    FROM fin_supplier_invoice_lines sil
    JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
    WHERE si.is_active = 1 
      AND sil.accounting_code IS NOT NULL 
      AND sil.accounting_code != '' 
      AND sil.accounting_code != '0'
    GROUP BY sil.accounting_code
    ORDER BY total_ht DESC
  `);
  
  console.log(`Found ${codes.length} distinct accounting codes`);

  // 3. Auto-classify based on sample products
  for (const code of codes) {
    const samples = (code.sample_products || '').toLowerCase();
    let category = 'Other / Unclassified';
    
    // Determine category from product samples
    if (samples.includes('steel') || samples.includes('beam') || samples.includes('plate') || 
        samples.includes('angle') || samples.includes('channel') || samples.includes('pipe') ||
        samples.includes('coil') || samples.includes('flat bar') || samples.includes('section') ||
        samples.includes('grating') || samples.includes('deck panel') || samples.includes('sandwich panel') ||
        samples.includes('purlin') || samples.includes('حديد')) {
      category = 'Raw Materials';
    } else if (samples.includes('bolt') || samples.includes('nut') || samples.includes('washer') ||
               samples.includes('anchor') || samples.includes('fastener') || samples.includes('stud') ||
               samples.includes('rivet')) {
      category = 'Raw Materials';
    } else if (samples.includes('paint') || samples.includes('primer') || samples.includes('coat') ||
               samples.includes('galvan') || samples.includes('intumescent') || samples.includes('epoxy') ||
               samples.includes('sandblast') || samples.includes('abrasive')) {
      category = 'Raw Materials';
    } else if (samples.includes('weld') || samples.includes('electrode') || samples.includes('wire') ||
               samples.includes('flux') || samples.includes('لحام')) {
      category = 'Raw Materials';
    } else if (samples.includes('production require') || samples.includes('مستلزمات')) {
      category = 'Production Supplies';
    } else if (samples.includes('transport') || samples.includes('shipping') || samples.includes('freight') ||
               samples.includes('delivery') || samples.includes('نقل') || samples.includes('شحن') ||
               samples.includes('trailer') || samples.includes('truck')) {
      category = 'Transportation';
    } else if (samples.includes('sub') && samples.includes('contract') || samples.includes('مقاول') ||
               samples.includes('erect') || samples.includes('install') || samples.includes('تركيب')) {
      category = 'Subcontractors';
    } else if (samples.includes('machine') || samples.includes('equip') || samples.includes('crane') ||
               samples.includes('forklift') || samples.includes('cnc') || samples.includes('laser') ||
               samples.includes('آلات') || samples.includes('معد')) {
      category = 'Equipment & Machinery';
    } else if (samples.includes('rent') || samples.includes('إيجار') || samples.includes('accommodation') ||
               samples.includes('camp') || samples.includes('سكن')) {
      category = 'Rent & Facilities';
    } else if (samples.includes('labor') || samples.includes('wage') || samples.includes('manpower') ||
               samples.includes('عمال') || samples.includes('worker')) {
      category = 'Labor';
    } else if (samples.includes('insurance') || samples.includes('تأمين')) {
      category = 'Insurance';
    } else if (samples.includes('license') || samples.includes('permit') || samples.includes('ترخيص') ||
               samples.includes('tax') || samples.includes('ضريب') || samples.includes('vat') ||
               samples.includes('guarantee') || samples.includes('ضمان')) {
      category = 'Admin & Government';
    }

    // Insert mapping
    await prisma.$executeRawUnsafe(`
      INSERT INTO fin_dolibarr_account_mapping (dolibarr_account_id, ots_cost_category, notes)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE ots_cost_category = VALUES(ots_cost_category), notes = VALUES(notes)
    `, code.accounting_code, category, `Auto-classified. Lines: ${code.line_count}, Total: SAR ${code.total_ht}. Samples: ${(code.sample_products || '').substring(0, 200)}`);
  }
  
  console.log(`Inserted ${codes.length} mappings`);

  // 4. Show the mapping summary
  console.log('\n=== MAPPING SUMMARY ===');
  const summary: any[] = await prisma.$queryRawUnsafe(`
    SELECT ots_cost_category, COUNT(*) as account_count
    FROM fin_dolibarr_account_mapping
    GROUP BY ots_cost_category
    ORDER BY account_count DESC
  `);
  console.table(summary);

  // 5. Verify cost distribution with the new mapping
  console.log('\n=== COST DISTRIBUTION WITH NEW MAPPING ===');
  const costDist: any[] = await prisma.$queryRawUnsafe(`
    SELECT 
      COALESCE(dam.ots_cost_category, 'Unmapped') as category,
      COUNT(*) as line_count,
      ROUND(SUM(sil.total_ht), 2) as total_ht,
      ROUND(SUM(sil.total_ht) / (SELECT SUM(s2.total_ht) FROM fin_supplier_invoice_lines s2 
        JOIN fin_supplier_invoices si2 ON si2.dolibarr_id = s2.invoice_dolibarr_id WHERE si2.is_active = 1) * 100, 1) as pct
    FROM fin_supplier_invoice_lines sil
    JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
    LEFT JOIN fin_dolibarr_account_mapping dam ON dam.dolibarr_account_id = sil.accounting_code
    WHERE si.is_active = 1
    GROUP BY category
    ORDER BY total_ht DESC
  `);
  console.table(costDist);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
