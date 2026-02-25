import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Find project PJ2411-0257
  console.log('=== PROJECT PJ2411-0257 ===');
  const proj: any[] = await prisma.$queryRawUnsafe(`
    SELECT dolibarr_id, ref, title, fk_soc FROM dolibarr_projects WHERE ref = 'PJ2411-0257'
  `);
  console.log('Project:', proj[0] || 'NOT FOUND');
  
  if (proj.length === 0) {
    // Try fuzzy
    const fuzzy: any[] = await prisma.$queryRawUnsafe(`
      SELECT dolibarr_id, ref, title, fk_soc FROM dolibarr_projects WHERE ref LIKE '%0257%' OR ref LIKE '%257%'
    `);
    console.log('Fuzzy matches:', fuzzy);
  }

  const projectDolibarrId = proj[0]?.dolibarr_id;
  if (!projectDolibarrId) {
    console.log('Cannot continue without project ID');
    await prisma.$disconnect();
    return;
  }

  // 2. Check supplier invoices linked via fk_projet
  console.log('\n=== SUPPLIER INVOICES WITH fk_projet = project_id ===');
  const linked: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as cnt, SUM(total_ht) as total_ht, SUM(total_ttc) as total_ttc
    FROM fin_supplier_invoices WHERE fk_projet = ? AND is_active = 1
  `, projectDolibarrId);
  console.log('Linked by fk_projet:', linked[0]);

  // 3. Check what fk_projet values exist for supplier invoices that reference this project
  // The Dolibarr screenshot shows ref like "HU-SUPINV-2512-8855" etc
  console.log('\n=== SAMPLE SUPPLIER INVOICES (first 10 with ref like HU-SUPINV) ===');
  const samples: any[] = await prisma.$queryRawUnsafe(`
    SELECT dolibarr_id, ref, fk_projet, total_ht, total_ttc, status, socid
    FROM fin_supplier_invoices 
    WHERE ref LIKE 'HU-SUPINV%'
    ORDER BY dolibarr_id DESC
    LIMIT 10
  `);
  console.table(samples);

  // 4. Check if Dolibarr stores project ID differently
  // Maybe fk_projet in Dolibarr is the project dolibarr_id but OTS stores it differently
  console.log('\n=== DISTINCT fk_projet values (non-null, top 20) ===');
  const fkValues: any[] = await prisma.$queryRawUnsafe(`
    SELECT fk_projet, COUNT(*) as cnt 
    FROM fin_supplier_invoices 
    WHERE fk_projet IS NOT NULL AND fk_projet > 0
    GROUP BY fk_projet
    ORDER BY cnt DESC
    LIMIT 20
  `);
  console.table(fkValues);

  // 5. Check if the Dolibarr project id 257 is different from dolibarr_id
  // In Dolibarr, the project might be ID 257 but in our DB, the dolibarr_id might be different
  console.log('\n=== CHECK: Is there any project with dolibarr_id = 257? ===');
  const proj257: any[] = await prisma.$queryRawUnsafe(`
    SELECT dolibarr_id, ref, title FROM dolibarr_projects WHERE dolibarr_id = 257
  `);
  console.log('Project with dolibarr_id=257:', proj257[0] || 'NONE');

  // 6. Check supplier invoices linked to project 257 (raw Dolibarr ID)
  console.log('\n=== SUPPLIER INVOICES WITH fk_projet = 257 ===');
  const linked257: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as cnt, SUM(total_ht) as total_ht
    FROM fin_supplier_invoices WHERE fk_projet = 257 AND is_active = 1
  `);
  console.log('Linked to fk_projet=257:', linked257[0]);

  // 7. Look at the Dolibarr URL pattern - "257" in the search box
  // Let's check if any supplier invoice has fk_projet matching ANY value close to project ref
  console.log('\n=== ALL fk_projet values that map to dolibarr_projects ===');
  const mapped: any[] = await prisma.$queryRawUnsafe(`
    SELECT dp.ref, dp.dolibarr_id, COUNT(si.id) as inv_count, SUM(si.total_ht) as total_ht
    FROM fin_supplier_invoices si
    JOIN dolibarr_projects dp ON dp.dolibarr_id = si.fk_projet
    WHERE si.is_active = 1 AND si.fk_projet IS NOT NULL
    GROUP BY dp.ref, dp.dolibarr_id
    ORDER BY inv_count DESC
    LIMIT 20
  `);
  console.table(mapped);

  // 8. Check total supplier invoices and how many have NULL fk_projet
  console.log('\n=== OVERALL SUPPLIER INVOICE fk_projet STATS ===');
  const stats: any[] = await prisma.$queryRawUnsafe(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN fk_projet IS NULL OR fk_projet = 0 THEN 1 ELSE 0 END) as null_fk_projet,
      SUM(CASE WHEN fk_projet IS NOT NULL AND fk_projet > 0 THEN 1 ELSE 0 END) as has_fk_projet
    FROM fin_supplier_invoices WHERE is_active = 1
  `);
  console.log('Stats:', stats[0]);

  // 9. Check what the Dolibarr API actually returns for a supplier invoice
  // Let's look at a specific invoice from the screenshot: HU-SUPINV-2602-8855
  console.log('\n=== SPECIFIC INVOICE: HU-SUPINV-2602-8855 ===');
  const specific: any[] = await prisma.$queryRawUnsafe(`
    SELECT * FROM fin_supplier_invoices WHERE ref = 'HU-SUPINV-2602-8855'
  `);
  if (specific.length > 0) {
    console.log('Found:', JSON.stringify(specific[0], null, 2));
  } else {
    console.log('NOT FOUND - checking similar refs...');
    const similar: any[] = await prisma.$queryRawUnsafe(`
      SELECT dolibarr_id, ref, fk_projet, total_ht FROM fin_supplier_invoices 
      WHERE ref LIKE '%2602-8855%' OR ref LIKE '%8855%'
      LIMIT 5
    `);
    console.table(similar);
  }

  // 10. Check raw data hash to see if fk_project was in the original sync
  console.log('\n=== CHECK data_hash for recent supplier invoices ===');
  const hashes: any[] = await prisma.$queryRawUnsafe(`
    SELECT dolibarr_id, ref, fk_projet, data_hash
    FROM fin_supplier_invoices 
    WHERE ref LIKE 'HU-SUPINV-26%'
    ORDER BY dolibarr_id DESC
    LIMIT 5
  `);
  console.table(hashes);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
